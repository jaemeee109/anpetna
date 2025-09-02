package com.anpetna.auth.repository;

import com.anpetna.auth.domain.TokenEntity;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface TokenRepository extends JpaRepository<TokenEntity, Long> {

    @Query("select t from TokenEntity t where t.memberId = :memberId")
    Optional<TokenEntity> findByTokenMemberId(@Param("memberId") String id);

    @Modifying
    @Transactional
    @Query("update TokenEntity t set t.revokedAt = CURRENT_TIMESTAMP " +
            "where t.memberId = :memberId and t.revokedAt is null")
    void revokeByMemberId(@Param("memberId") String memberId);

    @Modifying
    @Transactional
    @Query("""
        update TokenEntity t
           set t.revokedAt = :now
         where t.memberId = :memberId
           and t.revokedAt is null
           and t.expiresAt > :now
    """)
    int revokeAllActiveByMemberId(@Param("memberId") String memberId,
                                  @Param("now") Instant now);

    Optional<TokenEntity> findFirstByRefreshTokenAndRevokedAtIsNullAndExpiresAtAfter(
            String refreshToken, Instant now);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
  update TokenEntity t
     set t.refreshToken = :refresh,
         t.expiresAt   = :expiresAt,
         t.revokedAt   = null
   where t.memberId    = :memberId
""")
    int upsertRefreshForMember(@Param("memberId") String memberId,
                               @Param("refresh") String refresh,
                               @Param("expiresAt") Instant expiresAt);

}