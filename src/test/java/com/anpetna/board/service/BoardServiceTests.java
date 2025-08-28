package com.anpetna.board.service;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.constant.BoardType;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.coreDto.ImageDTO;
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
@Rollback(false)
@Log4j2
public class BoardServiceTests {

    @Autowired
    private BoardService boardService;

    @Autowired
    private BoardJpaRepository boardJpaRepository;

    private BoardEntity savedBoard;

   @BeforeEach //테스트용
    void setUp() {
        // 게시글 + 이미지 생성
        List<ImageDTO> imageList = List.of(
                ImageDTO.builder().fileName("img1.png").url("http://example.com/img1.png").sortOrder(1).build(),
                ImageDTO.builder().fileName("img2.png").url("http://example.com/img2.png").sortOrder(2).build()
        );

        CreateBoardReq req = CreateBoardReq.builder()
                .bWriter("admin")
                .bTitle("통합 테스트 게시글")
                .bContent("테스트 내용")
                .boardType(BoardType.NOTICE)
                .noticeFlag(true)
                .isSecret(false)
                .images(imageList)
                .build();

/*        savedBoard = boardService.createBoard(req).getCreateBoard();

        // 초기 조회수 0으로 세팅
        savedBoard.setBViewCount(0);
        boardJpaRepository.flush();*/
    }

    @Test
    void testCreate() {
        List<ImageDTO> imageList = List.of(
                ImageDTO.builder().fileName("img1.png").url("http://example.com/img1.png").sortOrder(1).build(),
                ImageDTO.builder().fileName("img2.png").url("http://example.com/img2.png").sortOrder(2).build()
        );

        CreateBoardReq req = CreateBoardReq.builder()
                .bWriter("tester")
                .bTitle("게시글 생성 테스트")
                .bContent("테스트 내용")
                .boardType(BoardType.NOTICE)
                .noticeFlag(true)
                .isSecret(false)
                .images(imageList)
                .build();

/*        CreateBoardRes res = boardService.createBoard(req);
        BoardEntity created = res.getCreateBoard();

        assertNotNull(created.getBno());
        assertEquals("게시글 생성 테스트", created.getBTitle());
        assertEquals(2, created.getImages().size());*/
    }

    @Test
    void testReadOne() {
        // 상세 조회 (조회수 증가 포함)
        int beforeView = savedBoard.getBViewCount();
        ReadOneBoardRes res = boardService.readOneBoard(
                ReadOneBoardReq.builder().bno(savedBoard.getBno()).build()
        );
        BoardEntity board = boardJpaRepository.findById(res.getBno()).orElseThrow();

        assertEquals("통합 테스트 게시글", board.getBTitle());
        assertEquals(savedBoard.getBno(), res.getBno());
        assertEquals(2, board.getImages().size());
        assertEquals("img1.png", board.getImages().get(0).getFileName());
        assertEquals("img2.png", board.getImages().get(1).getFileName());

        // 조회수 증가 확인
        assertEquals(beforeView + 1, board.getBViewCount());
    }

    @Test
    void testReadAll() {

        PageRequestDTO pageRequestDTO = new PageRequestDTO();
        pageRequestDTO.setPage(1);
        pageRequestDTO.setSize(5);
        pageRequestDTO.setType("t");       // 제목 검색
        pageRequestDTO.setKeyword("테스트"); // 검색 키워드

        // 2. 서비스 호출
        PageResponseDTO<BoardDTO> page = boardService.readAllBoard(pageRequestDTO);

        // 3. 기본 검증
        assertNotNull(page);
        assertTrue(page.getDtoList().size() <= pageRequestDTO.getSize());
        assertTrue(page.getTotal() >= page.getDtoList().size());

        // 4. 검색된 결과 검증
        page.getDtoList().forEach(dto -> {
            assertNotNull(dto.getBno());
            assertNotNull(dto.getBTitle());
            assertTrue(dto.getBTitle().contains("테스트"),
                    "제목에 '테스트'가 포함되어야 함: " + dto.getBTitle());
        });
    }


    @Test
    void testUpdateExistingBoard() {
        // DB에 이미 존재하는 게시글 번호
        Long existingBno = 1L;

        // DB에서 게시글 조회
        BoardEntity board = boardJpaRepository.findById(existingBno)
                .orElseThrow(() -> new RuntimeException("존재하는 게시글 없음"));

        // 새로운 이미지로 수정
        List<ImageDTO> updatedImages = List.of(
                ImageDTO.builder().fileName("img3.png")
                        .url("http://example.com/img3.png")
                        .sortOrder(1)
                        .build()
        );

        UpdateBoardReq updateReq = UpdateBoardReq.builder()
                .bno(existingBno)
                .bTitle("수정 제목")
                .bContent("수정 내용")
                .images(updatedImages)
                .build();

/*        UpdateBoardRes updateRes = boardService.updateBoard(updateReq);
        BoardEntity updated = updateRes.getUpdateBoard();

        assertEquals("수정 제목", updated.getBTitle());
        assertEquals("수정 내용", updated.getBContent());
        assertEquals(1, updated.getImages().size());
        assertEquals("img3.png", updated.getImages().get(0).getFileName());*/
    }

    @Test
    void testLike() {
        // DB에 이미 존재하는 게시글 번호
        Long existingBno = 2L;

        // DB에서 게시글 조회
        BoardEntity board = boardJpaRepository.findById(existingBno)
                .orElseThrow(() -> new RuntimeException("존재하는 게시글 없음"));

        int beforeLike = board.getBLikeCount() != null ? board.getBLikeCount() : 0;

/*        // 좋아요
        UpdateBoardRes res = boardService.likeBoard(existingBno);
        BoardEntity likedBoard = res.getUpdateBoard();

        assertEquals(beforeLike + 1, likedBoard.getBLikeCount());*/
    }

    @Test
    void testDeleteExistingBoard() {
        Long existingBno = 3L; // DB에 존재하는 게시글 번호

        DeleteBoardReq delReq = DeleteBoardReq.builder().bno(existingBno).build();
        boardService.deleteBoard(delReq);

        assertFalse(boardJpaRepository.findById(existingBno).isPresent());
    }

}
