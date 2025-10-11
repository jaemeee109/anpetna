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

@Slf4j
@RequiredArgsConstructor
@RequestMapping("/chats")
@RestController
public class ChatController {

    private final ChatService chatService;

    private final MemberService memberService;

    @PostMapping
    public ChatroomDTO createChatroom(Authentication authentication, @RequestParam String title) {

        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        ChatroomEntity chatroom = chatService.createChatroom(member, title);

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

    @GetMapping
    public List<ChatroomDTO> getChatroomList(Authentication authentication) {

        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);

        List<ChatroomEntity> chatroomList = chatService.getChatroomList(member);

        return chatroomList.stream()
                .map(ChatroomDTO::from)
                .toList();
    }

    // 특정 채팅방의 메세지들을 갖고오는 api
    @GetMapping("/{chatroomId}/messages")
    public List<ChatMessageDTO> getMessageList(@PathVariable Long chatroomId) {

        List<MessageEntity> messageList = chatService.getMessageList(chatroomId);

        return messageList.stream()
                .map(message -> new ChatMessageDTO(message.getMember().getMemberId(), message.getText()))
                .toList();
    }
}
