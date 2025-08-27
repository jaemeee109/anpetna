package com.anpetna.member.service;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.deleteMember.DeleteMemberReq;
import com.anpetna.member.dto.deleteMember.DeleteMemberRes;
import com.anpetna.member.dto.joinMember.JoinMemberReq;
import com.anpetna.member.dto.joinMember.JoinMemberRes;
import com.anpetna.member.dto.modifyMember.ModifyMemberReq;
import com.anpetna.member.dto.modifyMember.ModifyMemberRes;
import com.anpetna.member.dto.readMemberAll.ReadMemberAllRes;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneReq;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneRes;
import com.anpetna.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.java.Log;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.parameters.P;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RequiredArgsConstructor
@Service
@Transactional
@Log
public class MemberServiceImpl implements MemberService {

    private final ModelMapper modelMapper;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    // final -> 생성자를 만들고 주입

    @Override
    public JoinMemberRes join(JoinMemberReq joinMemberReq) throws MemberIdExistException{

        String memberId = joinMemberReq.getMemberId();

        boolean exist = memberRepository.existsById(memberId);

        if (exist){
            throw new MemberIdExistException();
        }

        MemberEntity member = modelMapper.map(joinMemberReq, MemberEntity.class);
        member.setMemberPw(passwordEncoder.encode(joinMemberReq.getMemberPw()));
        member.setMemberRole(MemberRole.USER);

        memberRepository.save(member);
        return JoinMemberRes.from(member);
    }

    @Override
    public UserDetails loadUserByUsername(String memberId) throws UsernameNotFoundException {
        MemberEntity member = memberRepository.findById(memberId).orElse(null);

        if (member == null) {
            throw new UsernameNotFoundException(memberId);
        }

        return User.builder()
                .username(member.getMemberId())
                .password(member.getMemberPw())
                .roles(member.getMemberRole().name())
                .build();
    }

    @Override
    @PreAuthorize("hasRole('ADMIN') or (#p0 != null and #p0.memberId == authentication.name)")
    @Transactional(readOnly = true)
    public ReadMemberOneRes readOne(ReadMemberOneReq readMemberOneReq) {

        // ▼ 요청 대상 ID를 우선 사용 (컨트롤러에서 이미 me/경로변수로 채워서 옴)
        String targetId = (readMemberOneReq != null && readMemberOneReq.getMemberId() != null
                && !readMemberOneReq.getMemberId().isBlank())
                ? readMemberOneReq.getMemberId()
                : SecurityContextHolder.getContext().getAuthentication().getName();

        MemberEntity member = memberRepository.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."));

        return ReadMemberOneRes.from(member);
    }


    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
     public List<ReadMemberAllRes> memberReadAll() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        List<MemberEntity> member = memberRepository.findAll();

        return ReadMemberAllRes.from(member);
    }


    @Override
    public ModifyMemberRes modify(ModifyMemberReq modifyMemberReq) {

        String memberId = modifyMemberReq.getMemberId();

        MemberEntity member = memberRepository.findById(memberId).orElse(null);
        System.out.println(member);
        if (member == null) {
            throw new UsernameNotFoundException(memberId);
        }
//        ResponseStatusException(HttpStatus.)

        member.setMemberPw(passwordEncoder.encode(modifyMemberReq.getMemberPw()));
        member.setMemberPhone(modifyMemberReq.getMemberPhone());
        member.setMemberEmail(modifyMemberReq.getMemberEmail());
        member.setMemberZipCode(modifyMemberReq.getMemberZipCode());
        member.setMemberRoadAddress(modifyMemberReq.getMemberRoadAddress());
        member.setMemberEtc(modifyMemberReq.getEtc());
        member.setMemberHasPet(modifyMemberReq.getMemberHasPet());
        member.setImages(modifyMemberReq.getMemberFileImage());

        memberRepository.save(member);

        return null;

    }

    @Override
    public DeleteMemberRes delete(DeleteMemberReq deleteMemberReq) {

        String memberId = deleteMemberReq.getMemberId();

        MemberEntity member = memberRepository.findById(memberId).orElse(null);

        memberRepository.delete(member);
        return null;

    }




}
