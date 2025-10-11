package com.anpetna.chat.dto;

import com.anpetna.chat.domain.ChatroomEntity;

import java.time.LocalDateTime;

public record ChatroomDTO(
        Long id,
        String title,
        Boolean hasNewMessage,
        Integer memberCount,
        LocalDateTime createdAt
) {

    public static ChatroomDTO from(ChatroomEntity chatroom) {
        return new ChatroomDTO(chatroom.getId(), chatroom.getTitle(), chatroom.getHasNewMessage(), chatroom.getMemberChatroomMappingSet().size(), chatroom.getCreatedAt());
    }

}
