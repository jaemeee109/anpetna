package com.anpetna.board.service;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.ImageOrderReq;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardRes;
import com.anpetna.board.dto.likeCountTop5.LikeCountTop5Res;
import com.anpetna.board.dto.noticeTop5.NoticeTop5Res;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.board.event.BoardCreatedEvent;
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.board.repository.CommentJpaRepository;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.image.domain.ImageEntity;
import com.anpetna.image.dto.ImageDTO;
import com.anpetna.image.service.FileService;
import com.anpetna.image.service.MinioService;
import com.anpetna.notification.feature.like.service.LikeNotificationService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

// 관리자 판별용 import 추가
import org.springframework.security.core.Authentication;      // <- ADMIN 판별용
import org.springframework.security.core.GrantedAuthority;   // <- ADMIN 판별용
import org.springframework.security.core.context.SecurityContextHolder; // <- ADMIN 판별용

import java.util.*;
import java.util.stream.Collectors;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BoardServiceImpl implements BoardService {

    /* ======================= 의존성 주입 ======================= */
    private final BoardJpaRepository boardJpaRepository;
    private final FileService fileService;
    private final ModelMapper modelMapper;
    private final ApplicationEventPublisher publisher;
    private final LikeNotificationService likeNotificationService;
    private final CommentJpaRepository commentJpaRepository;

    /* ==================== 관리자 판별용 메서드 추가 ==================== */
    // ★★★ 공통 유틸: 관리자 여부 판별
    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        for (GrantedAuthority ga : auth.getAuthorities()) {
            String role = ga.getAuthority();
            if (role == null) continue;
            String up = role.trim().toUpperCase();
            // BoardGuard.isAdmin 과 동일 범위 허용
            if (up.equals("ADMIN") || up.equals("ROLE_ADMIN")
                    || up.equals("SUPER_ADMIN") || up.equals("ROLE_SUPER_ADMIN")
                    || up.equals("MANAGER") || up.equals("ROLE_MANAGER")
                    || up.equals("1") || up.equals("ROLE_1")) {
                return true;
            }
        }
        return false;
    }



    // ★★★ 공통 유틸: "관리자는 통과, 아니면 본인만" 강제
    private void requireOwnerOrAdmin(String ownerMemberId, String actorMemberId, String actionName) {
        // 로그인 여부는 각 메서드 초반에서 이미 검증
        if (isAdmin()) return; // <- 관리자면 무조건 OK
        if (!Objects.equals(ownerMemberId, actorMemberId)) {
            throw new AccessDeniedException("권한 없음: " + actionName + " 은/는 본인만 가능합니다.");
        }
    }

    private final ConcurrentMap<Long, Set<String>> boardLikeGuard = new ConcurrentHashMap<>();

    /* ======================= 파일 저장 유틸 ======================= */
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

    /* ============================ 생성 ============================ */
    @Override
    @Transactional
    public CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> files, String memberId) {
        // 1) 인증/가드
        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        // 2) 요청 → 엔티티 (ModelMapper)
        BoardEntity boardEntity = modelMapper.map(req, BoardEntity.class);
        boardEntity.setBWriter(memberId);
        boardEntity.setBViewCount(req.getBViewCount() == null ? 0 : req.getBViewCount());
        boardEntity.setBLikeCount(req.getBLikeCount() == null ? 0 : req.getBLikeCount());

        // 3) 파일이 있으면: 저장소에 저장 → ImageDTO → ImageEntity 매핑 → 보드에 추가
        if (files != null && !files.isEmpty()) {
            int nextSortOrder = (boardEntity.getImages() == null) ? 0 : boardEntity.getImages().size();
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) continue;

                ImageDTO imageDTO = fileService.uploadFile(file, nextSortOrder);
                ImageEntity imageEntity = modelMapper.map(imageDTO, ImageEntity.class);

                if (imageEntity.getSortOrder() == null) imageEntity.setSortOrder(nextSortOrder);
                boardEntity.addImage(imageEntity);

                nextSortOrder++;
            }
        }

        // 4) 저장 & 응답 매핑 (ModelMapper)
        BoardEntity saved = boardJpaRepository.save(boardEntity);

        // ★ NEW: 게시글 저장 성공 → 도메인 이벤트 발행 (커밋 후 리스너에서 처리)
        publisher.publishEvent(
                BoardCreatedEvent.builder()
                        .bno(saved.getBno())
                        .boardType(saved.getBoardType())
                        .bWriter(saved.getBWriter())
                        .bTitle(saved.getBTitle())
                        .bContent(saved.getBContent())
                        .build()
        );


        return modelMapper.map(saved, CreateBoardRes.class);
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
        String boardTypeStr = pr.getBoardType();
        String keyword = pr.getKeyword();
        String[] types = pr.getTypes();

        boolean hasSearch = (keyword != null && !keyword.isBlank())
                || (types != null && types.length > 0);

        Pageable pageable = PageRequest.of(Math.max(pr.getPage() - 1, 0), Math.max(pr.getSize(), 1));

        Page<BoardEntity> page;

        if (hasSearch) {
            // String -> BoardType(enum) 변환 (대소문자 보정)
            BoardType bt = null;
            if (boardTypeStr != null && !boardTypeStr.isBlank()) {
                try {
                    bt = BoardType.valueOf(boardTypeStr.toUpperCase());
                } catch (IllegalArgumentException ignore) {
                    bt = null; // 잘못된 값이면 필터 제외
                }
            }

            page = boardJpaRepository.searchByBoardType(pageable, bt, types, keyword);
        } else {
            // 검색이 없을 때는 기존 safe 쿼리 그대로 사용 (String boardType 사용)
            page = boardJpaRepository.findByBoardTypeSafe(boardTypeStr, pageable);
        }

        List<BoardDTO> list = page.map(entity -> {
            BoardDTO dto = new BoardDTO(entity);
            long commentCount = commentJpaRepository.countByBoardId(entity.getBno());
            dto.setCommentCount((int) commentCount);
            return dto;
        }).getContent();

        return PageResponseDTO.<BoardDTO>withAll()
                .pageRequestDTO(pr)
                .dtoList(list)
                .total((int) page.getTotalElements())
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<BoardDTO> readAll(BoardType type, String category, PageRequestDTO pr) {
        // 검색 파라미터
        String keyword = pr.getKeyword();
        String[] types = pr.getTypes();
        boolean hasSearch = (keyword != null && !keyword.isBlank())
                || (types != null && types.length > 0);

        Pageable pageable = PageRequest.of(
                Math.max(pr.getPage() - 1, 0),
                Math.max(pr.getSize(), 1)
        );

        Page<BoardEntity> page;

        if (hasSearch) {
            // ★ 검색이 있는 경우: boardType까지 where에 포함
            page = boardJpaRepository.searchByBoardType(pageable, type, types, keyword);
        } else if (type == BoardType.FAQ && category != null && !category.isBlank()) {
            page = boardJpaRepository.findByBoardTypeAndCategory(type, category, pageable);
        } else {
            // 검색이 없으면 안전 조회
            page = boardJpaRepository.findByBoardTypeSafe(type == null ? null : type.name(), pageable);
        }

        List<BoardDTO> list = page.map(entity -> {
            BoardDTO dto = new BoardDTO(entity);
            long commentCount = commentJpaRepository.countByBoardId(entity.getBno());
            dto.setCommentCount((int) commentCount);
            return dto;
        }).getContent();

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

        final boolean secret = Boolean.TRUE.equals(e.getIsSecret());
        if (secret) {
            final String writer = String.valueOf(e.getBWriter());

            // 로그인 사용자 정보는 항상 SecurityContext에서 읽어 소유자/관리자 판별
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            final String me = (auth != null ? auth.getName() : null);   // ← req.getMemberId() 사용 금지
            final boolean owner = (me != null) && writer.equalsIgnoreCase(me);

            /*final boolean admin = (auth != null) &&
                    auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .map(String::toUpperCase)
                            .anyMatch(s -> s.equals("ROLE_ADMIN") || s.equals("ADMIN"));*/
            final boolean admin = isAdmin();


            if (!owner && !admin) {
                // 프론트는 403을 감지해 즉시 차단 뷰로 전환(불필요한 추가 로딩 없음)
                throw new AccessDeniedException("FORBIDDEN: secret post");
            }
        }


        e.setBViewCount((e.getBViewCount() == null ? 0 : e.getBViewCount()) + 1);

        e.getImages().size(); // lazy init
        e.getImages().sort(Comparator.comparing(
                img -> Optional.ofNullable(img.getSortOrder()).orElse(0)
        ));

        List<ImageDTO> images = e.getImages().stream().map(ImageDTO::new).collect(Collectors.toList());

        return ReadOneBoardRes.builder()
                .bno(e.getBno())
                .bWriter(e.getBWriter())
                .bTitle(e.getBTitle())
                .bContent(e.getBContent())
                .bLikeCount(e.getBLikeCount())
                .noticeFlag(Boolean.TRUE.equals(e.getNoticeFlag()))
                .isSecret(Boolean.TRUE.equals(e.getIsSecret()))
                .images(images)
                .createDate(e.getCreateDate())
                .latestDate(e.getLatestDate())
                .build();
    }

    /* ============================ 수정 ============================ */
    @Override
    @Transactional
    public UpdateBoardRes updateBoard(UpdateBoardReq req,
                                      List<MultipartFile> addFiles,
                                      List<UUID> deleteUuids,
                                      List<ImageOrderReq> orders,
                                      String memberId) {
        // 1) 인증/가드
        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }
        // 1-1) 로그인 상태 -> 게시물 찾음
        BoardEntity boardEntity = boardJpaRepository.findById(req.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));
        // 1-2) 관리자 or 게시물 작성자만 수정 가능
        requireOwnerOrAdmin(boardEntity.getBWriter(), memberId, "게시글 수정");

        // 부분 업데이트
        if (req.getBTitle() != null) boardEntity.setBTitle(req.getBTitle());
        if (req.getBContent() != null) boardEntity.setBContent(req.getBContent());
        if (req.getNoticeFlag() != null) boardEntity.setNoticeFlag(req.getNoticeFlag());
        if (req.getIsSecret() != null) boardEntity.setIsSecret(req.getIsSecret());

        // 만약 이미지도 수정할꺼면 -> 기존 이미지 삭제 하고 수정  or 그냥 추가만
        if (deleteUuids != null && !deleteUuids.isEmpty() && boardEntity.getImages() != null) {
            List<ImageEntity> deleteImage = boardEntity.getImages().stream()
                    .filter(imageEntity -> deleteUuids.contains(imageEntity.getUuid()))
                    .toList();
            for (ImageEntity imageEntity : deleteImage) {
                try {
                    fileService.deleteFile(imageEntity.getFileName());
                } catch (Exception ignore) {
                }
                boardEntity.removeImage(imageEntity);
            }
        }

        // 정렬
        if (orders != null && !orders.isEmpty() && boardEntity.getImages() != null) {
            for (ImageOrderReq imageOrderReq : orders) {
                for (ImageEntity imageEntity : boardEntity.getImages()) {
                    if (Objects.equals(imageEntity.getUuid(), imageOrderReq.getUuid())) {
                        imageEntity.setSortOrder(imageOrderReq.getSortOrder());
                        break;
                    }
                }
            }
        }

        // 추가 업로드 currentImageCount = 현재 게시물에 있는 이미지 갯수
        if (addFiles != null && !addFiles.isEmpty()) {
            int currentImageCount = (boardEntity.getImages() == null) ? 0 : boardEntity.getImages().size();
            if (currentImageCount + addFiles.size() > MAX_FILES_PER_POST)
                throw new IllegalArgumentException("이미지는 최대 " + MAX_FILES_PER_POST + "개까지 업로드 가능합니다.");

            int nextSort = (boardEntity.getImages() == null || boardEntity.getImages().isEmpty())
                    ? 0
                    : boardEntity.getImages().stream().map(ImageEntity::getSortOrder).filter(Objects::nonNull).max(Integer::compareTo)
                    .orElse(boardEntity.getImages().size() - 1) + 1;

            // 이미지 새로 업로드 시 저장소에 실제 저장 → DTO 수신 → 엔티티로 변환 → 보드에 연결.
            List<String> uploaded = new ArrayList<>(); // 업로드 중 예외가 나면 지금까지 성공한 파일을 직접 지워서(파일은 DB 롤백과 무관) 불일치 방지.
            try {
                for (MultipartFile file : addFiles) {
                    if (file == null || file.isEmpty()) continue;
                    ImageDTO imageDTO = fileService.uploadFile(file, nextSort);
                    uploaded.add(imageDTO.getUrl());

                    ImageEntity imageEntity = modelMapper.map(imageDTO, ImageEntity.class);
                    if (imageEntity.getSortOrder() == null) imageEntity.setSortOrder(nextSort);
                    boardEntity.addImage(imageEntity);
                    nextSort++;
                }
            } catch (RuntimeException ex) {
                for (String url : uploaded) {
                    try {
                        fileService.deleteFile(url);
                    } catch (Exception ignore) {
                        log.warn("[upload] 삭제 실패 fileName={}, url={}, err={}");
                    }
                }
                throw ex;
            }
        }

        BoardEntity saved = boardJpaRepository.save(boardEntity);

        UpdateBoardRes updateBoardRes = modelMapper.map(saved, UpdateBoardRes.class);
        updateBoardRes.setImages(
                Optional.ofNullable(saved.getImages()).orElse(List.of()).stream()
                        .sorted(Comparator.comparing(img -> Optional.ofNullable(img.getSortOrder()).orElse(0)))
                        .map(imageEntity -> modelMapper.map(imageEntity, ImageDTO.class))
                        .toList()
        );
        return updateBoardRes;
    }

    /* ============================ 삭제 ============================ */
    @Override
    @Transactional
    public DeleteBoardRes deleteBoard(DeleteBoardReq req, String memberId) {
        if (memberId == null || memberId.isBlank()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        BoardEntity boardEntity = boardJpaRepository.findById(req.getBno())
                .orElseThrow(() -> new RuntimeException("게시글 없음"));

        // ★ 변경: 관리자면 통과, 아니면 본인만
        requireOwnerOrAdmin(boardEntity.getBWriter(), memberId, "게시글 삭제");

        // getBno 에 있는 이미지 파일이름 저장
        List<String> fileNames = Optional.ofNullable(boardEntity.getImages()).orElse(List.of())
                .stream()
                .map(ImageEntity::getFileName)   // ← 엔티티에 저장된 실제 저장 파일명
                .filter(fn -> fn != null && !fn.isBlank())
                .toList();

        // 2) 파일부터 삭제 (하나라도 실패하면 예외 발생 → DB는 그대로)
        for (String file : fileNames) {
            fileService.deleteFile(file);
        }

        // 3) 파일이 모두 지워졌다면 DB 삭제
        boardJpaRepository.delete(boardEntity);

        return DeleteBoardRes.builder()
                .bno(boardEntity.getBno())
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

        //  본인 글 금지: 403이 아니라 400으로 내려서 프론트 인터셉터 리다이렉트 방지
        if (memberId.equals(e.getBWriter())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "본인 글에는 좋아요를 누를 수 없습니다."
            );
        }

        // 중복 방지 + 토글 유지
        Set<String> users = boardLikeGuard.computeIfAbsent(bno, k -> java.util.concurrent.ConcurrentHashMap.newKeySet());
        boolean firstTime = users.add(memberId);

        int current = (e.getBLikeCount() == null ? 0 : e.getBLikeCount());
        if (!firstTime) {
            users.remove(memberId);
            e.setBLikeCount(Math.max(0, current - 1));
        } else {
            e.setBLikeCount(current + 1);
            try {
                likeNotificationService.notifyBoardLike(e, memberId);
            } catch (Exception ex) {
                log.warn("notifyBoardLike failed: bno={}, actor={}", bno, memberId, ex);
            }
        }

        return UpdateBoardRes.builder()
                .bno(e.getBno())
                .bLikeCount(e.getBLikeCount())
                .build();
    }


    /* ============================ 공지글 최신순 5개 ============================ */
    @Override
    public List<NoticeTop5Res> getNoticeTop5() {
        Pageable top5 = PageRequest.of(0, 5);
        return boardJpaRepository.noticeCreateDateTop5(BoardType.NOTICE, top5)
                .stream()
                .map(board -> {
                    NoticeTop5Res dto = NoticeTop5Res.from(board);
                    long commentCount = commentJpaRepository.countByBoardId(board.getBno());
                    dto.setCommentCount((int) commentCount);   // ✅ 댓글 수 추가
                    return dto;
                })
                .toList();
    }

    /* ============================ 게시물 좋아요 순 5개 ============================ */
    @Override
    public List<LikeCountTop5Res> getLikeCountTop5() {
        Pageable top5 = PageRequest.of(0, 5);
        return boardJpaRepository.freeLikeCountTop5(BoardType.FREE, top5)
                .stream()
                .map(board -> {
                    LikeCountTop5Res dto = LikeCountTop5Res.from(board);
                    long commentCount = commentJpaRepository.countByBoardId(board.getBno());
                    dto.setCommentCount((int) commentCount);   // ✅ 댓글 수 추가
                    return dto;
                })
                .toList();
    }
}

/* 게시물 수정 부분
deleteUuids 에 포함된 UUID 와 일치하는 이미지들만 골라 삭제 대상 목록(deleteImage)을 만듬
-> 왜 먼저 모으고(forEach 안에서 바로 remove 안 하냐?)
컬렉션을 순회 중에 바로 제거하면 ConcurrentModificationException(“순회(iterate)하는 도중” 그 컬렉션의 구조를 바꾸면 자바가 던지는 fail-fast 예외) 위험 있음.
그래서 따로 모아서 그다음에 지우는 패턴이 안전.
localStorage.deleteFile(url)로 물리 파일(로컬/S3)을 지우고,
boardEntity.removeImage(imageEntity)로 연관관계 해제(컬렉션에서 제거 + img.setBoard(null) 실행되게).
엔티티에 orphanRemoval = true 가 설정돼 있다면, 커밋 시 DB 에서도 해당 이미지 행이 삭제.
catch (Exception ignore)는 클린업 실패가 원래 수정 흐름을 덮어쓰지 않게 하려는 의도.
*/

/*
이어붙일 정렬 시작값을 계산:
이미지가 없으면 0부터,
있으면 현재 정렬값의 최대치 + 1부터 시작.
정렬값이 null 인 항목들은 제외하고 최대값을 구하되, 전부 null 이면 size-1 + 1로 대체하는 로직.
*/

/*
삭제: 지울 UUID 에 해당하는 이미지를 골라 파일 삭제 → 연관 제거(orphanRemoval 로 DB 행 삭제).
정렬: 클라가 준 지시에 맞춰 UUID 매칭 → sortOrder 세팅(중복/공백 검증은 선택).
추가: 개수 제한 확인 후 파일 저장 → 엔티티 생성/연결, 예외 시 보상 삭제.
마지막에 저장하고 정렬된 상태로 DTO 반환.
*/