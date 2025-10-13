package com.anpetna.chat.domain;

import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class MessageEntity {

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    @Id
    Long id;

    String text;

    @JoinColumn(name = "member_id")
    @ManyToOne
    MemberEntity member;

    @JoinColumn(name = "chatroom_id")
    @ManyToOne
    ChatroomEntity chatroom;

    LocalDateTime createdAt;
}
