package com.anpetna.board.service;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardRes;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.coreDto.ImageDTO;
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 권한/인증
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

// 회원 존재 확인용
import com.anpetna.member.repository.MemberRepository;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardServiceImpl implements BoardService {

    // 의존성 주입
    private final BoardJpaRepository boardJpaRepository;

    // 멤버 확인용
    private final MemberRepository memberRepository;

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
    public CreateBoardRes createBoard(CreateBoardReq req) {
        // 1) 로그인 사용자 가져오기 (반드시 맨 앞에서)
        String memberId = requireLoginAndMember();

        BoardEntity board = BoardEntity.builder()
                .bWriter(memberId)
                .bTitle(req.getBTitle())
                .bContent(req.getBContent())
                .boardType(req.getBoardType())
                .noticeFlag(Boolean.TRUE.equals(req.getNoticeFlag()))
                .isSecret(Boolean.TRUE.equals(req.getIsSecret()))
                .bViewCount(req.getBViewCount() == null ? 0 : req.getBViewCount())
                .bLikeCount(req.getBLikeCount() == null ? 0 : req.getBLikeCount())
                .faqCategory(req.getFaqCategory()) // ★ 추가
                .build();

        // 2) 이미지 추가
        List<ImageDTO> imageDTOS = Optional.ofNullable(req.getImages()).orElse(Collections.emptyList());
        //                         Optional.ofNullable(...)이 null 일 수도 있는 걸 감싸는 안전 장치.
        //                                                              .orElse(Collections.emptyList()) null 이면 변경 불가(empty) 리스트를 돌려줘.
        if (!imageDTOS.isEmpty()) {  // 정렬 순서가 null 이면 0으로, 이미지가 1개라도 있을 때만 밑의 로직을 수행. 없으면 아무것도 안 함.
            int idx = 0;  // 정렬 순서가 null 이면 0으로 자동 할당용 증가 인덱스를 0부터 시작.
            for (ImageDTO imageDTO : imageDTOS) { // 이미지 DTO 들을 하나씩 순회.
                Integer order = imageDTO.getSortOrder() != null ? imageDTO.getSortOrder() : idx++;
                //              DTO 에 sortOrder 가 있으면 그대로 사용.
                //                                       없으면(null) 현재 idx 값을 사용하고, 그 다음에 idx 를 1 증가(후위 증가 idx++)
                ImageEntity.forBoard(imageDTO.getFileName(), imageDTO.getUrl(), board, order);
                // 연관관계 편의 메서드 이용
            }
        }

        BoardEntity saved = boardJpaRepository.save(board); //

        // ★ 실제 저장된 이미지 엔티티 기준으로 응답 DTO 용 리스트 생성(정렬 포함)
        List<ImageDTO> imagesRes = Optional.ofNullable(saved.getImages()).orElse(List.of())
                .stream()
                .sorted(Comparator.comparing(img -> Optional.ofNullable(img.getSortOrder()).orElse(0)))
                .map(img -> ImageDTO.builder()
                        .fileName(img.getFileName())
                        .url(img.getUrl())
                        .sortOrder(img.getSortOrder())
                        .build())
                .toList();

        // ★ saved 기준으로 빌더 채우기
        return CreateBoardRes.builder()
                .bno(saved.getBno())
                .bTitle(saved.getBTitle())
                .bWriter(saved.getBWriter())
                .bContent(saved.getBContent())
                .bLikeCount(saved.getBLikeCount())
                .images(imagesRes)
                .createDate(saved.getCreateDate())   // BaseEntity에 있다면
                .latestDate(saved.getLatestDate())   // BaseEntity에 있다면
                .build();
    }

    // ★ 추가 ==========================================================================
    @Override
    @Transactional
    public CreateBoardRes create(CreateBoardReq req) {
        return createBoard(req); // ✔ CreateBoardRes 그대로 리턴
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
    public UpdateBoardRes updateBoard(UpdateBoardReq updateBoardReq) {
        // 본인만 수정
        String memberId = requireLoginAndMember();

        // 1. DB에서 기존 게시글 조회
        BoardEntity boardEntity = boardJpaRepository.findById(updateBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));

        if (!memberId.equals(boardEntity.getBWriter())) {
            throw new AccessDeniedException("본인 글만 수정할 수 있습니다.");
        }

        // 2. 제목/내용 업데이트
        if (updateBoardReq.getBTitle() != null) boardEntity.setBTitle(updateBoardReq.getBTitle());
        if (updateBoardReq.getBContent() != null) boardEntity.setBContent(updateBoardReq.getBContent());

        // 3. 이미지 업데이트
        if (updateBoardReq.getImages() != null) {
            // 기존 이미지 삭제
            boardEntity.getImages().clear();

            // 새로운 이미지 추가 (attachToBoard 내부에서 양방향 처리)
            for (var imgDTO : updateBoardReq.getImages()) {
                ImageEntity.forBoard(imgDTO.getFileName(), imgDTO.getUrl(), boardEntity, imgDTO.getSortOrder());
            }
        }

        // DB에 즉시 반영
        boardJpaRepository.flush();

        List<ImageDTO> imagesUpdate = Optional.ofNullable(boardEntity.getImages()).orElse(List.of()).stream()
                .sorted(Comparator.comparing(img -> Optional.ofNullable(img.getSortOrder()).orElse(0)))
                .map(img -> ImageDTO.builder()
                        .fileName(img.getFileName())
                        .url(img.getUrl())
                        .sortOrder(img.getSortOrder())
                        .build())
                .toList();

        // JPA dirty checking
        return UpdateBoardRes.builder()
                .bno(boardEntity.getBno())
                .bTitle(boardEntity.getBTitle())
                .bContent(boardEntity.getBContent())
                .bLikeCount(boardEntity.getBLikeCount())
                .images(imagesUpdate)
                .createDate(boardEntity.getCreateDate())   // BaseEntity에 있다면
                .latestDate(boardEntity.getLatestDate())   // BaseEntity에 있다면
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



