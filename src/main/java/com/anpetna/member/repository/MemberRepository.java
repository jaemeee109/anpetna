package com.anpetna.member.repository;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<MemberEntity, String>, JpaSpecificationExecutor<MemberEntity> {
    //                                                                          스펙 확장 검색용으로 추가 ★25.09.15 추가
    //   Optional<MemberEntity> findByMemberId(String memberId);
    Optional<MemberEntity> findByMemberId(String memberId);

    @Query("select m.memberId from MemberEntity m where m.memberRole = :role")
    List<String> findIdsByRole(@Param("role") MemberRole role);

    List<MemberEntity> findAllByMemberRole(MemberRole memberRole);
}

/*JpaSpecificationExecutor : 동적 쿼리(Dynamic Query) 를 작성할 수 있게 해주는 기능.
JpaSpecificationExecutor<MemberEntity> 를 리포지토리에 추가하면, Specification 기반으로 쿼리를 실행할 수 있어.
즉, 조건들을 코드로 조립해서 복잡한 WHERE 절을 만들어낼 수 있음.*/

/*
 * Specification 이란?
 * JPA 에서 동적 검색 조건을 "코드로 조합"하는 방법입니다.
 * 복잡한 WHERE 절을 깔끔하게 만들 수 있음
 */
