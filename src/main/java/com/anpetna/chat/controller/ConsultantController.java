package com.anpetna.chat.controller;

import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.service.ConsultantService;
import com.anpetna.member.dto.MemberDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RequiredArgsConstructor
@RequestMapping("/consultants")
@RestController
public class ConsultantController {

    private final ConsultantService consultantService;

    @PostMapping
    public MemberDTO saveMember(@RequestBody /*@Valid*/ MemberDTO memberDTO) {
        return consultantService.saveMember(memberDTO);
    }

    // 관리자가 상담 채팅 목록을 볼 수 있도록 페이징
    @GetMapping("/chats")
    public Page<ChatroomDTO> getChatroomPage(Pageable pageable) {
        return consultantService.getChatroomPage(pageable);
    }
}
