package com.anpetna.auth;

import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.config.JwtProvider;
import com.anpetna.auth.domain.BlackListedEntity;
import com.anpetna.auth.repository.BlacklistedRepository;
import com.anpetna.auth.service.BlacklistServiceImpl;
import com.anpetna.auth.util.TokenHash;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BlacklistServiceTests {

    @InjectMocks
    BlacklistServiceImpl sut;
    @Mock
    BlacklistedRepository repo;
    @Mock
    JwtProvider jwtProvider;
    @Mock
    TokenHash tokenHash;

    private static final String AT = "eyJhbGciOiJIaccess";      // 가짜 토큰
    private static final String HASH = "abcdef012345";          // 가짜 해시

    TokenRequest tokenRequest = TokenRequest.builder()
            .accessToken(AT)
            .build();

//    @BeforeEach
//    void setup() {
//        // 공통 스텁: 해시 유틸은 항상 같은 해시를 반환하게
//        when(tokenHash.sha256(anyString())).thenReturn(HASH);
//    }

    @Test
    void addToBlacklist_validTest() { // 유효한 토큰을 넣었을때, 블랙리스트에 저장이 되는지에 대한 테스트
        // given: 만료 전인 exp
        Instant future = Instant.now().plusSeconds(600).truncatedTo(ChronoUnit.MILLIS);
        Claims claims = mock(Claims.class);
        when(claims.getExpiration()).thenReturn(Date.from(future));
        when(jwtProvider.parseClaims(AT)).thenReturn(claims);
        when(tokenHash.sha256(anyString())).thenReturn(HASH);

        // 아직 등록된 동일 해시 없음
        when(repo.existsByAccessTokenHashAndExpiresAtAfter(eq(HASH), any(Instant.class)))
                .thenReturn(false);

        // when
        sut.addToBlacklist(tokenRequest);

        // then: save 1회, 저장되는 값 검증
        ArgumentCaptor<BlackListedEntity> cap = ArgumentCaptor.forClass(BlackListedEntity.class);
        verify(repo).save(cap.capture());
        BlackListedEntity saved = cap.getValue();
        assertThat(saved.getAccessTokenHash()).isEqualTo(HASH);
        assertThat(saved.getExpiresAt()).isEqualTo(future);
        verify(repo).existsByAccessTokenHashAndExpiresAtAfter(eq(HASH), any(Instant.class));
    }


    @Test
    void addToBlacklist_alreadyExistTest() { // 이미 존재하는 토큰을 넣었을때, 블랙리스트에 저장이 안되는지 테스트
        // given: 만료 전인 exp
        Instant future = Instant.now().plusSeconds(600).truncatedTo(ChronoUnit.MILLIS);
        Claims claims = mock(Claims.class);
        when(claims.getExpiration()).thenReturn(Date.from(future));
        when(jwtProvider.parseClaims(AT)).thenReturn(claims);
        when(tokenHash.sha256(anyString())).thenReturn(HASH);

        // 동일한 해시가 이미 블랙리스트에 존재
        when(repo.existsByAccessTokenHashAndExpiresAtAfter(eq(HASH), any(Instant.class)))
                .thenReturn(true);

        // when
        sut.addToBlacklist(tokenRequest);

        // then: 저장이 되기전에 끝나야 하므로, save가 한번도 동작을 하지 않았는지 검증
        verify(repo, never()).save(any());
    }


    @Test
    void addToBlacklist_expiredTest() { // 기간이 만료된 토큰을 넣었을때, 저장이 안되는지 테스트
        // given: 과거 exp
        Instant past = Instant.now().minusSeconds(10).truncatedTo(ChronoUnit.MILLIS);
        Claims claims = mock(Claims.class);
        when(claims.getExpiration()).thenReturn(Date.from(past));
        when(jwtProvider.parseClaims(AT)).thenReturn(claims);

        // when
        sut.addToBlacklist(tokenRequest);

        // then
        verify(repo, never()).existsByAccessTokenHashAndExpiresAtAfter(anyString(), any());
        verify(repo, never()).save(any());
    }


    @Test
    void addToBlacklist_incorrectTest() {
        // given
        when(jwtProvider.parseClaims(AT)).thenThrow(new JwtException("언마로ㅜㅇ;노미ㅜ챠뱆어ㅏ밍;"));

        // when
        sut.addToBlacklist(tokenRequest);

        // then
        verify(repo, never()).save(any());
        verify(repo, never()).existsByAccessTokenHashAndExpiresAtAfter(anyString(), any());
    }


    @Test
    void purgeExpiredTest() {
        // when
        sut.purgeExpired();

        // then
        verify(repo, times(1)).deleteByExpiresAtBefore(any(Instant.class));
    }


    @Test
    void isBlacklisted_true_falseTest() {
        // given
        when(tokenHash.sha256(anyString())).thenReturn(HASH);
        when(repo.existsByAccessTokenHashAndExpiresAtAfter(eq(HASH), any(Instant.class)))
                .thenReturn(true)
                .thenReturn(false);

        // when & then
        assertThat(sut.isBlacklisted(tokenRequest)).isTrue();
        assertThat(sut.isBlacklisted(tokenRequest)).isFalse();
        verify(tokenHash, times(2)).sha256(eq(AT));
    }

}
