package com.anpetna.chat.domain;

import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class MemberChatroomMapping {

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_chatroom_mapping_id")
    @Id
    Long id;

    @JoinColumn(name = "member_id")
    @ManyToOne
    MemberEntity member;

    @JoinColumn(name = "chatroom_id")
    @ManyToOne
    ChatroomEntity chatroom;

    LocalDateTime lastCheckedAt;    // lastCheckedAt 보다 늦은 시간의 Message 엔티티의 createdAt이 있는 경우 그 메세지는 새로 발행 된 신규 메세지다.

    public void updateLastCheckedAt() {
        this.lastCheckedAt = LocalDateTime.now();
    }
}
