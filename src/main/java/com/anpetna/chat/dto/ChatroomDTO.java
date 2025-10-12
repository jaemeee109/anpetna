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

        boolean hasNew = Boolean.TRUE.equals(chatroom.getHasNewMessage());
        int memberCount = (chatroom.getMemberChatroomMappingSet() == null)
                ? 0
                : chatroom.getMemberChatroomMappingSet().size();

        return new ChatroomDTO(chatroom.getId(), chatroom.getTitle(), hasNew, memberCount, chatroom.getCreatedAt());
    }

}
