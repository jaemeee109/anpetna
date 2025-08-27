package com.anpetna.member.controller;

import com.anpetna.ApiResult;
import com.anpetna.config.JwtProvider;
import com.anpetna.member.dto.deleteMember.DeleteMemberReq;
import com.anpetna.member.dto.deleteMember.DeleteMemberRes;
import com.anpetna.member.dto.joinMember.JoinMemberReq;
import com.anpetna.member.dto.joinMember.JoinMemberRes;
import com.anpetna.member.dto.modifyMember.ModifyMemberReq;
import com.anpetna.member.dto.modifyMember.ModifyMemberRes;
import com.anpetna.member.dto.readMemberAll.ReadMemberAllRes;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneReq;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneRes;
import com.anpetna.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/member")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    //등록
    @PostMapping("/join")
    public ApiResult<JoinMemberRes> join(@RequestBody JoinMemberReq joinMemberReq) throws MemberService.MemberIdExistException {

        var join = memberService.join(joinMemberReq);
        return new ApiResult<>(join);
    }
//=============================================
//    프론트에서 받아온 정보(요청DTO/Req)를 컨트롤러에서 서비스로 넘겨줌
//    서비스에서 DB에 저장(아이디는 중복이 되지 않게 검사필요)
//=========-===========


    //수정
    @PostMapping("/modify")
    @ResponseBody
    @Transactional
    public ApiResult<ModifyMemberRes> modify(
            @RequestBody ModifyMemberReq modifyMemberReq) throws MemberService.MemberIdExistException {

        var modify = memberService.modify(modifyMemberReq);
        return new ApiResult<>(modify);
    }
//===================================
//    프론트에서 수정해야 할 정보를 받아 비번,주소,이메일,반려동물유무,번호등 변경사항을 컨트롤러가 서비스로 넘겨주고
//    서비스에서 기타로 적는 창을 제외한 모든 건 null값이 들어갈 수 없게 하고 DB에 저장 저장된 정보들을 프론트에서 다시 확인 할 수 있게
//====================================


    //삭제
    @GetMapping("/delete")
    @ResponseBody
    @Transactional
    public ApiResult<DeleteMemberRes> delete(Authentication authentication)
            throws MemberService.MemberIdExistException {

        DeleteMemberReq deleteMemberReq = new DeleteMemberReq();
        deleteMemberReq.setMemberId(authentication.getName());

        var delete = memberService.delete(deleteMemberReq);
        return new ApiResult<>(delete);
    }
    //    ============================================
//    프론트에서 계정주/관리자가 삭제버튼을 누름
//    컨트롤러에서 그 계정의 아이디를 서비스로 넘겨줌
//    서비스에서 계정들 중 똑같은 아이디를 찾아 삭제
    //==============================================


    // 상세 조회: 관리자 또는 로그인한 본인만 접근
    @GetMapping({"/readOne", "/my_page/{memberId}"})
    @ResponseBody
    @Transactional(readOnly = true)
    public ApiResult<ReadMemberOneRes> readOne(
            @PathVariable(value = "memberId", required = false) String memberId,
            @AuthenticationPrincipal String me // 👈 문자열 principal 그대로 주입
    ) {
        String target = (memberId == null || memberId.isBlank()) ? me : memberId;

        ReadMemberOneReq req = new ReadMemberOneReq();
        req.setMemberId(target);

        var readOne = memberService.readOne(req); // Service에서 @PreAuthorize
        return new ApiResult<>(readOne);
    }


//===========================================
//(관리자가 볼 때는 프론트에 있는 전체보기에서 모든 계정들 중 한 계정을 눌렀을 때 정보가 보여야 함)(사용자가 볼 때는 내 정보들을 (마이페이지처럼) 가입했을 때 입력한 정보들이 보여야 함/수정페이지는 따로)
//            (컨트롤러에서는 서비스로 넘겨 서비스 계층에는 계정들중 한 계정을 찾아 그 계정의 정보를 불러옴/서비스에서 관리자가 볼 때와 사용자가 볼 때 똑같이 해야 할지 생각)
//            -------
//    관리자가 상세페이지로 들어오는 URL과 로그인 후 마이페이지로 들어오는 URL을 컨트롤러에 작성(Get)
//    서비스에선 따로 검사없이 한 아이디에 대한 정보를 DB에서 불러옴
//    그 정보들을 프론트로 나오게 함
//+ 다른 사용자가 볼 수 있게 하는 컨트롤러는 다르게 만들어야 함
//    여기서는 검증이 필요(회원이 회원을 볼 수 있게 + 내가 내 프로필을 볼 수 없게-마이페이지랑 같음)
//    프론트에서 보여지는 것도 일정 정보만 볼 수 있게 해야 함
    //================================================


    // 조회(전체): 관리자만 접근
    @GetMapping("/readAll")
    @ResponseBody
    public ApiResult<List<ReadMemberAllRes>> memberReadAll() {
        var readAll = memberService.memberReadAll();
        return new ApiResult<>(readAll);
    }
//=======================================
//    관리자만 볼 수 있는 페이지임
//    컨트롤러에서 서비스로 바로 넘김(Get)
//    서비스에서는 DB에서 전체 리스트를 가져옴 가져온 리스트를 프론트로 넘김
//=========================================



//    DTO에 엔티티로 변환하는 메서드를 만듬/필요에 의해 사용
//    흔한 예외/HTTP 응답 매핑 (실무에서 처리할 것)
//400 Bad Request — 바디 구조/타입 불일치, 유효성 실패(@Valid)
//401 Unauthorized — 인증 필요(로그인 안됨)
//403 Forbidden — 권한 없음(작성자가 아닌 사람이 수정 시)
//404 Not Found — 해당 게시글이 없음
//409 Conflict — 동시성 충돌(optimistic lock 실패)
//500 Internal Server Error — 기타 서버 오류
//→ @ControllerAdvice로 예외를 잡아 일관된 ApiResult 에러 포맷으로 변환
}

