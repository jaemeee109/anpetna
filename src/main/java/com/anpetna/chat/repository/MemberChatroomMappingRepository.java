package com.anpetna.chat.repository;

import com.anpetna.chat.domain.MemberChatroomMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberChatroomMappingRepository extends JpaRepository<MemberChatroomMapping, Long> {

    Boolean existsByMemberIdAndChatroomId(String memberId, Long chatroomId);

    void deleteByMemberIdAndChatroomId(String memberId, Long chatroomId);

    List<MemberChatroomMapping> findAllByMemberId(String memberId);

    Optional<MemberChatroomMapping> findByMemberIdAndChatroomId(String memberId, Long chatroomId);
}
