package com.anpetna.auth;

import com.anpetna.config.JwtProvider;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.auth.dto.LoginMemberReq;
import com.anpetna.auth.dto.TokenResponse;
import com.anpetna.auth.domain.TokenEntity;
import com.anpetna.auth.repository.TokenRepository;
import com.anpetna.auth.service.BlacklistServiceImpl;
import com.anpetna.auth.service.JwtServiceImpl;
import com.anpetna.auth.util.TokenHash;
import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.member.repository.MemberRepository;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@Slf4j
public class TokenServiceTests {

    @InjectMocks
    private JwtServiceImpl jwtService;
    @Mock
    MemberRepository memberRepository = mock(MemberRepository.class);
    @Mock
    PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    @Mock
    JwtProvider jwtProvider = mock(JwtProvider.class);
    @Mock
    TokenRepository tokenRepository = mock(TokenRepository.class);
    @Mock
    TokenHash tokenHash = mock(TokenHash.class);
    @Mock
    BlacklistServiceImpl blacklistService = mock(BlacklistServiceImpl.class);

    JwtServiceImpl sut;

    @BeforeEach
    void setUp() {
        sut = new JwtServiceImpl(tokenRepository, memberRepository, jwtProvider, passwordEncoder, tokenHash, blacklistService );
    }

    @Test
    public void loginTest() {
        String memberId = "user01";
        String rawPw = "123456";
        String encPw = "ENC";

        // 요청은 raw 비번으로
        LoginMemberReq req = LoginMemberReq.builder()
                .memberId(memberId)
                .memberPw(rawPw)
                .build();

        MemberEntity memberEntity = MemberEntity.builder()
                .memberId(memberId)
                .memberPw(encPw)
                .build();

        // 서비스 구현에 맞춰 TokenEntity or MemberEntity 준비
        TokenEntity te = new TokenEntity();
        te.setMemberId(memberId);

        when(memberRepository.findByMemberId(eq(memberId)))
                .thenReturn(Optional.of(memberEntity));

        // matches(raw, encoded) 순서 주의!
        when(passwordEncoder.matches(eq(rawPw), eq(encPw)))
                .thenReturn(true);

        // 토큰 발급은 mock으로 고정값 반환
        when(jwtProvider.createAccessToken(eq(memberId))).thenReturn("access-123");
        when(jwtProvider.createRefreshToken(eq(memberId))).thenReturn("refresh-456");

        // save는 그대로 돌려주기
        when(tokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // when
        TokenResponse res = sut.login(req);

        // then
        assertThat(res.getAccessToken()).isEqualTo("access-123");
        assertThat(res.getRefreshToken()).isEqualTo("refresh-456");

        //리프레시 확인
        ArgumentCaptor<TokenEntity> cap = ArgumentCaptor.forClass(TokenEntity.class);
        verify(tokenRepository).save(cap.capture());
        TokenEntity tokenEntity = cap.getValue();
        assertThat(tokenEntity.getMemberId()).isEqualTo(req.getMemberId());
        verify(passwordEncoder).matches(req.getMemberPw(), encPw);
    }

    @Test
    public void refreshTokenTest() {
        TokenEntity te = new TokenEntity();
        te.setMemberId("memberId");
        te.setRefreshToken("hashed-old");

        LoginMemberReq loginMemberReq = new LoginMemberReq();
        loginMemberReq.setMemberId("memberId");

        String oldRT = "Refresh.Token.456";
        String newRT = "Refresh.Token.45678";

        TokenRequest tokenRequest = TokenRequest.builder()
                .refreshToken(oldRT)
                .build();

        when(jwtProvider.validateToken(eq(oldRT))).thenReturn(true);
        when(jwtProvider.getUsername(eq(oldRT))).thenReturn(te.getMemberId());

        when(tokenRepository.findByTokenMemberId(eq(te.getMemberId())))
                .thenReturn(Optional.of(te));

        // 요청 RT 해시 비교 통과
        when(tokenHash.sha256(eq(oldRT))).thenReturn("hashed-old");

        when(jwtProvider.createAccessToken(eq(te.getMemberId()))).thenReturn("Access.Token.12345");
        when(jwtProvider.createRefreshToken(eq(te.getMemberId()))).thenReturn(newRT);

        // 새 RT 저장 시 해시
        when(tokenHash.sha256(eq(newRT))).thenReturn("hashed-new");

        when(tokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TokenResponse response = sut.refresh(tokenRequest);

        assertThat(response.getAccessToken()).isEqualTo("Access.Token.12345");
        assertThat(response.getRefreshToken()).isEqualTo(newRT);

        verify(tokenRepository).save(argThat(saved ->
                "hashed-new".equals(saved.getRefreshToken()) &&
                        te.getMemberId().equals(saved.getMemberId())
        ));
    }

    @Test
    public void logoutTest() {
        // given
        String memberId     = "memberId";
        String rawRefresh   = "Refresh.Token.456";        // 클라이언트가 보낸 원문
        String storedHash   = "hashed.refresh.789";       // DB에 저장된 해시
        String accessToken  = "Access.Token.123";

        TokenEntity te = new TokenEntity();
        te.setMemberId(memberId);
        te.setRefreshToken(storedHash);                  //DB엔 해시가 저장되어 있어야 함

        TokenRequest tokenRequest = TokenRequest.builder()
                .refreshToken(rawRefresh)
                .accessToken(accessToken)
                .build();

        //refresh 토큰 유효성은 통과
        when(jwtProvider.validateToken(eq(rawRefresh))).thenReturn(true);

        //요청 원문 -> 해시 변환 결과를 스텁 (서비스가 비교에 사용)
        when(tokenHash.sha256(eq(rawRefresh))).thenReturn(storedHash);

        // when
        sut.logout(tokenRequest);

        // then
        verify(tokenRepository).revokeByMemberId(eq(memberId));//revoke가 호출되는지를 검증

        // 블랙리스트 등록 호출 검증
        verify(blacklistService).addToBlacklist(eq(tokenRequest));

        // 불필요 상호작용 없는지
        verifyNoMoreInteractions(tokenRepository, blacklistService, jwtProvider, tokenHash);
    }
}
