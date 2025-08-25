package com.anpetna.board.service;

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
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// 권한/인증
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

// 회원 존재 확인용
import com.anpetna.member.repository.MemberRepository;
import jakarta.persistence.EntityNotFoundException;

import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import jakarta.validation.constraints.NotBlank;
import com.anpetna.board.dto.readAllBoard.ReadAllBoardReq;
import com.anpetna.board.dto.readAllBoard.ReadAllBoardRes;


@Service
@RequiredArgsConstructor
@Transactional
public class BoardServiceImpl implements BoardService {


    private final BoardJpaRepository boardJpaRepository; // 의존성 주입

    // 멤버 확인용
    private final MemberRepository memberRepository;

    // 로그인 + 회원여부 검증(필수 구간에서 사용)
    private String requireLoginAndMember() {
        var ctx = SecurityContextHolder.getContext();
        var auth = (ctx != null) ? ctx.getAuthentication() : null;

        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

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

        if (auth == null || !auth.isAuthenticated()
                || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
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
                .build();

        // 이미지 첨부
        if (req.getImages() != null) {
            for (var img : req.getImages()) {
                ImageEntity.forBoard(img.getFileName(), img.getUrl(), board, img.getSortOrder());
            }
        }

        var saved = boardJpaRepository.save(board);
        return CreateBoardRes.builder().createBoard(saved).build();
    }
    /* @Override
    public CreateBoardRes createBoard(CreateBoardReq createBoardReq) {

        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration().setSkipNullEnabled(true);

        modelMapper.typeMap(CreateBoardReq.class, BoardEntity.class)
                .addMappings(mapper -> mapper.skip(BoardEntity::setImages));

        //  DTO -> Entity
        BoardEntity board = modelMapper.map(createBoardReq, BoardEntity.class);

        // 이미지 첨부 (이미 attachToBoard 내부에서 양방향 설정 처리됨)
        if (createBoardReq.getImages() != null) {
            for (var imgDto : createBoardReq.getImages()) {
                ImageEntity.forBoard(imgDto.getFileName(), imgDto.getUrl(), board, imgDto.getSortOrder());
            }
        }

        //  저장
        BoardEntity saved = boardJpaRepository.save(board);

        //  반환
        return CreateBoardRes.builder()
                .createBoard(saved)
                .build();
    }*/


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
    @Override
    @Transactional
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq readOneBoardReq) {
        // 요구사항: “회원만 열람 가능”
        requireLoginAndMember();

        var boardEntity = boardJpaRepository.findById(readOneBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));

        // 조회수 증가
        boardEntity.setBViewCount(boardEntity.getBViewCount() + 1);

        // (필요시) 지연로딩 대비 참조
        List<ImageEntity> images = boardEntity.getImages();

        // ✅ 엔티티 → 평탄화 DTO로 직접 매핑
        return ReadOneBoardRes.builder()
                .bno(boardEntity.getBno())
                .bTitle(boardEntity.getBTitle())
                .bWriter(boardEntity.getBWriter())
                .bContent(boardEntity.getBContent())
                .bLikeCount(boardEntity.getBLikeCount())
                .createDate(boardEntity.getCreateDate())   // BaseEntity에 있다면
                .latestDate(boardEntity.getLatestDate())   // BaseEntity에 있다면
                .build();
    }
   /* @Override
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq readOneBoardReq) {

        var boardEntity = boardJpaRepository.findById(readOneBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));


        // 조회수 증가
        boardEntity.setBViewCount(boardEntity.getBViewCount() + 1);
        //이미지
        List<ImageEntity> images = boardEntity.getImages();

        return ReadOneBoardRes.builder()
                .readOneBoard(boardEntity)
                .build();
    }*/

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
            for (var imgDto : updateBoardReq.getImages()) {
                ImageEntity.forBoard(imgDto.getFileName(), imgDto.getUrl(), boardEntity, imgDto.getSortOrder());
            }
        }

        boardJpaRepository.flush();

        // JPA dirty checking
        return UpdateBoardRes.builder()
                .updateBoard(boardEntity)
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

        return DeleteBoardRes.builder().deleteBoard(board).build();

    }
        /*Long bno = deleteBoardReq.getBno();

        var boardEntity = boardJpaRepository.findById(bno)
                .orElseThrow(() -> {
                            throw new RuntimeException("존재하지 않는 게시글 입니다.");
                        }
                );

        boardJpaRepository.delete(boardEntity);

        return DeleteBoardRes.builder()
                .deleteBoard(boardEntity)
                .build();*/

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
                .updateBoard(boardEntity)
                .build();
    }
}



