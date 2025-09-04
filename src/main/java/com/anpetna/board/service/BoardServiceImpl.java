package com.anpetna.board.service;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.ImageOrderReq;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardRes;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.dto.ImageDTO;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BoardServiceImpl implements BoardService {

    private final BoardJpaRepository boardJpaRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.upload.url-base}")
    private String uploadUrlBase;

    private static final int MAX_FILES_PER_POST = 50;

    @PostConstruct
    void validateUploadProps() {
        if (uploadDir == null || uploadDir.isBlank()) {
            throw new IllegalStateException("app.upload.dir 미설정");
        }
        if (uploadUrlBase == null || uploadUrlBase.isBlank()) {
            throw new IllegalStateException("app.upload.url-base 미설정");
        }
        log.info("[upload] dir={}, urlBase={}", uploadDir, uploadUrlBase);
    }

    /* ======================= 파일 저장 유틸 ======================= */
    private void saveImages(BoardEntity board, List<MultipartFile> files, int appendFrom) {
        if (files == null || files.isEmpty()) return;

        int sort = appendFrom;
        Path base = null;

        try {
            base = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(base)) Files.createDirectories(base);

            String baseUrl = uploadUrlBase.endsWith("/") ? uploadUrlBase : uploadUrlBase + "/";

            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) continue;

                String original = file.getOriginalFilename();                // ★ 원본 파일명
                String contentType = file.getContentType();                  // ★ MIME
                String ext = org.springframework.util.StringUtils
                        .getFilenameExtension(original);                     // ★ 확장자

                String uuid = java.util.UUID.randomUUID().toString();
                String savedName = (ext == null || ext.isBlank()) ? uuid : (uuid + "." + ext);

                Path target = base.resolve(savedName).normalize();
                file.transferTo(target.toFile());

                String url = baseUrl + savedName;

                // 엔티티 생성
                ImageEntity img = ImageEntity.forBoard(savedName, url, board, sort++);

                // ★ 누락 필드 채우기 (NOT NULL 컬럼 대응)
                img.setOriginalName((original == null || original.isBlank()) ? savedName : original);
                img.setContentType(contentType);
                img.setExt(ext);
            }
            boardJpaRepository.save(board);

        } catch (Exception e) {
            System.err.println("[upload] 실패 base=" + base + ", err=" + e);
            throw new RuntimeException("이미지 저장 중 오류가 발생했습니다.", e);
        }
    }


    /* ============================ 생성 ============================ */
    @Override
    @Transactional
    public CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> files, String memberId) {
        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        BoardEntity board = BoardEntity.builder()
                .bWriter(memberId)
                .bTitle(req.getBTitle())
                .bContent(req.getBContent())
                .boardType(req.getBoardType())
                .noticeFlag(Boolean.TRUE.equals(req.getNoticeFlag()))
                .isSecret(Boolean.TRUE.equals(req.getIsSecret()))
                .bViewCount(req.getBViewCount() == null ? 0 : req.getBViewCount())
                .bLikeCount(req.getBLikeCount() == null ? 0 : req.getBLikeCount())
                .faqCategory(req.getFaqCategory())
                .build();

        BoardEntity saved = boardJpaRepository.save(board);

        // JSON 이미지(있다면) → 업로드 파일이 없을 때만 처리
        if ((files == null || files.isEmpty())) {
            List<ImageDTO> imageDTOS = Optional.ofNullable(req.getImages()).orElse(Collections.emptyList());
            if (!imageDTOS.isEmpty()) {
                int idx = 0;
                for (ImageDTO dto : imageDTOS) {
                    Integer order = (dto.getSortOrder() != null) ? dto.getSortOrder() : idx++;
                    ImageEntity img = ImageEntity.forBoard(dto.getFileName(), dto.getUrl(), saved, order);

                    // ★ 누락될 수 있는 필드 보정
                    img.setOriginalName((dto.getOriginalName() == null || dto.getOriginalName().isBlank())
                            ? dto.getFileName()
                            : dto.getOriginalName());
                    img.setContentType(dto.getContentType());
                    img.setExt(dto.getExt());
                }
                boardJpaRepository.save(saved);
            }
        }

        // 업로드 파일(있다면)
        if (files != null && !files.isEmpty()) {
            int appendFrom = (saved.getImages() == null) ? 0 : saved.getImages().size();
            saveImages(saved, files, appendFrom);
        }

        // 응답
        List<ImageDTO> imagesRes = Optional.ofNullable(saved.getImages()).orElse(List.of())
                .stream()
                .sorted(Comparator.comparing(img -> Optional.ofNullable(img.getSortOrder()).orElse(0)))
                .map(img -> ImageDTO.builder()
                        .fileName(img.getFileName())
                        .url(img.getUrl())
                        .sortOrder(img.getSortOrder())
                        .build())
                .toList();

        return CreateBoardRes.builder()
                .bno(saved.getBno())
                .bTitle(saved.getBTitle())
                .bWriter(saved.getBWriter())
                .bContent(saved.getBContent())
                .bLikeCount(saved.getBLikeCount())
                .images(imagesRes)
                .createDate(saved.getCreateDate())
                .latestDate(saved.getLatestDate())
                .build();
    }

    @Override
    @Transactional
    public CreateBoardRes create(CreateBoardReq req, List<MultipartFile> files, String memberId) {
        return createBoard(req, files, memberId);
    }

    /* =================== 목록(검색/타입/카테고리) =================== */
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<BoardDTO> readAllBoard(PageRequestDTO pr) {
        String boardType = pr.getBoardType();
        String keyword = pr.getKeyword();
        String[] types = pr.getTypes();

        boolean hasSearch = (keyword != null && !keyword.isBlank())
                || (types != null && types.length > 0);

        Pageable pageable = PageRequest.of(Math.max(pr.getPage() - 1, 0), Math.max(pr.getSize(), 1));

        Page<BoardEntity> page;
        if (hasSearch) {
            page = boardJpaRepository.search(pageable, types, keyword);
        } else {
            page = boardJpaRepository.findByBoardTypeSafe(boardType, pageable);
        }

        List<BoardDTO> list = page.map(BoardDTO::new).getContent();

        return PageResponseDTO.<BoardDTO>withAll()
                .pageRequestDTO(pr)
                .dtoList(list)
                .total((int) page.getTotalElements())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<BoardDTO> readAll(BoardType type, String category, PageRequestDTO pr) {
        Pageable pageable = PageRequest.of(Math.max(pr.getPage() - 1, 0), Math.max(pr.getSize(), 1));

        Page<BoardEntity> page;
        if (type == BoardType.FAQ && category != null && !category.isBlank()) {
            page = boardJpaRepository.findByBoardTypeAndFaqCategory(type, category, pageable);
        } else {
            page = boardJpaRepository.findByBoardTypeSafe(type == null ? null : type.name(), pageable);
        }

        List<BoardDTO> list = page.map(BoardDTO::new).getContent();

        return PageResponseDTO.<BoardDTO>withAll()
                .pageRequestDTO(pr)
                .dtoList(list)
                .total((int) page.getTotalElements())
                .build();
    }

    /* ============================ 상세 ============================ */
    @Override
    @Transactional
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq req) {
        // B안: 컨트롤러에서 isAuthenticated 체크 후 들어온다고 가정 (서비스는 순수 조회)
        BoardEntity e = boardJpaRepository.findById(req.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));

        e.setBViewCount((e.getBViewCount() == null ? 0 : e.getBViewCount()) + 1);

        e.getImages().size(); // lazy init
        e.getImages().sort(Comparator.comparing(
                img -> Optional.ofNullable(img.getSortOrder()).orElse(0)
        ));

        List<ImageDTO> images = e.getImages().stream().map(ImageDTO::new).collect(Collectors.toList());

        return ReadOneBoardRes.builder()
                .bno(e.getBno())
                .bTitle(e.getBTitle())
                .bWriter(e.getBWriter())
                .bContent(e.getBContent())
                .bLikeCount(e.getBLikeCount())
                .images(images)
                .createDate(e.getCreateDate())
                .latestDate(e.getLatestDate())
                .build();
    }
    /* ============================ 서버 파일 삭제 ============================ */
// 참고: MemberServiceImpl에 있는 동일 유틸을 그대로 복사
    private void deletePhysicalIfLocal(String url) {
        try {
            if (url == null) return;
            String fileName = url.substring(url.lastIndexOf('/') + 1);
            java.nio.file.Path path = java.nio.file.Paths.get(uploadDir).resolve(fileName);
            if (java.nio.file.Files.exists(path)) java.nio.file.Files.delete(path);
        } catch (Exception ignore) { }
    }

    /* ============================ 수정 ============================ */
    @Override
    @Transactional
    public UpdateBoardRes updateBoard(UpdateBoardReq req,
                                      List<MultipartFile> addFiles,
                                      List<UUID> deleteUuids,
                                      List<ImageOrderReq> orders,
                                      String memberId) {

        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        BoardEntity e = boardJpaRepository.findById(req.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));

        if (!memberId.equals(e.getBWriter())) {
            throw new AccessDeniedException("본인 글만 수정할 수 있습니다.");
        }

        if (req.getBTitle() != null) e.setBTitle(req.getBTitle());
        if (req.getBContent() != null) e.setBContent(req.getBContent());
        if (req.getNoticeFlag() != null) e.setNoticeFlag(req.getNoticeFlag());
        if (req.getIsSecret() != null) e.setIsSecret(req.getIsSecret());

        if (deleteUuids != null && !deleteUuids.isEmpty()) {
            List<ImageEntity> toRemove = e.getImages().stream()
                    .filter(img -> deleteUuids.contains(img.getUuid()))
                    .toList();
            // 서버 파일도 함께 삭제 ( 위에 있는 메서드 참조)
            toRemove.forEach(img -> {
                deletePhysicalIfLocal(img.getUrl());
                e.removeImage(img); // orphanRemoval=true
            });
        }

        if (orders != null && !orders.isEmpty()) {
            Map<UUID, Integer> orderMap = orders.stream()
                    .collect(Collectors.toMap(ImageOrderReq::getUuid, ImageOrderReq::getSortOrder, (a,b)->b));
            e.getImages().forEach(img -> {
                Integer so = orderMap.get(img.getUuid());
                if (so != null) img.setSortOrder(so);
            });
        }

        if (addFiles != null && !addFiles.isEmpty()) {
            int current = e.getImages().size();
            if (current + addFiles.size() > MAX_FILES_PER_POST) {
                throw new IllegalArgumentException("이미지는 최대 " + MAX_FILES_PER_POST + "개까지 업로드 가능합니다.");
            }
            saveImages(e, addFiles, current);
            // ★ 혹시라도 추가 이미지가 반영되지 않는 상황을 방지하는 안전망
            boardJpaRepository.save(e);
        }

        List<ImageDTO> imagesUpdate = Optional.ofNullable(e.getImages()).orElse(List.of())
                .stream()
                .sorted(Comparator.comparing(img -> Optional.ofNullable(img.getSortOrder()).orElse(0)))
                .map(img -> ImageDTO.builder()
                        .uuid(img.getUuid())
                        .fileName(img.getFileName())
                        .originalName(img.getOriginalName()) // 원본명
                        .url(img.getUrl())
                        .sortOrder(img.getSortOrder())
                        .build())
                .toList();

        return UpdateBoardRes.builder()
                .bno(e.getBno())
                .bTitle(e.getBTitle())
                .bContent(e.getBContent())
                .bLikeCount(e.getBLikeCount())
                .images(imagesUpdate)
                .createDate(e.getCreateDate())
                .latestDate(e.getLatestDate())
                .build();
    }

    /* ============================ 삭제 ============================ */
    @Override
    @Transactional
    public DeleteBoardRes deleteBoard(DeleteBoardReq req, String memberId) {
        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        BoardEntity e = boardJpaRepository.findById(req.getBno())
                .orElseThrow(() -> new RuntimeException("게시글 없음"));

        if (!memberId.equals(e.getBWriter())) {
            throw new AccessDeniedException("본인 글만 삭제할 수 있습니다.");
        }

        boardJpaRepository.delete(e);

        return DeleteBoardRes.builder()
                .bno(e.getBno())
                .deleted(true)
                .build();
    }

    /* ============================ 좋아요 ============================ */
    @Override
    @Transactional
    public UpdateBoardRes likeBoard(Long bno, String memberId) {
        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        BoardEntity e = boardJpaRepository.findById(bno)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글입니다."));

        int currentLike = (e.getBLikeCount() == null ? 0 : e.getBLikeCount());
        e.setBLikeCount(currentLike + 1);

        return UpdateBoardRes.builder()
                .bno(e.getBno())
                .bLikeCount(e.getBLikeCount())
                .build();
    }
}
