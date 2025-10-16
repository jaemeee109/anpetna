package com.anpetna.chat.domain;

import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class ChatroomEntity {

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chatroom_id")
    @Id
    Long id;

    String title;

    @Builder.Default
    @OneToMany(mappedBy = "chatroom", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<MemberChatroomMapping> memberChatroomMappingSet = new HashSet<>();

    LocalDateTime createdAt;

    @Transient  // 새 메세지에 대한 정보. 데이터베이스에 저장 후 사용하는 것 보다는 언제 조회하느냐에 따라 값이 달라지므로 @Transient 를 사용한다. 엔티티의 속성들은 테이블의 컬럼으로 메핑이 되지만 @Transient는 오로지 클래스의 속성으로만 존재한다.
    Boolean hasNewMessage;

    public MemberChatroomMapping addMember(MemberEntity member) {

        if (this.getMemberChatroomMappingSet() == null) {
            this.memberChatroomMappingSet = new HashSet<>();
        }

        MemberChatroomMapping memberChatroomMapping = MemberChatroomMapping.builder()
                .member(member)
                .chatroom(this)
                .build();

        this.memberChatroomMappingSet.add(memberChatroomMapping);

        return memberChatroomMapping;
    }
}
