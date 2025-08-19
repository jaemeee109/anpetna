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
import com.anpetna.coreDto.PageResponseDTO;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
@Log4j2
public class CommentServiceImpl implements CommentService {

    private final CommentJpaRepository commentJpaRepository; // 의존성 주입
    private final BoardJpaRepository boardJpaRepository;

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

        // FK 연관 세팅
        BoardEntity boardRef = boardJpaRepository.getReferenceById(createCommReq.getBno());

        CommentEntity entity = CommentEntity.builder()
                .cWriter(createCommReq.getCWriter())
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

        CommentEntity entity = commentJpaRepository.findById(updateCommReq.getCno())
                .orElseThrow((
                ) -> new EntityNotFoundException("존재하지 않는 댓글입니다. cno=" + updateCommReq.getCno()));

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

        CommentEntity entity = commentJpaRepository.findById(deleteCommReq.getCno())
                .orElseThrow((
                ) -> new EntityNotFoundException("존재하지 않는 댓글입니다. cno=" + deleteCommReq.getCno()));

        // 삭제 전 스냅샷
        CommentDTO snapshot = CommentDTO.fromEntity(entity);
        commentJpaRepository.delete(entity);

        return DeleteCommRes.builder()
                .deleteComment(snapshot)
                .build();
    }

    //=================================================================================
    @Override
    public UpdateCommRes likeComment(Long cno) {

        CommentEntity entity = commentJpaRepository.findById(cno)
                        .orElseThrow(() -> new EntityNotFoundException("존재하지 않는 댓글입니다. cno=" + cno));

                int current = entity.getCLikeCount() == null ? 0 : entity.getCLikeCount();
                entity.setCLikeCount(current + 1);

                return UpdateCommRes.builder()
                        .updateComment(CommentDTO.fromEntity(entity))
                        .build();
    }
}
