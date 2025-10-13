package com.anpetna.chat.controller;

import com.anpetna.chat.domain.MessageEntity;
import com.anpetna.chat.dto.ChatMessageDTO;
import com.anpetna.chat.service.ChatService;;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/chats")
public class StompChatController {

    private final ChatService chatService;

    private final SimpMessagingTemplate messagingTemplate;

    private final MemberService memberService;

    // 메시지 전송(저장) REST 엔드포인트
    @PostMapping("/{chatroomId}/messages") // ⬅️ 변경 포인트 2: HTTP POST
    public ChatMessageDTO postMessage(Authentication authentication,
                                      @PathVariable Long chatroomId,
                                      @RequestBody Map<String, String> payload) {

        String text = payload.getOrDefault("message", "").trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("내용을 입렵하세요.");
        }

        // 1) 저장
        String memberId = authentication.getName();
        MemberEntity member = memberService.findById(memberId);
        chatService.saveMessage(member, chatroomId, text);

        // 2) 실시간 알림(웹소켓 구독자에게 push) - STOMP 구독 채널은 기존 그대로 사용 가능
        // 채팅방에서 새로고침 해야만 새 메세지가 보여서 수정
        messagingTemplate.convertAndSend("/sub/chats/" + chatroomId,
                new ChatMessageDTO(member.getMemberId(), text));
        messagingTemplate.convertAndSend("/sub/chats/" + chatroomId + "/updates",
                chatService.getChatroom(chatroomId));

        // 3) HTTP 응답(JSON)
        return new ChatMessageDTO(member.getMemberId(), text);
    }

    // 메시지 조회 REST 엔드포인트
    @GetMapping("/{chatroomId}/messages")
    public List<ChatMessageDTO> getMessages(Authentication authentication, @PathVariable Long chatroomId) {

        String memberId = authentication.getName();

        // 참여자 권한 체크
        if (!chatService.isParticipant(memberId, chatroomId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 접근 권한이 없습니다.");
        }

         //메시지 열람 -> 읽음 처리
        MemberEntity member = memberService.findById(memberId);
        chatService.updateLastCheckedAt(member, chatroomId);


        return chatService.getMessageList(chatroomId).stream()
                .map(m -> new ChatMessageDTO(
                        m.getMember().getMemberId(),
                        m.getText()
                ))
                .toList();
    }

}