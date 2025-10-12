package com.anpetna.chat.controller;

import com.anpetna.chat.domain.ChatroomEntity;
import com.anpetna.chat.domain.MessageEntity;
import com.anpetna.chat.dto.ChatMessageDTO;
import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.service.ChatService;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

//================== 추가 ========================
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.repository.MemberRepository;
//================== 추가 끝 ========================


@Slf4j
@RequiredArgsConstructor
@RequestMapping("/chats")
@RestController
public class ChatController {

    private final ChatService chatService;

    private final MemberService memberService;

    // 추가
    private final MemberRepository memberRepository;


    @PostMapping
    public ChatroomDTO createChatroom(Authentication authentication, @RequestParam String title) {

        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        ChatroomEntity chatroom = chatService.createChatroom(member, title);

        //================== 추가 ========================
        try {
            if (member.getMemberRole() != MemberRole.ADMIN) {
                // 모든 관리자 ID 조회
                List<String> adminIds = memberRepository.findIdsByRole(MemberRole.ADMIN);

                for (String adminId : adminIds) {
                    if (!chatService.isParticipant(adminId, chatroom.getId())) {
                        MemberEntity admin = memberService.findById(adminId);
                        chatService.joinChatroom(admin, chatroom.getId(), null);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("관리자 자동 참여 처리 중 오류: {}", e.getMessage());
        }

        //================== 추가 끝 ========================
        return ChatroomDTO.from(chatroom);
    }

    @PostMapping("/{chatroomId}")
    public Boolean joinChatroom(Authentication authentication, @PathVariable Long chatroomId, @RequestParam(required = false) Long currentChatroomId) {

        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        return chatService.joinChatroom(member, chatroomId, currentChatroomId);
    }

    @DeleteMapping("/{chatroomId}")
    public Boolean leaveChatroom(Authentication authentication, @PathVariable Long chatroomId) {

        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        return chatService.leaveChatroom(member, chatroomId);
    }

/* 기존코드
    @GetMapping
    public List<ChatroomDTO> getChatroomList(Authentication authentication) {


        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        List<ChatroomEntity> chatroomList = chatService.getChatroomList(member);

        return chatroomList.stream()
                .map(ChatroomDTO::from)
                .toList();
    }
*/
//================== 추가 ========================


    @GetMapping
    public List<ChatroomDTO> getChatroomList(Authentication authentication) {

        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        final String memberId = authentication.getName().trim();
        if (memberId.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
        }

        MemberEntity member = memberService.findById(memberId);

        //  서비스에서 DTO 변환까지 완료
        return chatService.getChatroomListDTO(member);
    }



//================== 추가 끝 ========================



    // 특정 채팅방의 메세지들을 갖고오는 api
//    @GetMapping("/{chatroomId}/messages")
//    public List<ChatMessageDTO> getMessageList(@PathVariable Long chatroomId) {
//
//        List<MessageEntity> messageList = chatService.getMessageList(chatroomId);
//
//        return messageList.stream()
//                .map(message -> new ChatMessageDTO(message.getMember().getMemberId(), message.getText()))
//                .toList();
//    }
}