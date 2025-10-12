package com.anpetna.chat.service;

import com.anpetna.chat.domain.ChatroomEntity;
import com.anpetna.chat.domain.MemberChatroomMapping;
import com.anpetna.chat.domain.MessageEntity;
import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.repository.ChatroomRepository;
import com.anpetna.chat.repository.MemberChatroomMappingRepository;
import com.anpetna.chat.repository.MessageRepository;
import com.anpetna.member.domain.MemberEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;


@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Service
public class ChatService {

    private final ChatroomRepository chatroomRepository;

    private final MemberChatroomMappingRepository memberChatroomMappingRepository;

    private final MessageRepository messageRepository;

    // 채팅방 개설 사용자와 채팅방 제목을 인자로 받는 채팅방 생성 서비스 로직
    @Transactional // 추가
    public ChatroomEntity createChatroom(MemberEntity member, String title) {
        ChatroomEntity chatroom = ChatroomEntity.builder()
                .title(title)
                .createdAt(LocalDateTime.now())
                .build();

        chatroom = chatroomRepository.save(chatroom);   // 채팅방 생성

        // 채팅방 생성 사용자는 생성된 채팅방에 기본적으로 참여하도록 한다.
        MemberChatroomMapping memberChatroomMapping = chatroom.addMember(member);

        memberChatroomMapping = memberChatroomMappingRepository.save(memberChatroomMapping);

        return chatroom;
    }

    // 생성된 채팅방에 사용자가 참여하는 로직 - 참여가 올바르게 완료되었는지 boolean으로 반환.
    @Transactional // 추가
    public Boolean joinChatroom(MemberEntity member, Long newChatroomId, Long currentChatroomId) {

        // A라는 채팅방에서 B라는 채팅방으로 옮겨가는 상황
        if (currentChatroomId != null) {
            updateLastCheckedAt(member, currentChatroomId);
        }

        // 이미 참여하고 있는 채팅방인지 검사
        if (memberChatroomMappingRepository.existsByMember_MemberIdAndChatroomId(member.getMemberId(), newChatroomId)) {
            log.info("이미 참여 중인 채팅방입니다.");
            return false;
        }

        ChatroomEntity chatroom = chatroomRepository.findById(newChatroomId).get();

        MemberChatroomMapping memberChatroomMapping = MemberChatroomMapping.builder()
                .member(member)
                .chatroom(chatroom)
                .build();

        memberChatroomMapping = memberChatroomMappingRepository.save(memberChatroomMapping);

        return true;
    }


    private void updateLastCheckedAt(MemberEntity member, Long currentChatroomId) {

        MemberChatroomMapping memberChatroomMapping = memberChatroomMappingRepository.findByMember_MemberIdAndChatroomId(member.getMemberId(), currentChatroomId).get();

        memberChatroomMapping.updateLastCheckedAt();

        memberChatroomMappingRepository.save(memberChatroomMapping);
    }

    // 참여 중인 채팅방을 나가는 로직
    @Transactional // 추가
    public Boolean leaveChatroom(MemberEntity member, Long chatroomId) {

        // 이미 참여하고 있는 채팅방인지 검사
        if (!memberChatroomMappingRepository.existsByMember_MemberIdAndChatroomId(member.getMemberId(), chatroomId)) {
            log.info("참여 중인 채팅방이 아닙니다.");
            return false;
        }

        memberChatroomMappingRepository.deleteByMember_MemberIdAndChatroomId(member.getMemberId(), chatroomId);

        return true;
    }

    // 채팅방에 참여한 사용자들의 목록을 가져오는 로직
    public List<ChatroomEntity> getChatroomList(MemberEntity member) {

        List<MemberChatroomMapping> memberChatroomMappingList = memberChatroomMappingRepository.findAllByMember_MemberId(member.getMemberId());

        return memberChatroomMappingList.stream()
                .map(memberChatroomMapping -> {
                    ChatroomEntity chatroom = memberChatroomMapping.getChatroom();

                    //================== 추가 ========================
                    var lastChecked = memberChatroomMapping.getLastCheckedAt();
                    boolean hasNew = (lastChecked == null)
                            ? messageRepository.existsByChatroomId(chatroom.getId())
                            : messageRepository.existsByChatroomIdAndCreatedAtAfter(chatroom.getId(), lastChecked);

                    chatroom.setHasNewMessage(hasNew);
                    //================== 추가 끝 ========================
                    // 기존 코드
                    // chatroom.setHasNewMessage(messageRepository.existsByChatroomIdAndCreatedAtAfter(chatroom.getId(), memberChatroomMapping.getLastCheckedAt()));
                    return chatroom;
                })
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

        return messageRepository.save(message);
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
                .existsByMember_MemberIdAndChatroomId(memberId, chatroomId);
    }



    @Transactional(readOnly = true)
    public List<ChatroomDTO> getChatroomListDTO(MemberEntity member) {
        var mappingList = memberChatroomMappingRepository.findAllByMember_MemberId(member.getMemberId());

        return mappingList.stream().map(mapping -> {
            var chatroom = mapping.getChatroom();
            if (chatroom == null) return null; // 혹시라도 무결성 깨진 경우 방어

            var lastChecked = mapping.getLastCheckedAt();

            boolean hasNew = (lastChecked == null)
                    ? messageRepository.existsByChatroomId(chatroom.getId())
                    : messageRepository.existsByChatroomIdAndCreatedAtAfter(chatroom.getId(), lastChecked);

            int memberCount = 0;
            try {
                memberCount = memberChatroomMappingRepository.countByChatroomId(chatroom.getId());
            } catch (Exception ignore) { /* 0 유지 */ }

            chatroom.setHasNewMessage(hasNew);
            return new com.anpetna.chat.dto.ChatroomDTO(
                    chatroom.getId(),
                    chatroom.getTitle(),
                    hasNew,
                    memberCount,
                    chatroom.getCreatedAt()
            );
        }).filter(Objects::nonNull).toList();
    }

    //================== 추가 끝 ========================
}