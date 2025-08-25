package com.anpetna.member.service;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.MemberDTO;
import com.anpetna.member.dto.deleteMember.DeleteMemberReq;
import com.anpetna.member.dto.deleteMember.DeleteMemberRes;
import com.anpetna.member.dto.joinMember.JoinMemberReq;
import com.anpetna.member.dto.joinMember.JoinMemberRes;
import com.anpetna.member.dto.loginMember.LoginMemberReq;
import com.anpetna.member.dto.loginMember.LoginMemberRes;
import com.anpetna.member.dto.modifyMember.ModifyMemberReq;
import com.anpetna.member.dto.modifyMember.ModifyMemberRes;
import com.anpetna.member.dto.readMemberAll.ReadMemberAllReq;
import com.anpetna.member.dto.readMemberAll.ReadMemberAllRes;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneReq;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneRes;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

public interface MemberService extends UserDetailsService {

    JoinMemberRes join(JoinMemberReq joinMemberReq) throws MemberIdExistException;

    ReadMemberOneRes readOne(ReadMemberOneReq readMemberOneReq);

    List<ReadMemberAllRes> memberReadAll();

    ModifyMemberRes modify(ModifyMemberReq modifyMemberReq) throws MemberIdExistException;

    DeleteMemberRes delete(DeleteMemberReq deleteMemberReq) throws MemberIdExistException;

    LoginMemberRes login(LoginMemberReq loginMemberReq) throws MemberIdExistException;

    static class MemberIdExistException extends Exception {

    }

}
