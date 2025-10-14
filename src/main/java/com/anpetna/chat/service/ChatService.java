package com.anpetna.chat.service;

import com.anpetna.chat.domain.ChatroomEntity;
import com.anpetna.chat.domain.MemberChatroomMapping;
import com.anpetna.chat.domain.MessageEntity;
import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.repository.ChatroomRepository;
import com.anpetna.chat.repository.MemberChatroomMappingRepository;
import com.anpetna.chat.repository.MessageRepository;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import jakarta.persistence.PrePersist;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;


@Slf4j
@RequiredArgsConstructor
@Service
public class ChatService {

    private final ChatroomRepository chatroomRepository;

    private final MemberChatroomMappingRepository memberChatroomMappingRepository;

    private final MessageRepository messageRepository;

    private final MemberRepository memberRepository;

    // 채팅방 개설 사용자와 채팅방 제목을 인자로 받는 채팅방 생성 서비스 로직
    @Transactional
    public ChatroomEntity createChatroom(MemberEntity member, String title) {
        // [수정] 입력 가드
        final String safeTitle = (title == null) ? "" : title.trim();
        if (safeTitle.isEmpty()) {
            log.warn("[createChatroom] empty title by memberId={}", (member != null ? member.getMemberId() : "null"));
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "채팅방 제목은 필수입니다.");
        }
        if (member == null || member.getMemberId() == null) {
            log.warn("[createChatroom] null member (authentication problem?)");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        // 방 생성
        ChatroomEntity chatroom = ChatroomEntity.builder()
                .title(safeTitle)
                .createdAt(LocalDateTime.now())
                .build();
        chatroom = chatroomRepository.save(chatroom);

        // 생성자 참여 저장
        MemberChatroomMapping creatorMap = chatroom.addMember(member);
        memberChatroomMappingRepository.save(creatorMap);

        // [수정] 관리자 자동 참여 (Optional<MemberEntity> → 일반 if)
        List<MemberEntity> admins = memberRepository.findAllByMemberRole(MemberRole.ADMIN);
        /** 생성자와 중복되지 않게, 관리자 전원을 자동 참여 (원한다면 1명만 초대하도록 변경 가능) */
        for (MemberEntity admin : admins) {
            if (admin != null
                    && admin.getMemberId() != null
                    && !admin.getMemberId().equals(member.getMemberId())) {
                MemberChatroomMapping adminMap = chatroom.addMember(admin);
                memberChatroomMappingRepository.save(adminMap);
            }
        }
// [중략]


        log.info("[createChatroom] created chatroomId={} title='{}' by memberId={}",
                chatroom.getId(), safeTitle, member.getMemberId());

        return chatroom;
    }

    // 생성된 채팅방에 사용자가 참여하는 로직 - 참여가 올바르게 완료되었는지 boolean으로 반환.
    @Transactional // 추가
    public Boolean joinChatroom(MemberEntity member, Long newChatroomId, Long currentChatroomId) {

        // A라는 채팅방에서 B라는 채팅방으로 옮겨가는 상황
        if (currentChatroomId != null) {
            updateLastCheckedAt(member, currentChatroomId);
        }
        // ===================== 수정 =====================
        if (memberChatroomMappingRepository.existsByMember_MemberIdAndChatroom_Id(member.getMemberId(), newChatroomId)) {
            //  방을 다시 열었으면 '읽음'으로 처리하여 NEW 제거
            updateLastCheckedAt(member, newChatroomId);
            log.info("이미 참여 중인 채팅방입니다. lastCheckedAt 갱신 처리 완료");
            return false;
        }
        // ===================== 수정 끝 =====================

        ChatroomEntity chatroom = chatroomRepository.findById(newChatroomId).get();

        MemberChatroomMapping memberChatroomMapping = MemberChatroomMapping.builder()
                .member(member)
                .chatroom(chatroom)
                .build();

        memberChatroomMapping = memberChatroomMappingRepository.save(memberChatroomMapping);

        return true;
    }


    public void updateLastCheckedAt(MemberEntity member, Long currentChatroomId) {

        MemberChatroomMapping memberChatroomMapping = memberChatroomMappingRepository.findByMember_MemberIdAndChatroom_Id(member.getMemberId(), currentChatroomId).get();

        memberChatroomMapping.updateLastCheckedAt();

        memberChatroomMappingRepository.save(memberChatroomMapping);
    }

    // 참여 중인 채팅방을 나가는 로직
    @Transactional
    public Boolean leaveChatroom(MemberEntity member, Long chatroomId) {

        // 이미 참여하고 있는 채팅방인지 검사
        if (!memberChatroomMappingRepository.existsByMember_MemberIdAndChatroom_Id(member.getMemberId(), chatroomId)) {
            log.info("참여 중인 채팅방이 아닙니다.");
            return false;
        }

        memberChatroomMappingRepository.deleteByMember_MemberIdAndChatroom_Id(member.getMemberId(), chatroomId);

        return true;
    }

    // 채팅방에 참여한 사용자들의 목록을 가져오는 로직
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public List<ChatroomDTO> getChatroomList(MemberEntity member) {

        List<MemberChatroomMapping> memberChatroomMappingList = memberChatroomMappingRepository.findAllByMember_MemberId(member.getMemberId());

        return memberChatroomMappingList.stream()
                .filter(m -> m != null && m.getChatroom() != null)
                .map(m -> {
                    ChatroomEntity chatroom = m.getChatroom();

                    boolean hasNew = false;
                    LocalDateTime checkedAt = m.getLastCheckedAt();

                    if (checkedAt != null) {
                        hasNew = Boolean.TRUE.equals(
                                messageRepository.existsByChatroomIdAndCreatedAtAfter(
                                        chatroom.getId(),
                                        checkedAt
                                )
                        );
                    }
                    chatroom.setHasNewMessage(hasNew);
                    return chatroom;
                }).map(ChatroomDTO::from)
                .toList();
    }



    @Transactional // 추가
    public MessageEntity saveMessage(MemberEntity member, Long chatroomId, String text) {

        // 채팅방이 존재하는지 확인
        ChatroomEntity chatroom = chatroomRepository.findById(chatroomId).get();

        MessageEntity message = MessageEntity.builder()
                .text(text)
                .member(member)
                .chatroom(chatroom)
                .createdAt(LocalDateTime.now())
                .build();

        // =================== 추가 ===================
        // 1) 저장
        MessageEntity saved = messageRepository.save(message);

        // 2) 보낸 사람은 방금 메시지를 "본" 상태이므로 즉시 읽음 처리
        updateLastCheckedAt(member, chatroomId);

        // =================== 추가 ===================
        return saved; // 수정
    }

    // 특정 채팅방에서 작성된 모든 메세지를 불러오는 로직
    public List<MessageEntity> getMessageList(Long chatroomId) {
        return messageRepository.findAllWithMemberByChatroomId(chatroomId);
    }



    @Transactional(readOnly = true)
    public ChatroomDTO getChatroom(Long chatroomId) {

        ChatroomEntity chatroom = chatroomRepository.findById(chatroomId).get();

        return ChatroomDTO.from(chatroom);
    }


    //================== 추가 ========================
    // 참여자 확인 메서드 (본인, 관리자 외에 다른 회원 채팅방 참여 불가능)
    @Transactional(readOnly = true)
    public boolean isParticipant(String memberId, Long chatroomId) {
        return memberChatroomMappingRepository
                .existsByMember_MemberIdAndChatroom_Id(memberId, chatroomId);
    }



}