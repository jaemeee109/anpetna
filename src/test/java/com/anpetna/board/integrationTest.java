package com.anpetna.board;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createComment.CreateCommReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteComment.DeleteCommReq;
import com.anpetna.board.dto.readComment.ReadCommReq;
import com.anpetna.board.dto.readComment.ReadCommRes;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateComment.UpdateCommReq;
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.board.repository.CommentJpaRepository;
import com.anpetna.board.service.BoardService;
import com.anpetna.board.service.CommentService;
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.joinMember.JoinMemberReq;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.member.service.MemberService;
import lombok.extern.log4j.Log4j2;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.junit.jupiter.api.DisplayName;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Log4j2
public class integrationTest {

    @Autowired
    MemberService memberService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    BoardService boardService;

    @Autowired
    CommentService commentService;

    @Autowired
    private CommentJpaRepository commentJpaRepository;

    @Autowired
    private BoardJpaRepository boardJpaRepository;


    private void loginAs(String memberId) {
        var auth = new UsernamePasswordAuthenticationToken(memberId, "N/A", List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void logout() {
        SecurityContextHolder.clearContext();
    }

    // member db에 더미데티어 10개 생성
    @Test
    public void joinTest() {
        // 1) 실제 서비스로 10명 가입 (중복이면 건너뛰기)
        IntStream.rangeClosed(1, 10).forEach(i -> {
            String idx2 = String.format("%02d", i);     // 01~05
            String id = "user" + idx2;                  // user01~user05
            String rawPw = "12345678" + i;              // 각자 다른 비번

            var req = JoinMemberReq.builder()
                    .memberId(id)
                    .memberPw(rawPw)
                    .memberName("testUser" + idx2)
                    .memberBirthY("191" + i)               // 예: 1911~1915
                    .memberBirthM(idx2)                    // 01~05
                    .memberBirthD("01")
                    .memberBirthGM("양력")
                    .memberGender("M")
                    .memberHasPet("Y")
                    .memberPhone("010-1234-56" + idx2)
                    .smsStsYn("Y")
                    .memberEmail("test" + idx2 + "@test.com")
                    .emailStsYn("N")
                    .memberRoadAddress("경기도")
                    .memberZipCode("000" + idx2)
                    .memberDetailAddress("수원시")
                    .memberRole(MemberRole.USER)
                    .social(false)
                    .etc("반려견 " + i + "마리 키우는 중")
                    .memberFileImage(null)
                    .build();

            log.info("=======================================================");
            log.info("가입된 회원 리스트 : ");
            log.info(req.toString());
            log.info("=======================================================");

            try {
                memberService.join(req); // 실제 저장
            } catch (MemberService.MemberIdExistException e) {
                // 이미 있으면 재실행 고려해서 통과
                log.info("=====================================");
                log.info("이미 존재: " + id + " -> 통과");
                log.info("=====================================");
            }
        });

        // 2) DB에서 실제로 조회해 검증
        IntStream.rangeClosed(1, 10).forEach(i -> {
            String idx2 = String.format("%02d", i);
            String id = "user" + idx2;
            String rawPw = "12345678" + i;

            MemberEntity e = memberRepository.findById(id)
                    .orElseThrow(() -> new AssertionError("가입 결과가 없습니다: " + id));

            // 비밀번호가 인코딩되어 저장되었는지
            assertThat(passwordEncoder.matches(rawPw, e.getMemberPw()))
                    .as("password encoded & matches for " + id)
                    .isTrue();

            // 나머지 주요 필드
            assertThat(e.getMemberId()).isEqualTo(id);
            assertThat(e.getMemberName()).isEqualTo("testUser" + idx2);
            assertThat(e.getMemberEmail()).isEqualTo("test" + idx2 + "@test.com");
            assertThat(e.getMemberHasPet()).isEqualTo("Y");

            // 기본 롤을 서비스에서 USER 로 세팅한다면:
            assertThat(e.getMemberRole()).isEqualTo(MemberRole.USER);
        });
    }

    // ===== Board: Create =============================================================================================
    @Test
    @DisplayName("[BOARD][CREATE] 회원이면 글 작성 성공")
    void board_create_success_when_member() {
        loginAs("user02");

        var req = CreateBoardReq.builder()
                .bTitle("[통합] 회원 글쓰기 성공")
                .bContent("내용입니다")
                .boardType(BoardType.FREE)
                .noticeFlag(Boolean.FALSE)
                .isSecret(Boolean.FALSE)
                .build();

        log.info("board_create_success_when_member 메서드 실행 : " + req.toString());

        var res = boardService.createBoard(req, null);

        log.info("board_create_success_when_member 메서드 실행 : " + res.toString());

        assertThat(res).isNotNull();
        assertThat(res.getBno()).isNotNull();          // ← 평탄화
        assertThat(res.getBWriter()).isEqualTo("user02");

        logout();
    }

    @Test
    @DisplayName("[BOARD][CREATE] 비회원/비등록 아이디면 글 작성 실패")
    void board_create_fail_when_non_member() {
        // DB에 없는 아이디로 로그인 흉내 => 서비스에서 회원 조회 실패 → AccessDeniedException
        loginAs("ghost");

        var req = CreateBoardReq.builder()
                .bTitle("[통합] 실패 케이스")
                .bContent("비회원은 실패")
                .boardType(BoardType.FREE)
                .noticeFlag(Boolean.FALSE)
                .isSecret(Boolean.FALSE)
                .build();

        var result = assertThatThrownBy(() -> boardService.createBoard(req, null)).isInstanceOf(AccessDeniedException.class);
        log.info(req.getBWriter());
        log.info(result.getWritableAssertionInfo().toString());

        logout();
    }

    // ===== Board: Read ALL (목록) ====================================================================================
    @Test
    @DisplayName("[BOARD][READ-ALL] 회원이면 전체 조회 성공")
    void board_read_all_success_when_member() {
        // db에 저장되어있는 글 목록 가져옴
        loginAs("user03");

        PageRequestDTO listReq = PageRequestDTO.builder()
                .page(1)
                .size(10)
                .build(); // 정렬은 서비스에서 createDate DESC로 처리 중

        PageResponseDTO<BoardDTO> listRes = boardService.readAllBoard(listReq);

        log.info(listRes.getDtoList().toString());

        assertThat(listRes).isNotNull();
        assertThat(listRes.getDtoList()).isNotEmpty();

        logout();
    }

    @Test
    @DisplayName("[BOARD][READ-ALL] 비회원/비등록 아이디어도 전체 조회 가능")
    void board_read_all_when_non_member() {
        logout();
        PageRequestDTO listReq = PageRequestDTO.builder()
                .page(1)
                .size(10)
                .build(); // 정렬은 서비스에서 createDate DESC로 처리 중

        PageResponseDTO<BoardDTO> listRes = boardService.readAllBoard(listReq);

        log.info(listRes.getDtoList().toString());

        assertThat(listRes).isNotNull();
        assertThat(listRes.getDtoList()).isNotEmpty();
    }

    // ===== Board: Read ONE (조회수 증가) ==============================================================================
    @Test
    @DisplayName("[BOARD][READ-ONE] 회원이면 상세 조회 성공 & 조회수 증가")
    void board_read_one_success_viewcount_increase_when_member() {
        Long bno = 16L;

        // 다른 회원으로 두 번 읽어보며 +1 확인
        loginAs("user01");

        boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build());
        int firstCount = boardJpaRepository.findById(bno).orElseThrow().getBViewCount();

        boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build());
        int secondCount = boardJpaRepository.findById(bno).orElseThrow().getBViewCount();

        assertThat(secondCount).isEqualTo(firstCount + 1);

        logout();
    }

    @Test
    @DisplayName("[BOARD][READ-ONE] 비회원/비등록 아이디면 상세 조회 실패")
    void board_read_one_fail_when_non_member() {

        Long bno = 19L;

        loginAs("user199");
        assertThatThrownBy(() -> boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build()))
                .isInstanceOf(AccessDeniedException.class);
        logout();
    }

    // ===== Board: Update =============================================================================================
    @Test
    @DisplayName("[BOARD][UPDATE] 작성자 본인이면 수정 성공")
    void board_update_success_by_writer() {
        // user01로 로그인
        loginAs("user01");
        Long bno = 19L;

        // (선택) 사전 확인: 정말 작성자가 user01인지
        var before = boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build());

        assertThat(before.getBWriter())
                .as("bno=19의 작성자가 user01이어야 테스트 의도가 맞음")
                .isEqualTo("user01");

        var upReq = UpdateBoardReq.builder()
                .bno(bno)
                .bTitle("[수정 후] 타이틀_from_test")
                .bContent("수정 후 내용_from_test")
                .build();

        // when
        var upRes = boardService.updateBoard(upReq, null, null, null);

        // then
        assertThat(upRes).isNotNull();
        assertThat(upRes.getBno()).isEqualTo(bno);     // ← 평탄화
        assertThat(upRes.getBTitle()).contains("수정 후");

        logout();
    }

    @Test
    @DisplayName("[BOARD][UPDATE] 작성자 아니면 수정 실패")
    void board_update_fail_by_not_writer() {
        // user01이 글 작성
        loginAs("user01");
        Long bno = 15L;

        // (선택) 사전 확인: bno=3은 user01 글이 아니어야 함
        var before = boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build());

        assertThat(before.getBWriter())
                .as("bno=15의 작성자는 user01이 아니어야 테스트 의도가 맞음")
                .isNotEqualTo("user01");

        var upReq = UpdateBoardReq.builder()
                .bno(bno)
                .bTitle("[수정 시도] 타이틀_from_test")
                .bContent("수정 시도 내용_from_test")
                .build();

        // when & then
        assertThatThrownBy(() -> boardService.updateBoard(upReq, null, null, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("본인 글만 수정할 수 있습니다.");

        logout();
    }

    // ===== Board: Delete =============================================================================================
    @Test
    @DisplayName("[BOARD][DELETE] 작성자 본인이면 삭제 성공")
    void board_delete_success_by_writer() {
        loginAs("user01");
        Long bno = 18L;

        // (선택) 사전 확인: 정말 작성자가 user01인지
        var before = boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build());

        assertThat(before.getBWriter())
                .as("bno=18의 작성자가 user01이어야 테스트 의도가 맞음")
                .isEqualTo("user01");

        var delRes = boardService.deleteBoard(DeleteBoardReq.builder().bno(bno).build());

        assertThat(delRes).isNotNull();
        assertThat(delRes.getBno()).isEqualTo(bno);

        logout();
    }

    @Test
    @DisplayName("[BOARD][DELETE] 작성자 아니면 삭제 실패")
    void board_delete_fail_by_not_writer() {
        loginAs("user01");
        Long bno = 15L;

        // (선택) 사전 확인: bno=3은 user01 글이 아니어야 함
        var before = boardService.readOneBoard(ReadOneBoardReq.builder().bno(bno).build());

        assertThat(before.getBWriter())
                .as("bno=15의 작성자는 user01이 아니어야 테스트 의도가 맞음")
                .isNotEqualTo("user01");

        assertThatThrownBy(() -> boardService.deleteBoard(DeleteBoardReq.builder().bno(bno).build()))
                .isInstanceOf(AccessDeniedException.class);

        logout();
    }

    // ===== Comment: Create ===========================================================================================
    @Test
    @DisplayName("[COMMENT][CREATE] 회원이면 댓글 작성 성공")
    void comment_create_success_when_member() {
        // 댓글 대상 글
        Long bno = 20L;

        // user03이 댓글 작성
        loginAs("user01");
        var cReq = CreateCommReq.builder()
                .bno(bno)
                .cContent("user01의 댓글")
                .build();

        var cRes = commentService.createComment(cReq);

        log.info("=======================================================");
        log.info("저장된 댓글 : " + cRes);

        assertThat(cRes).isNotNull();
        assertThat(cRes.getCreateComm().getCno()).isNotNull();
        assertThat(cRes.getCreateComm().getBno()).isEqualTo(bno);
        assertThat(cRes.getCreateComm().getCWriter()).isEqualTo("user01");

        logout();
    }


    @Test
    @DisplayName("[COMMENT][CREATE] 비회원/비등록 아이디면 댓글 작성 실패")
    void comment_create_fail_when_non_member() {
        Long bno = 20L;

        loginAs("ghost");
        var cReq = CreateCommReq.builder()
                .bno(bno)
                .cContent("난 비회원")
                .build();

        assertThatThrownBy(() -> commentService.createComment(cReq))
                .isInstanceOf(AccessDeniedException.class);

        logout();
    }

    // ===== Comment: READ (목록) ======================================================================================
    @Test
    @DisplayName("[COMMENT][READ] 회원이면 댓글 목록 조회 성공")
    void comment_read_success_when_member() {

        Long bno = 20L;

        loginAs("user02");

        // ReadCommReq 는 @Builder 없이 @Getter/@Setter 만 있으므로 setter 로 채운다
        ReadCommReq rReq = new ReadCommReq();
        rReq.setBno(bno);
        rReq.setPage(1);
        rReq.setSize(10);
        rReq.setSortBy("cno"); // 서비스에서 getPageable(sort...)에 넘겨서 정렬

        ReadCommRes rRes = commentService.readComment(rReq);

        log.info("=======================================");
        log.info("댓글 목록 : " + rRes);

        assertThat(rRes).isNotNull();
        assertThat(rRes.getPage().getDtoList()).isNotEmpty();
        logout();
    }

    // ===== Comment: Update ===========================================================================================
    @Test
    @DisplayName("[COMMENT][UPDATE] 작성자 본인이면 수정 성공")
    void comment_update_success_by_writer() {

        Long cno = 6L;

        loginAs("user01");

        var upReq = UpdateCommReq.builder()
                .cno(cno)
                .cContent("수정 후 댓글")
                .build();

        var upRes = commentService.updateComment(upReq);

        assertThat(upRes).isNotNull();
        assertThat(upRes.getUpdateComment().getCno()).isEqualTo(cno);
        assertThat(upRes.getUpdateComment().getCContent()).contains("수정 후");

        logout();
    }

    @Test
    @DisplayName("[COMMENT][UPDATE] 작성자 아니면 수정 실패")
    void comment_update_fail_by_not_writer() {

        Long cno = 3L;

        loginAs("user02");

        var upReq = UpdateCommReq.builder()
                .cno(cno)
                .cContent("남의 댓글 수정 시도")
                .build();

        assertThatThrownBy(() -> commentService.updateComment(upReq))
                .isInstanceOf(AccessDeniedException.class);

        logout();
    }

    // ===== Comment: Delete ==========================================================================================
    @Test
    @DisplayName("[COMMENT][DELETE] 작성자 본인이면 삭제 성공")
    void comment_delete_success_by_writer() {
        Long cno = 5L;

        loginAs("user07");

        var delRes = commentService.deleteComment(DeleteCommReq.builder().cno(cno).build());

        assertThat(delRes).isNotNull();
        assertThat(delRes.getDeleteComment().getCno()).isEqualTo(cno);

        logout();
    }

    @Test
    @DisplayName("[COMMENT][DELETE] 작성자 아니면 삭제 실패")
    void comment_delete_fail_by_not_writer() {
        Long cno = 6L;

        // user03이 삭제 시도 → 실패
        loginAs("user03");
        assertThatThrownBy(() -> commentService.deleteComment(DeleteCommReq.builder().cno(cno).build()))
                .isInstanceOf(AccessDeniedException.class);

        logout();
    }

    // ===== Comment: LikeComment ======================================================================================
    @Test
    @DisplayName("[COMMENT][LikeCount] 댓글 좋아요 누르면 좋아요수 증가")
    void comment_like_success_by_user() {
        // given
        Long cno = 6L;

        loginAs("user10");

        var beforeEntity = commentJpaRepository.findById(cno).orElseThrow();
        Integer beforeLike = beforeEntity.getCLikeCount() == null ? 0 : beforeEntity.getCLikeCount();

        // 작성자와 다른지 안전 확인  👇 여기만 수정!
        assertThat(beforeEntity.getCWriter())
                .as("테스트 전제: 좋아요 누르는 유저가 작성자가 아니어야 함")
                .isNotEqualTo("user10");

        // when
        var res = commentService.likeComment(cno);

        // then (응답 DTO 검증)
        assertThat(res).isNotNull();
        assertThat(res.getUpdateComment().getCno()).isEqualTo(cno);
        assertThat(res.getUpdateComment().getCLikeCount()).isEqualTo(beforeLike + 1);

        // 그리고 실제 DB 반영 확인
        var afterEntity = commentJpaRepository.findById(cno).orElseThrow();
        Integer afterLike = afterEntity.getCLikeCount() == null ? 0 : afterEntity.getCLikeCount();

        assertThat(afterLike).isEqualTo(beforeLike + 1);

        logout();
    }
}
