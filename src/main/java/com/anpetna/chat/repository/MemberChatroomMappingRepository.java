package com.anpetna.chat.repository;

import com.anpetna.chat.domain.MemberChatroomMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberChatroomMappingRepository extends JpaRepository<MemberChatroomMapping, Long> {

    Boolean existsByMember_MemberIdAndChatroom_Id(String memberId, Long chatroomId);

    void deleteByMember_MemberIdAndChatroom_Id(String memberId, Long chatroomId);

    List<MemberChatroomMapping> findAllByMember_MemberId(String memberId);

    Optional<MemberChatroomMapping> findByMember_MemberIdAndChatroom_Id(String memberId, Long chatroomId);

}
