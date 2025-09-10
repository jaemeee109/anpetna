package com.anpetna.board.repository;

import com.anpetna.board.domain.CommentEntity;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Log4j2
public class CommentRepositoryTests {

    @Autowired
    private CommentJpaRepository commentJpaRepository;

    @Autowired
    private BoardJpaRepository boardJpaRepository;

    //===================================================================================================
    @Test
    public void testCreateComment() { // C 테스트

        Long bno = 7L;

        // 1) 존재하지 않으면: 예외가 나는 것이 '성공' 조건 -> 여기서 끝
        if (!boardJpaRepository.existsById(bno)) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
                log.info("==============================================");
                log.info("게시물 {} 는 존재하지 않습니다. 예외를 던집니다.", bno);
                log.info("==============================================");
                throw new IllegalArgumentException("존재하지 않는 게시물입니다. (bno=" + bno + ")");
            });
            assertThat(ex.getMessage()).contains("존재하지 않는 게시물입니다.", "bno=" + bno);
            return; // 없을 땐 여기서 테스트 종료
        }

        // 2) 존재하면: 정상 흐름 진행 (댓글 2개 생성)
        var boardEntity = boardJpaRepository.getReferenceById(bno);

        IntStream.rangeClosed(1, 2).forEach(i -> { // i 변수에 1~2까지 2개의 정수를 반복해서 생성
            CommentEntity commentEntity = CommentEntity.builder()
                    .board(boardEntity)
                    .cContent("내용 테스트" + i)
                    .cWriter("작성자" + i)
                    .cLikeCount(i)
                    .build();

            CommentEntity result = commentJpaRepository.save(commentEntity);

            log.info("==============================================");
            log.info("저장된 게시물 출력 : " + result);
            log.info("==============================================");
        });
    }

    //===================================================================================================
    @Test
    public void testReadComment() { // R 테스트

        Long cno = 5L;

        // 1) 존재하지 않으면: 예외가 나는 것이 '성공' 조건 -> 여기서 끝
        if (!commentJpaRepository.existsById(cno)) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
                log.info("==============================================");
                log.info("댓글이 존재 하지 않습니다.", cno);
                log.info("==============================================");
                throw new IllegalArgumentException("존재하지 않는 댓글입니다.. (cno=" + cno + ")");
            });
            assertThat(ex.getMessage()).contains("존재하지 않는 댓글입니다.", "cno=" + cno);
            return; // 없을 땐 여기서 테스트 종료
        }

        Optional<CommentEntity> result = commentJpaRepository.findById(cno);

        CommentEntity commentEntity = result.orElseThrow(); // 값이 있으면 넣어라
        log.info("==============================================");
        log.info("조회한 게시물의 댓글 출력 : " + commentEntity);
        log.info("==============================================");

    }

    //===================================================================================================
    @Test
    @Transactional
    public void findByBoard_Bno() { // 특정 게시물에 있는 댓글 R 테스트

        Long bno = 7L;

        // 1) 존재하지 않으면: 예외가 나는 것이 '성공' 조건 -> 여기서 끝
        if (!boardJpaRepository.existsById(bno)) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
                log.info("==============================================");
                log.info("게시물이 존재 하지 않습니다.", bno);
                log.info("==============================================");
                throw new IllegalArgumentException("존재하지 않는 댓글입니다.. (bno=" + bno + ")");
            });
            assertThat(ex.getMessage()).contains("존재하지 않는 댓글입니다.", "bno=" + bno);
            return; // 없을 땐 여기서 테스트 종료
        }

        var page = commentJpaRepository.findByBoard_Bno(bno, PageRequest.of(0, 10,
                Sort.by("cno").descending()));

        log.info("bno={}의 댓글 수 = {}", bno, page.getTotalElements());
        page.getContent().forEach(c
                -> log.info("cno={}, content={}, writer={}", c.getCno(), c.getCContent(), c.getCWriter())
        );
    }

    //===================================================================================================
    @Test
    public void testUpdateComment() { // U 테스트

        Long cno = 2L;

        // 1) 존재하지 않으면: 예외가 나는 것이 '성공' 조건 -> 여기서 끝
        if (!commentJpaRepository.existsById(cno)) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
                log.info("==============================================");
                log.info("댓글이 존재 하지 않습니다.", cno);
                log.info("==============================================");
                throw new IllegalArgumentException("존재하지 않는 댓글입니다.. (cno=" + cno + ")");
            });
            assertThat(ex.getMessage()).contains("존재하지 않는 댓글입니다.", "cno=" + cno);
            return; // 없을 땐 여기서 테스트 종료
        }

        Optional<CommentEntity> result = commentJpaRepository.findById(cno);
        CommentEntity commentEntity = result.orElseThrow();

        log.info("==============================================");
        log.info(cno + "번 댓글이 존재합니다.");
        log.info("조회한 댓글 출력 : " + commentEntity);
        log.info("==============================================");


        commentEntity.setCContent("수정 테스트 진행한 댓글 내용34");
        commentJpaRepository.save(commentEntity);

        log.info("==============================================");
        log.info(cno + "번 게시물을 수정했습니다");
        log.info("수정된 게시물 출력 : " + commentEntity);
        log.info("==============================================");

    }

    //===================================================================================================
    @Test
    public void testDeleteComment() { // D 테스트

        Long cno = 1L;

        // 1) 존재하지 않으면: 예외가 나는 것이 '성공' 조건 -> 여기서 끝
        if (!commentJpaRepository.existsById(cno)) {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
                log.info("==============================================");
                log.info("댓글이 존재 하지 않습니다.", cno);
                log.info("==============================================");
                throw new IllegalArgumentException("존재하지 않는 댓글입니다.. (cno=" + cno + ")");
            });
            assertThat(ex.getMessage()).contains("존재하지 않는 댓글입니다.", "cno=" + cno);
            return; // 없을 땐 여기서 테스트 종료
        }
        commentJpaRepository.deleteById(cno);
    }
}
