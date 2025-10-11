package com.anpetna.chat.repository;

import com.anpetna.chat.domain.MemberChatroomMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberChatroomMappingRepository extends JpaRepository<MemberChatroomMapping, Long> {

    Boolean existsByMember_MemberIdAndChatroomId(String memberId, Long chatroomId);

    void deleteByMember_MemberIdAndChatroomId(String memberId, Long chatroomId);

    List<MemberChatroomMapping> findAllByMember_MemberId(String memberId);

    Optional<MemberChatroomMapping> findByMember_MemberIdAndChatroomId(String memberId, Long chatroomId);
}
