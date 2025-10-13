package com.anpetna.chat.service;

import com.anpetna.chat.domain.ChatroomEntity;
import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.repository.ChatroomRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.MemberDTO;
import com.anpetna.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class ConsultantService {

    private final ChatroomRepository chatroomRepository;

    private final MemberRepository memberRepository;

    public MemberDTO saveMember(MemberDTO memberDTO) {

        MemberEntity member = MemberDTO.to(memberDTO);

        memberRepository.save(member);

        return MemberDTO.from(member);
    }

    public Page<ChatroomDTO> getChatroomPage(Pageable pageable) {
        Page<ChatroomEntity> chatroomPage = chatroomRepository.findAll(pageable);

        return chatroomPage.map(ChatroomDTO::from);
    }
}
