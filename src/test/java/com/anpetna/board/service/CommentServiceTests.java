package com.anpetna.board.service;

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
import com.anpetna.board.repository.CommentJpaRepository;
import com.anpetna.coreDto.PageResponseDTO;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;


@SpringBootTest
@Log4j2
class CommentServiceTests {

    @Autowired
    private CommentService commentService;

    @Autowired
    private CommentJpaRepository commentJpaRepository;

    //===================================================================================================
    @Test
    void testCreateComment() { // createComment 테스트 C
        CreateCommReq createCommReq = CreateCommReq.builder()
                .bno(10L) // 존재하는 게시글 번호여야 함
                .cWriter("서비스테스트2")
                .cContent("서비스에서 댓글등록테스트2")
                .cLikeCount(0)
                .build();

        log.info("testCreateComment() 메서드 실행....");

        var result = commentService.createComment(createCommReq);

        log.info("=============================================");
        log.info("등록 결과: {}", result.getCreateComm());
        log.info("=============================================");

        assertThat(result).isNotNull();
        assertThat(result.getCreateComm()).isNotNull();
        assertThat(result.getCreateComm().getCno()).isNotNull();
    }

    //===================================================================================================
    @Test
    void testCreateReadCommPaged() { // 댓글 등록 + 페이징 조회 C+R
        // given
        Long bno = 11L; // ✅ 게시글 번호는 따로 변수로
        CreateCommReq createCommReq = CreateCommReq.builder()
                .bno(bno)
                .cWriter("writer11")
                .cContent("content11")
                .cLikeCount(0)
                .build();

        // when
        CreateCommRes createCommRes = commentService.createComment(createCommReq);

        // then (검증)
        assertThat(createCommRes).isNotNull();
        assertThat(createCommRes.getCreateComm()).isNotNull();
        Long newCno = createCommRes.getCreateComm().getCno();
        assertThat(newCno).isNotNull();

        // and: 방금 단 댓글이 목록에 보이는지 확인
        ReadCommReq readCommReq = new ReadCommReq();
        readCommReq.setBno(bno);
        readCommReq.setPage(1);
        readCommReq.setSize(10);
        readCommReq.setSortBy("cno");

        ReadCommRes readCommRes = commentService.readComment(readCommReq);
        PageResponseDTO<CommentDTO> page = readCommRes.getPage();

        assertThat(readCommRes.getBno()).isEqualTo(11L);
        assertThat(page.getDtoList()).extracting(CommentDTO::getCno).contains(newCno);

        log.info("=============================================================");
        log.info("목록에 있는지 확인 : " + readCommRes);
        log.info("=============================================================");
    }

    //===================================================================================================
    @Test
    void testUpdateComment() { // U 테스트
        Long cno = 4L;

        UpdateCommReq updateCommReq = UpdateCommReq.builder()
                .cno(cno)
                .cContent("업데이트 테스트 진행한 댓글")
                .build();

        // when
        UpdateCommRes result = commentService.updateComment(updateCommReq);

        // then
        assertThat(result.getUpdateComment().getCno()).isEqualTo(cno);
        assertThat(result.getUpdateComment().getCContent()).isEqualTo("업데이트 테스트 진행한 댓글");

        log.info("=============================================================");
        log.info("업데이트 됐는지 확인 : " + result);
        log.info("=============================================================");
    }

    //===================================================================================================
    @Test
    void testCLikeComment() {
        Long cno = 3L;

        // 현재 값 읽기
        CommentEntity before = commentJpaRepository.findById(cno).orElseThrow();
        int prev = before.getCLikeCount() == null ? 0 : before.getCLikeCount();

        // when
        UpdateCommRes result = commentService.likeComment(cno);

        // then
        assertThat(result.getUpdateComment().getCLikeCount()).isEqualTo(prev + 1);

        log.info("=============================================================");
        log.info("업데이트 됐는지 확인 : " + result);
        log.info("=============================================================");
    }

    //===================================================================================================
    @Test
    void deleteComment() {
        // given
//        CreateCommReq createCommReq = new CreateCommReq();
//        createCommReq.setBno(10L);
//        createCommReq.setCWriter("writerD");
//        createCommReq.setCContent("to be deleted");
//        createCommReq.setCLikeCount(0);
//        Long cno = commentService.createComment(createCommReq).getCreateComm().getCno();
//
//        log.info("=============================================================");
//        log.info("댓글 생성 됐는지 확인 : " + createCommReq);
//        log.info("=============================================================");

        Long cno = 2L;
        var readComment = commentJpaRepository.findById(cno).orElseThrow();

        log.info("=============================================================");
        log.info("댓글 내용 확인 : " + readComment);
        log.info("=============================================================");

        DeleteCommReq deleteReq =DeleteCommReq.builder()
                .cno(cno)
                .build();

        // when
        DeleteCommRes result = commentService.deleteComment(deleteReq);

        log.info("=============================================================");
        log.info("삭제 결과 " + result);
        log.info("=============================================================");
    }
}
