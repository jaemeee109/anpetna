package com.anpetna.board.service;

import com.anpetna.board.constant.LikeTargetType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.domain.CommentEntity;
import com.anpetna.board.domain.LikeEntity;
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
import com.anpetna.board.repository.LikeJpaRepository;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.notification.common.constant.NotificationType;
import com.anpetna.notification.common.constant.TargetType;
import com.anpetna.notification.common.dto.CreateNotificationCmd;
import com.anpetna.notification.common.service.NotificationService;
import com.anpetna.notification.feature.comment.service.CommentNotificationService;
import com.anpetna.notification.feature.like.service.LikeNotificationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final CommentNotificationService commentNotificationService;
    private final LikeNotificationService likeNotificationService;
    private final LikeJpaRepository likeJpaRepository;

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

        commentNotificationService.notifyCommentCreated(boardRef, saved, memberId);

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
        // [ADD] 댓글에 달린 좋아요 선삭제(정합성)
        likeJpaRepository.deleteByTargetTypeAndTargetId(LikeTargetType.COMMENT, deleteCommReq.getCno());
        commentJpaRepository.delete(entity);

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

        // 3) 현재 상태 조회 (이미 눌렀는지)
        boolean exists = likeJpaRepository.existsByTargetTypeAndTargetIdAndMemberId(
                LikeTargetType.COMMENT, cno, memberId
        );

        if (exists) {
            // 3-A) 이미 눌림 → "취소": 기록 삭제 + 카운트 -1
            likeJpaRepository.findByTargetTypeAndTargetIdAndMemberId(
                    LikeTargetType.COMMENT, cno, memberId
            ).ifPresent(likeJpaRepository::delete);

            commentJpaRepository.decCommentLike(cno); // 원자적 감소(하한 0)

            return UpdateCommRes.builder()
                    .updateComment(CommentDTO.fromEntity(entity))
                    .build();
        } else {
            // 3-B) 아직 안 눌림 → "좋아요": 기록 저장 + 카운트 +1
            try {
                likeJpaRepository.save(
                        LikeEntity.builder()
                                .targetType(LikeTargetType.COMMENT)
                                .targetId(cno)
                                .memberId(memberId)
                                .build()
                );
                commentJpaRepository.incCommentLike(cno); // 원자적 증가
            } catch (DataIntegrityViolationException dup) {
                // 경쟁: 다른 트랜잭션이 먼저 insert → 최종 상태는 ON이므로 그대로 진행
            }

            try {
                likeNotificationService.notifyCommentLike(entity, memberId);
            } catch (Exception ex) {
                log.warn("notifyCommentLike failed: cno={}, actor={}", cno, memberId, ex);
            }

            return UpdateCommRes.builder()
                    .updateComment(CommentDTO.fromEntity(entity))
                    .build();
        }
    }
}
