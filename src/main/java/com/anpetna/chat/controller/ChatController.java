package com.anpetna.chat.controller;

import com.anpetna.chat.domain.ChatroomEntity;

import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.service.ChatService;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.member.service.MemberService;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Slf4j
@RequiredArgsConstructor
@RequestMapping("/chats")
@RestController
public class ChatController {

    private final ChatService chatService;

    private final MemberService memberService;

    private final MemberRepository memberRepository;


    @PostMapping
    public ChatroomDTO createChatroom(Authentication authentication, @RequestParam String title) {
        // [수정] 인증/입력 가드
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        title = (title == null) ? "" : title.trim();
        if (title.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "채팅방 제목은 필수입니다.");
        }

        final String memberId = authentication.getName();
        final MemberEntity member;
        try {
            member = memberService.findById(memberId);
        } catch (IllegalArgumentException e) {
            log.warn("[ChatController#createChatroom] invalid memberId={}", memberId, e);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 회원입니다.");
        }

        // [수정] 서비스 호출을 세분화해서 4xx로 변환 + 서버 로그에 근본 원인 남김
        try {
            ChatroomEntity chatroom = chatService.createChatroom(member, title);
            return ChatroomDTO.from(chatroom);
        } catch (DataIntegrityViolationException e) {
            log.error("[createChatroom] DataIntegrityViolation: memberId={}, title='{}'", member.getMemberId(), title, e);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "데이터 무결성 위반(중복/제약)으로 생성 실패");
        } catch (ConstraintViolationException e) {
            log.error("[createChatroom] JSR-303 ConstraintViolation: memberId={}, title='{}'", member.getMemberId(), title, e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효성 검사 실패");
        } catch (NoSuchElementException e) {
            log.error("[createChatroom] NoSuchElement: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "필수 데이터가 존재하지 않습니다.");
        } catch (NullPointerException e) {
            log.error("[createChatroom] NullPointer: memberId={}, title='{}'", member.getMemberId(), title, e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "처리 중 누락된 값이 있습니다.");
        } catch (IllegalArgumentException e) {
            log.error("[createChatroom] IllegalArgument: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            log.error("[createChatroom] Unexpected error: memberId={}, title='{}'", member.getMemberId(), title, e);
            // 그대로 전파 → 전역 핸들러가 500으로 감싸더라도 서버 콘솔에 '정확한 원인'이 찍힙니다.
            throw e;
        }
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
        final String memberId = authentication.getName().trim();
        MemberEntity member = memberService.findById(memberId);
        //  서비스에서 DTO 변환까지 완료
        return chatService.getChatroomList(member);
    }


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