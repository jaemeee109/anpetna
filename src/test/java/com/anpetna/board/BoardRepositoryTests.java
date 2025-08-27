package com.anpetna.board;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.repository.BoardJpaRepository;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;
import java.util.stream.IntStream;

@SpringBootTest // 메서드용 테스트 동작
@Log4j2 // 로그용
public class BoardRepositoryTests {
    // 영속성 계층에 테스트용

    @Autowired
    private BoardJpaRepository boardJpaRepository;

    //===================================================================================================
    @Test
    public void testCreateBoard() { // C 테스트
        IntStream.rangeClosed(1, 10).forEach(i -> { // i 변수에 1~10까지 10개의 정수를 반복해서 생성
            BoardEntity boardEntity = BoardEntity.builder()
                    .bWriter("작성자" + i)
                    .bTitle("제목 테스트" + i)
                    .bContent("내용 테스트" + i)
                    .bViewCount(i)
                    .bLikeCount(i)
                    .boardType(BoardType.FREE)
                    .noticeFlag(Boolean.FALSE)
                    .isSecret(Boolean.FALSE)
                    .build();

            BoardEntity result = boardJpaRepository.save(boardEntity);
            log.info("==============================================");
            log.info("저장된 게시물 출력 : " + result);
            log.info("==============================================");
        });
    }

    //===================================================================================================
    @Test
    public void testReadBoard() { // R 테스트
        Long bno = 2L; // bno 가 2번인 게시물 조회

        Optional<BoardEntity> result = boardJpaRepository.findById(bno);

        BoardEntity boardEntity = result.orElseThrow(); // 값이 있으면 넣어라
        log.info("==============================================");
        log.info(bno + "번 게시물이 존재합니다.");
        log.info("조회한 게시물 출력 : " + boardEntity);
        log.info("==============================================");

    }

    //===================================================================================================
    @Test
    public void testUpdateBoard() {// U 테스트
        Long bno = 5L; // bno 가 5번인 게시물 조회

        Optional<BoardEntity> result = boardJpaRepository.findById(bno); // bno 를 찾아서 result 에 넣는다.
        BoardEntity boardEntity = result.orElseThrow(); // 가져온 값이 있으면 boardEntity 타입 객체에 넣는다.

        log.info("==============================================");
        log.info(bno + "번 게시물이 존재합니다.");
        log.info("조회한 게시물 출력 : " + boardEntity);
        log.info("==============================================");

        boardEntity.setBTitle("수정 테스트 진행한 게시물 제목2");
        boardEntity.setBContent("수정 테스트 진행한 게시물 내용2");
        boardEntity.setIsSecret(Boolean.TRUE);
        boardEntity.setNoticeFlag(Boolean.TRUE);

        boardJpaRepository.save(boardEntity);

        log.info("==============================================");
        log.info(bno + "번 게시물을 수정했습니다");
        log.info("수정된 게시물 출력 : " + boardEntity);
        log.info("==============================================");

    }

    //===================================================================================================
    @Test
    public void testDeleteBoard() { // D 테스트
        Long bno = 5L; // // bno 가 5번인 게시물 조회

        boardJpaRepository.deleteById(bno);
    }
}
