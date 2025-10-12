package com.anpetna.chat.controller;

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

//================== 추가 ========================
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
//================== 추가 끝 ========================

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/chats")
public class StompChatController {

    private final ChatService chatService;

    private final SimpMessagingTemplate messagingTemplate;

    private final MemberService memberService;

    // ======================= 추가 ======================
    // 관리자 판별 (관리자는 채팅에 자동 참여)
    private boolean isAdmin(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities()
                .stream()
                .anyMatch(a -> {
                    String r = String.valueOf(a.getAuthority());
                    return "ROLE_ADMIN".equalsIgnoreCase(r) || "ADMIN".equalsIgnoreCase(r);
                });
    }
    // ======================= 추가 끝 ======================

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

        //================== 추가 ========================
        // 관리자는 자동 참여
        if (isAdmin(authentication) && !chatService.isParticipant(memberId, chatroomId)) {
            MemberEntity admin = memberService.findById(memberId);
            chatService.joinChatroom(admin, chatroomId, null);
        }

        // 참여자 권한 체크
        if (!chatService.isParticipant(memberId, chatroomId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 접근 권한이 없습니다.");
        }
        //================== 추가 끝 ========================
        MemberEntity member = memberService.findById(memberId);
        chatService.saveMessage(member, chatroomId, text);

        /* 기존 코드
        // 2) 실시간 알림(웹소켓 구독자에게 push) - STOMP 구독 채널은 기존 그대로 사용 가능
        messagingTemplate.convertAndSend("/sub/chats", new ChatMessageDTO(member.getMemberId(), text)); // 메인 피드
        messagingTemplate.convertAndSend("/sub/chats/updates", chatService.getChatroom(chatroomId)); // 보조 업데이트
        */
        //================== 추가 ========================
        // 채팅방에서 새로고침 해야만 새 메세지가 보여서 수정
        messagingTemplate.convertAndSend("/sub/chats/" + chatroomId,
                new ChatMessageDTO(member.getMemberId(), text));
        messagingTemplate.convertAndSend("/sub/chats/" + chatroomId + "/updates",
                chatService.getChatroom(chatroomId));
        //================== 추가 끝 ========================

        // 3) HTTP 응답(JSON)
        return new ChatMessageDTO(member.getMemberId(), text);
    }

    // 메시지 조회 REST 엔드포인트
    @GetMapping("/{chatroomId}/messages")
    public List<ChatMessageDTO> getMessages(Authentication authentication,@PathVariable Long chatroomId) {

        //========= 추가 / 파라미터에도 Authentication authentication 추가 ===========
        String memberId = authentication.getName();

        // 관리자는 자동 참여
        if (isAdmin(authentication) && !chatService.isParticipant(memberId, chatroomId)) {
            MemberEntity admin = memberService.findById(memberId);
            chatService.joinChatroom(admin, chatroomId, null);
        }
        // 참여자 권한 체크
        if (!chatService.isParticipant(memberId, chatroomId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 접근 권한이 없습니다.");
        }
        //================== 추가 끝 ========================

        return chatService.getMessageList(chatroomId).stream()
                .map(m -> new ChatMessageDTO(
                        m.getMember().getMemberId(),
                        m.getText()
                ))
                .toList();
    }



}