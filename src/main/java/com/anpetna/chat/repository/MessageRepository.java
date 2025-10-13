package com.anpetna.chat.repository;

import com.anpetna.chat.domain.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    // 메세지 조회 N+1 제거
    @Query("""
        select m from MessageEntity m
        join fetch m.member
        where m.chatroom.id = :chatroomId
        order by m.createdAt asc
    """)
    List<MessageEntity> findAllWithMemberByChatroomId(@Param("chatroomId") Long chatroomId);

    Boolean existsByChatroomIdAndCreatedAtAfter(Long chatroomId, LocalDateTime createdAt);

    //================== 추가 ========================
    //  lastCheckedAt == null일 때 사용: 채팅방에 메세지가 1개라도 있는지
    Boolean existsByChatroomId(Long chatroomId);

}
