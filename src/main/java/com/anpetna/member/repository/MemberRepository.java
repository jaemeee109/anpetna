package com.anpetna.member.repository;

import com.anpetna.member.domain.MemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<MemberEntity, String> {
    MemberEntity findByMemberId(String memberId);
}
