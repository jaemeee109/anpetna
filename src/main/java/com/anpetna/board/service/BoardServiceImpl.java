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
import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.dto.ImageDTO;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.image.repository.ImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 권한/인증
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

// 회원 존재 확인용
import com.anpetna.member.repository.MemberRepository;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardServiceImpl implements BoardService {

    // 의존성 주입
    private final BoardJpaRepository boardJpaRepository;

    // 멤버 확인용
    private final MemberRepository memberRepository;

    // 이미지 확인용
    private final ImageRepository imageRepository;

    @Value("${app.upload.dir}")       // 실제 파일 저장 경로 (예: C:/uploads or /var/www/uploads)
    private String uploadDir;

    @Value("${app.upload.url-base}")  // 접근 URL 베이스 (예: /files or https://cdn.example.com/files)
    private String uploadUrlBase;

    private static final int MAX_FILES_PER_POST = 50; // 필요 시 조정

    // 업로드된 파일들을 저장하고 이미지 엔티티로 추가
    private void saveImages(BoardEntity board, List<MultipartFile> files, int appendFrom) {
        int sort = appendFrom;

        try {
            Path base = Paths.get(uploadDir);
            if (!Files.exists(base)) {
                Files.createDirectories(base);
            }

            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) continue;

                String original = file.getOriginalFilename();
                String ext = StringUtils.getFilenameExtension(original);
                String uuid = UUID.randomUUID().toString();
                String savedName = (ext == null || ext.isBlank()) ? uuid : (uuid + "." + ext);

                Path target = base.resolve(savedName);
                file.transferTo(target.toFile());

                // 노출용 URL (정적 서빙 경로와 매핑되어 있어야 함)
                String url = (uploadUrlBase.endsWith("/"))
                        ? uploadUrlBase + savedName
                        : uploadUrlBase + "/" + savedName;

                // 정렬 순서 부여하며 연관관계 연결
                ImageEntity.forBoard(savedName, url, board, sort++);
            }
        } catch (Exception e) {
            throw new RuntimeException("이미지 저장 중 오류가 발생했습니다.", e);
        }
    }

    // 로그인 + 회원여부 검증(필수 구간에서 사용)
    private String requireLoginAndMember() { //
        var ctx = SecurityContextHolder.getContext();
        var auth = (ctx != null) ? ctx.getAuthentication() : null;

        if (auth == null // 아예 인증 정보 없음.
                || !auth.isAuthenticated() // 인증되지 않음.
                || auth.getPrincipal() == null // 주체 정보 없음
                || "anonymousUser".equals(auth.getPrincipal())) { // 스프링 시큐리티의 익명 사용자 기본 principal 문자열.
            throw new AccessDeniedException("로그인이 필요합니다."); // 예외를 던짐
        }

        // 사용자 ID(유저명)를 뽑는 부분.
        String loginId;
        Object p = auth.getPrincipal();
        if (p instanceof String s) loginId = s;
        else if (p instanceof UserDetails ud) loginId = ud.getUsername();
        else loginId = auth.getName();

        if (!memberRepository.existsById(loginId)) {
            throw new AccessDeniedException("회원만 이용할 수 있습니다. 회원가입을 해주세요: " + loginId);
        }
        return loginId;
    }

    // 선택적 로그인 식별: 없거나 비회원이면 null (목록 전용처럼 허용 구간에서 사용)
    private String resolveLoginIdIfAny() {
        var ctx = SecurityContextHolder.getContext();
        var auth = (ctx != null) ? ctx.getAuthentication() : null;

        if (auth == null
                || !auth.isAuthenticated()
                || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null; // 예외를 던지지 않음 → 선택적 로그인 시나리오 처리에 적합.
        }

        String loginId;
        Object p = auth.getPrincipal();
        if (p instanceof String s) loginId = s;
        else if (p instanceof UserDetails ud) loginId = ud.getUsername();
        else loginId = auth.getName();

        return memberRepository.existsById(loginId) ? loginId : null;
    }


    //=================================================================================
    @Transactional
    @Override
    public CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> files) {
        // 1) 로그인 사용자 가져오기 (반드시 맨 앞에서)
        String memberId = requireLoginAndMember();

        // 2) 게시글 엔티티 생성 (view/like는 신뢰 금지 → 0 고정 권장)
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

        // 3) 선 저장(식별자 필요할 수 있으므로)
        BoardEntity saved = boardJpaRepository.save(board);

        // 4) (선택) JSON으로 넘어온 이미지(URL 기반) 붙이기
        List<ImageDTO> imageDTOS = Optional.ofNullable(req.getImages()).orElse(Collections.emptyList());
        if (!imageDTOS.isEmpty()) {
            int idx = 0; // create 시 시작 인덱스 0
            for (ImageDTO dto : imageDTOS) {
                Integer order = (dto.getSortOrder() != null) ? dto.getSortOrder() : idx++;
                // 편의 메서드가 양방향 세팅/컬렉션 add까지 해준다고 가정
                ImageEntity.forBoard(dto.getFileName(), dto.getUrl(), saved, order);
            }
        }

        // 5) (선택) 업로드된 파일들도 저장해서 이미지로 추가
        if (files != null && !files.isEmpty()) {
            int appendFrom = (saved.getImages() == null) ? 0 : saved.getImages().size();
            saveImages(saved, files, appendFrom); // 기존 구현 재사용
        }

        // 6) 응답 DTO(정렬 포함)
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

    // ★ 추가 ==========================================================================
    @Override
    @Transactional
    public CreateBoardRes create(CreateBoardReq req, List<MultipartFile> files) {
        return createBoard(req, files); // ✔ CreateBoardRes 그대로 리턴
    }

    //=================================================================================
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<BoardDTO> readAllBoard(PageRequestDTO pageRequestDTO) {
        //비회원 허용 (여기서는 강제 검증 안 함) 필요시 로깅·맞춤기능에만 사용
        resolveLoginIdIfAny();

        var pageable = pageRequestDTO.getPageable("createDate"); // 최신순 정렬
        var types = pageRequestDTO.getTypes();
        var keyword = pageRequestDTO.getKeyword();

        // 검색 메서드 사용
        var page = boardJpaRepository.search(pageable, types, keyword);

        // BoardEntity -> BoardDTO 변환
        List<BoardDTO> dtoList = page.stream()
                .map(BoardDTO::new)
                .toList();

        // PageResponseDTO 생성
        return PageResponseDTO.<BoardDTO>withAll()
                .pageRequestDTO(pageRequestDTO)
                .dtoList(dtoList)
                .total((int) page.getTotalElements())
                .build();
    }

    //=================================================================================
    @Override // boardType / category 필터 버전 (앞서 드린 그대로) 비회원도 전체 목록은 조회가능
    public PageResponseDTO<BoardDTO> readAll(BoardType type, String category, PageRequestDTO pageRequestDTO) {
        //비회원 허용 (여기서는 강제 검증 안 함) 필요시 로깅·맞춤기능에만 사용
        resolveLoginIdIfAny();

        Pageable pageable = pageRequestDTO.getPageable("createDate");
        var types = pageRequestDTO.getTypes();
        var keyword = pageRequestDTO.getKeyword();

        // 임시: 기존 search() 결과에 메모리 필터
        var page = boardJpaRepository.search(pageable, types, keyword);

        var filtered = page.getContent().stream()
                .filter(e -> e.getBoardType() == type)
                .filter(e -> (category == null || category.isBlank()) || category.equals(e.getFaqCategory()))
                .toList();

        var dtoList = filtered.stream().map(BoardDTO::new).toList();

        return PageResponseDTO.<BoardDTO>withAll()
                .pageRequestDTO(pageRequestDTO)
                .dtoList(dtoList)
                .total((int) filtered.size()) // 정확 총합 필요하면 레포 필터 방식으로 전환
                .build();
    }


    //=================================================================================
    @Override
    @Transactional
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq readOneBoardReq) {
        // 요구사항: “회원만 열람 가능”
        requireLoginAndMember();

        var boardEntity = boardJpaRepository.findById(readOneBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));

        // 조회수 증가
        boardEntity.setBViewCount(boardEntity.getBViewCount() + 1);

        // 지연로딩 환경이라면 사이즈 터치로 초기화
        boardEntity.getImages().size();

        // (2) 정렬 (sortOrder 오름차순)
        boardEntity.getImages().sort(Comparator.comparing(
                img -> Optional.ofNullable(img.getSortOrder()).orElse(0)
        ));

        // (필요시) 지연로딩 대비 참조
        List<ImageDTO> images = boardEntity.getImages()
                .stream()
                .map(ImageDTO::new)
                .collect(Collectors.toList());


        // ✅ 엔티티 → 평탄화 DTO로 직접 매핑
        return ReadOneBoardRes.builder()
                .bno(boardEntity.getBno())
                .bTitle(boardEntity.getBTitle())
                .bWriter(boardEntity.getBWriter())
                .bContent(boardEntity.getBContent())
                .bLikeCount(boardEntity.getBLikeCount())
                .images(images)
                .createDate(boardEntity.getCreateDate())   // BaseEntity에 있다면
                .latestDate(boardEntity.getLatestDate())   // BaseEntity에 있다면
                .build();
    }

    //=================================================================================
    @Transactional
    @Override
    public UpdateBoardRes updateBoard(
            UpdateBoardReq req,
            List<MultipartFile> addFiles,
            List<Long> deleteUuids,
            List<ImageOrderReq> orders
    ) {
        // 0) 로그인 + 본인 글 확인
        String memberId = requireLoginAndMember();
        BoardEntity e = boardJpaRepository.findById(req.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));
        if (!memberId.equals(e.getBWriter())) {
            throw new AccessDeniedException("본인 글만 수정할 수 있습니다.");
        }

        // 1) 본문 필드(널만 아닌 경우에만 갱신)
        if (req.getBTitle() != null) e.setBTitle(req.getBTitle());
        if (req.getBContent() != null) e.setBContent(req.getBContent());
        if (req.getNoticeFlag() != null) e.setNoticeFlag(req.getNoticeFlag());
        if (req.getIsSecret() != null) e.setIsSecret(req.getIsSecret());

        // 2) 이미지 삭제
        if (deleteUuids != null && !deleteUuids.isEmpty()) {
            List<ImageEntity> toRemove = e.getImages().stream()
                    .filter(img -> deleteUuids.contains(img.getUuid()))
                    .toList();
            toRemove.forEach(img -> {
                // (선택) 실파일 삭제가 필요하면 구현해 두세요.
                // deletePhysical(img.getUrl());
                e.removeImage(img); // orphanRemoval=true 가 걸려 있어야 DB에서 삭제됨
            });
        }

        // 3) 정렬 변경
        if (orders != null && !orders.isEmpty()) {
            Map<Long, Integer> orderMap = orders.stream()
                    .collect(Collectors.toMap(ImageOrderReq::getUuid, ImageOrderReq::getSortOrder));
            e.getImages().forEach(img -> {
                Integer so = orderMap.get(img.getUuid());
                if (so != null) img.setSortOrder(so);
            });
        }

        // 4) 업로드된 새 파일 추가
        if (addFiles != null && !addFiles.isEmpty()) {
            int current = e.getImages().size();
            // (선택) 개수 제한이 있다면 적용
            if (current + addFiles.size() > MAX_FILES_PER_POST) {
                throw new IllegalArgumentException("이미지는 최대 " + MAX_FILES_PER_POST + "개까지 업로드 가능합니다.");
            }
            saveImages(e, addFiles, current);  // 이미 BoardServiceImpl에 구현한 메서드 재사용
        }

        // 5) (선택) JSON으로 넘어온 URL 기반 이미지도 추가 지원
        //    - req.getImages() 가 있다면 이어붙임(정렬번호 없으면 뒤에 순차 할당)
        List<ImageDTO> incoming = Optional.ofNullable(req.getImages()).orElse(Collections.emptyList());
        if (!incoming.isEmpty()) {
            int idx = (e.getImages() == null) ? 0 : e.getImages().size();
            for (ImageDTO dto : incoming) {
                Integer order = (dto.getSortOrder() != null) ? dto.getSortOrder() : idx++;
                ImageEntity.forBoard(dto.getFileName(), dto.getUrl(), e, order);
            }
        }

        // 6) 즉시 반영(선택)
        boardJpaRepository.flush();

        // 7) 응답 DTO(정렬해서 반환)
        List<ImageDTO> imagesUpdate = Optional.ofNullable(e.getImages()).orElse(List.of())
                .stream()
                .sorted(Comparator.comparing(img -> Optional.ofNullable(img.getSortOrder()).orElse(0)))
                .map(img -> ImageDTO.builder()
                        .fileName(img.getFileName())
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

    //=================================================================================
    @Transactional
    @Override
    public DeleteBoardRes deleteBoard(DeleteBoardReq deleteBoardReq) {
        String memberId = requireLoginAndMember();

        BoardEntity board = boardJpaRepository.findById(deleteBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("게시글 없음"));

        if (!memberId.equals(board.getBWriter())) {
            throw new AccessDeniedException("본인 글만 삭제할 수 있습니다.");
        }

        boardJpaRepository.delete(board);

        return DeleteBoardRes.builder()
                .bno(board.getBno())
                .deleted(true)
                .build();
    }

    //=================================================================================
    @Override
    @Transactional
    public UpdateBoardRes likeBoard(Long bno) {
        // 회원만 좋아요 가능
        requireLoginAndMember();

        // 1. 게시글 조회
        BoardEntity boardEntity = boardJpaRepository.findById(bno)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글입니다."));

        // 2. 좋아요 1 증가
        int currentLike = boardEntity.getBLikeCount() != null ? boardEntity.getBLikeCount() : 0;
        boardEntity.setBLikeCount(currentLike + 1);

        // 3. JPA 변경 감지(dirty checking)로 자동 반영됨

        // 4. 결과 반환
        return UpdateBoardRes.builder()
                .bno(boardEntity.getBno())
                .bLikeCount(boardEntity.getBLikeCount())
                .build();
    }
}



