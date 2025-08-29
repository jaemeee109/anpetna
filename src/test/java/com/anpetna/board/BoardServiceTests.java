package com.anpetna.board;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
@Rollback(false)
@Log4j2
public class BoardServiceTests {

/*
    @Autowired
    private BoardService boardService;

    @Autowired
    private BoardJpaRepository boardJpaRepository;

    // 25.08.27 필드 추가
    @Autowired
    MemberRepository memberRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    private BoardEntity savedBoard;

    // 25.08.27 추가 로그인 헬퍼
    private void loginAs(String memberId) {
        var auth = new UsernamePasswordAuthenticationToken(memberId, "N/A", java.util.List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @BeforeEach
        //테스트용
    void setUp() {
        // 테스트용 회원 보장 후 로그인 25.08.27 추가
        if (!memberRepository.existsById("admin")) {
            memberRepository.save(
                    MemberEntity.builder()
                            .memberId("admin")
                            .memberPw(passwordEncoder.encode("pw"))
                            .memberName("admin")
                            .memberRole(MemberRole.USER)
                            .build()
            );
        }
        loginAs("admin");

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

        // 변경: files 파라미터 추가 + 평탄화된 응답 사용 25.08.27 추가
        CreateBoardRes created = boardService.createBoard(req, null); // ← 여기
        savedBoard = boardJpaRepository.findById(created.getBno()).orElseThrow();

        savedBoard.setBViewCount(0);
        boardJpaRepository.flush();
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

        // 변경: files 파라미터 추가 + 평탄화 응답 사용 25.08.27 밑에 내용 수정
        CreateBoardRes res = boardService.createBoard(req, null); // ← 여기

        assertNotNull(res.getBno());
        assertEquals("게시글 생성 테스트", res.getBTitle());
        assertEquals(2, res.getImages().size());
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

        // 변경: 추가 파라미터 null 로 전달 25.08.27 추가
        UpdateBoardRes updateRes = boardService.updateBoard(updateReq, null, null, null); // ← 여기

        /*UpdateBoardRes updateRes = boardService.updateBoard(updateReq);
        BoardEntity updated = updateRes.getUpdateBoard();*/

        assertEquals("수정 제목", updateRes.getBTitle());
        assertEquals("수정 내용", updateRes.getBContent());
        assertEquals(1, updateRes.getImages().size());
        assertEquals("img3.png", updateRes.getImages().get(0).getFileName());
    }

    @Test
    void testLike() {
        // DB에 이미 존재하는 게시글 번호
        Long existingBno = 2L;

        // DB에서 게시글 조회
        BoardEntity board = boardJpaRepository.findById(existingBno)
                .orElseThrow(() -> new RuntimeException("존재하는 게시글 없음"));

        int beforeLike = board.getBLikeCount() != null ? board.getBLikeCount() : 0;

        // 25.08.27 추가
        UpdateBoardRes res = boardService.likeBoard(existingBno);

        /*// 좋아요
        UpdateBoardRes res = boardService.likeBoard(existingBno);
        BoardEntity likedBoard = res.getUpdateBoard();*/

        assertEquals(beforeLike + 1, res.getBLikeCount());
    }

    @Test
    void testDeleteExistingBoard() {
        Long existingBno = 3L; // DB에 존재하는 게시글 번호

        DeleteBoardReq delReq = DeleteBoardReq.builder().bno(existingBno).build();
        boardService.deleteBoard(delReq);

        assertFalse(boardJpaRepository.findById(existingBno).isPresent());
    }
*/

}
