package com.anpetna.board.service;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.domain.CommentEntity;
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

        // 1) 기본 검증
        if (createCommReq.getBno() == null) {
            throw new IllegalArgumentException("유효한 게시글 번호(bno)가 필요합니다.");
        }
        if (!boardJpaRepository.existsById(createCommReq.getBno())) {
            throw new IllegalArgumentException("존재하지 않는 게시글입니다. (bno=" + createCommReq.getBno() + ")");
        }

        // 2) 엔티티 수동 매핑
        CommentEntity entity =CommentEntity.builder()
                .cWriter(createCommReq.getCWriter())
                .cContent(createCommReq.getCContent())
                .cLikeCount(createCommReq.getCLikeCount()== null ? 0 : createCommReq.getCLikeCount())
                .build();

        // 3) FK(연관) 세팅: bno -> board
        BoardEntity boardEntity = boardJpaRepository.getReferenceById(createCommReq.getBno());
        entity.setBoard(boardEntity);

        // 4) 저장 및 반환
        CommentEntity result = commentJpaRepository.save(entity);

        return CreateCommRes.builder()
                .createComm(result)
                .build();

        /*ModelMapper modelMapper = new ModelMapper();
        var createComment = modelMapper.map(createCommReq, CommentEntity.class);
        var commentEntity = commentJpaRepository.save(createComment);
        return CreateCommRes.builder()
                .createComm(commentEntity)
                .build();*/
    }


    //=================================================================================
    @Override
    @Transactional(readOnly = true)
    public ReadCommRes readComment(ReadCommReq readCommReq) {

        var pageable = readCommReq.getPageable(readCommReq.getSortBy(), "cno");

        var page = commentJpaRepository.findByBoard_Bno(readCommReq.getBno(), pageable);

        var dtoList = page.getContent().stream()
                .map(this::toDTO)
                .toList();

        var pageDTO = PageResponseDTO.<ReadCommRes.CommentDTO>withAll()
                .pageRequestDTO(readCommReq)
                .dtoList(dtoList)
                .total((int) page.getTotalElements()) // PageResponseDTO 는 int total
                .build();

        return ReadCommRes.builder()
                .bno(readCommReq.getBno())
                .page(pageDTO)
                .build();
    }

    private ReadCommRes.CommentDTO toDTO(CommentEntity commentEntity) {
        return new ReadCommRes.CommentDTO(
                commentEntity.getCno(),
                commentEntity.getCContent(),
                commentEntity.getCWriter(),
                commentEntity.getCLikeCount()
        );
    }


    //=================================================================================
    @Override
    public UpdateCommRes updateComment(UpdateCommReq updateCommReq) {

        var commentEntity = commentJpaRepository.findById(updateCommReq.getCno())
                .orElseThrow(() -> {
                            throw new RuntimeException("존재하지 않는 댓글 입니다.");
                        }
                );

        if (updateCommReq.getCContent() != null) commentEntity.setCContent(updateCommReq.getCContent());

        if (updateCommReq.getCContent() != null) {
            commentEntity.setCContent(updateCommReq.getCContent());
        }
        return UpdateCommRes.builder()
                .updateComment(commentEntity)
                .build();
    }

    //=================================================================================
    @Override
    public DeleteCommRes deleteComment(DeleteCommReq deleteCommReq) {

        Long cno = deleteCommReq.getCno();

        var commentEntity = commentJpaRepository.findById(cno)
                .orElseThrow(() -> {
                            throw new RuntimeException("존재하지 않는 댓글 입니다.");
                        }
                );

        commentJpaRepository.delete(commentEntity);

        return DeleteCommRes.builder()
                .deleteComment(commentEntity)
                .build();
    }

    //=================================================================================
    @Override
    public UpdateCommRes likeComment(Long cno) {

        var commentEntity = commentJpaRepository.findById(cno).orElseThrow(() ->
                new RuntimeException("존재하지 않는 댓글 입니다"));

        commentEntity.setCLikeCount(commentEntity.getCLikeCount() + 1);

        return UpdateCommRes.builder()
                .updateComment(commentEntity)
                .build();
    }
}
