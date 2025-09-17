package com.anpetna.board.service;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.domain.CommentEntity;
import com.anpetna.board.dto.CommentDTO;
import com.anpetna.board.dto.createComment.CreateCommReq;
import com.anpetna.board.dto.createComment.CreateCommRes;
import com.anpetna.board.dto.deleteComment.DeleteCommReq;
import com.anpetna.board.dto.deleteComment.DeleteCommRes;
import com.anpetna.board.dto.readComment.ReadCommReq;
import com.anpetna.board.dto.readComment.ReadCommRes;
import com.anpetna.board.dto.updateComment.UpdateCommReq;
import com.anpetna.board.dto.updateComment.UpdateCommRes;
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.board.repository.CommentJpaRepository;
import com.anpetna.core.coreDto.PageResponseDTO;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.anpetna.member.repository.MemberRepository;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@RequiredArgsConstructor
@Transactional
@Log4j2
public class CommentServiceImpl implements CommentService {

    private final CommentJpaRepository commentJpaRepository; // 의존성 주입
    private final BoardJpaRepository boardJpaRepository;
    private final MemberRepository memberRepository;

    // 댓글 좋아요 누를때 누른 사람이 또 못누르게 막기 위해 메서드 추가
    private final ConcurrentMap<Long, Set<String>> likeGuard = new ConcurrentHashMap<>();

    // 로그인 + 회원여부 검증, 실패 시 AccessDeniedException
    private String requireLoginAndMember() {
        Authentication auth = SecurityContextHolder.getContext() != null
                ? SecurityContextHolder.getContext().getAuthentication()
                : null;

        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        // principal 타입별 안전 추출
        String loginId;
        Object p = auth.getPrincipal();
        if (p instanceof String s) {
            loginId = s;
        } else if (p instanceof UserDetails ud) {
            loginId = ud.getUsername();
        } else {
            loginId = auth.getName(); // fallback
        }

        // DB에 실제 회원?
        if (!memberRepository.existsById(loginId)) {
            throw new AccessDeniedException("회원만 이용할 수 있습니다. 회원가입을 해주세요: " + loginId);
        }
        return loginId;
    }

    //=================================================================================
    @Override
    public CreateCommRes createComment(CreateCommReq createCommReq) {

        if (createCommReq.getBno() == null) {
            throw new IllegalArgumentException("유효한 게시글 번호(bno)가 필요합니다.");
        }
        // 존재 확인(선택), 없으면 404 성격
        if (!boardJpaRepository.existsById(createCommReq.getBno())) {
            throw new EntityNotFoundException("존재하지 않는 게시글입니다. bno=" + createCommReq.getBno());
        }

        String memberId = requireLoginAndMember();

        // FK 연관 세팅
        BoardEntity boardRef = boardJpaRepository.getReferenceById(createCommReq.getBno());

        CommentEntity entity = CommentEntity.builder()
                .cWriter(memberId)
                .cContent(createCommReq.getCContent())
                .cLikeCount(createCommReq.getCLikeCount() == null ? 0 : createCommReq.getCLikeCount())
                .board(boardRef)
                .build();

        CommentEntity saved = commentJpaRepository.save(entity);

        return CreateCommRes.builder()
                .createComm(CommentDTO.fromEntity(saved))   // ← 엔티티 대신 DTO로 반환
                .build();
    }


    //=================================================================================
    @Override
    @Transactional(readOnly = true)
    public ReadCommRes readComment(ReadCommReq readCommReq) {
        requireLoginAndMember();

        var pageable = readCommReq.getPageable(readCommReq.getSortBy(), "cno");
        var page = commentJpaRepository.findByBoard_Bno(readCommReq.getBno(), pageable);

        var dtoList = page.getContent().stream()
                .map(CommentDTO::fromEntity)   // 공용 DTO 매핑
                .toList();

        var pageDTO = PageResponseDTO.<CommentDTO>withAll()
                .pageRequestDTO(readCommReq)
                .dtoList(dtoList)
                .total((int) page.getTotalElements())
                .build();

        return ReadCommRes.builder()
                .bno(readCommReq.getBno())
                .page(pageDTO)
                .build();
    }


    //=================================================================================
    @Override
    public UpdateCommRes updateComment(UpdateCommReq updateCommReq) {
        String memberId = requireLoginAndMember();

        CommentEntity entity = commentJpaRepository.findById(updateCommReq.getCno())
                .orElseThrow((
                ) -> new EntityNotFoundException("존재하지 않는 댓글입니다. cno=" + updateCommReq.getCno()));

        if (!memberId.equals(entity.getCWriter())) {
            throw new AccessDeniedException("본인 댓글만 수정할 수 있습니다.");
        }

        if (updateCommReq.getCContent() != null) entity.setCContent(updateCommReq.getCContent());
        if (updateCommReq.getCLikeCount() != null) entity.setCLikeCount(updateCommReq.getCLikeCount());

        // 영속 엔티티이므로 save() 불필요 (dirty checking)
        return UpdateCommRes.builder()
                .updateComment(CommentDTO.fromEntity(entity))
                .build();
    }

    //=================================================================================
    @Override
    public DeleteCommRes deleteComment(DeleteCommReq deleteCommReq) {
        String memberId = requireLoginAndMember();

        CommentEntity entity = commentJpaRepository.findById(deleteCommReq.getCno())
                .orElseThrow((
                ) -> new EntityNotFoundException("존재하지 않는 댓글입니다. cno=" + deleteCommReq.getCno()));

        if (!memberId.equals(entity.getCWriter())) {
            throw new AccessDeniedException("본인 댓글만 삭제할 수 있습니다.");
        }

        // 삭제 전 스냅샷
        CommentDTO snapshot = CommentDTO.fromEntity(entity);
        commentJpaRepository.delete(entity);
        likeGuard.remove(deleteCommReq.getCno());

        return DeleteCommRes.builder()
                .deleteComment(snapshot)
                .build();
    }

    //=================================================================================
    @Override
    public UpdateCommRes likeComment(Long cno) {
        // 1) 회원만 가능
        String memberId = requireLoginAndMember();

        // 2) 댓글 조회
        CommentEntity entity = commentJpaRepository.findById(cno)
                .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 댓글입니다. cno=" + cno));

        // 3) 본인 댓글은 좋아요 금지 (규칙을 서비스에서 보증)
        if (memberId.equals(entity.getCWriter())) {
            throw new AccessDeniedException("본인 댓글에는 좋아요를 누를 수 없습니다.");
        }

        // 4) 중복 방지 (아이들포텐트 처리: 이미 눌렀으면 그대로 반환)
        Set<String> users = likeGuard.computeIfAbsent(cno, k -> ConcurrentHashMap.newKeySet());
        boolean firstTime = users.add(memberId);
        if (!firstTime) {
            // 예외 대신 현재 상태 그대로 반환 → 테스트 코드 단순화
            return UpdateCommRes.builder()
                    .updateComment(CommentDTO.fromEntity(entity))
                    .build();
        }

        // 5) 첫 눌림이면 +1
        int current = entity.getCLikeCount() == null ? 0 : entity.getCLikeCount();
        entity.setCLikeCount(current + 1); // dirty checking

        return UpdateCommRes.builder()
                .updateComment(CommentDTO.fromEntity(entity))
                .build();
    }
}
