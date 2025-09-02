package com.anpetna.auth.service;

import com.anpetna.auth.config.JwtProvider;
import com.anpetna.auth.domain.TokenEntity;
import com.anpetna.auth.dto.LoginMemberReq;
import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.auth.dto.TokenResponse;
import com.anpetna.auth.repository.TokenRepository;
import com.anpetna.auth.util.TokenHash;

import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JwtServiceImpl implements JwtService {

    private final TokenRepository tokenRepository;
    private final MemberRepository memberRepository;
    private final JwtProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;
    private final TokenHash tokenHash;
    private final BlacklistServiceImpl blacklistService;

    @Override
    @Transactional
    public TokenResponse login(LoginMemberReq loginMemberReq){

        // 1) 사용자 식별자로 토큰 레코드 조회
        MemberEntity member = memberRepository.findByMemberId(loginMemberReq.getMemberId())
                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

// 2) 비밀번호 검증
//    - passwordEncoder.matches(rawPassword, encodedPassword)
//    - 요청으로 들어온 평문 비밀번호와 DB에 저장된 암호문을 비교
        if (!passwordEncoder.matches(loginMemberReq.getMemberPw(),member.getMemberPw())){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다");
        }

        final String memberId = member.getMemberId();
        // 2) 기존 활성 리프레시 전부 무효화(멱등, 영향 행 0이어도 예외X)
        // log.debug("revoke-all-active refresh count={}", revoked);

        // 2) 비밀번호 검증
        //    - passwordEncoder.matches(rawPassword, encodedPassword)
        //    - 요청으로 들어온 평문 비밀번호와 DB에 저장된 암호문을 비교

        // 3) JWT 발급 (subject = 사용자 id)
        //    - AccessToken: 짧은 수명, 요청 인증에 사용
        //    - RefreshToken: 긴 수명, 재발급 용도
        String accessToken = jwtProvider.createAccessToken(memberId);
        String refreshToken = jwtProvider.createRefreshToken(memberId);

        // 4) 리프레시 만료시각 추출(권장) 또는 정책대로 계산
        Instant refreshExp = jwtProvider.getRefreshExpiration(refreshToken);

        // 5) 리프레시 해시 저장용(평문 금지)
        String refreshHash = tokenHash.sha256(refreshToken);

        // 6) UPSERT: 있으면 update(revokedAt=null로 재활성), 없으면 insert
        int updated = tokenRepository.upsertRefreshForMember(memberId, refreshHash, refreshExp);
        if (updated == 0) {
            // 행이 없던 경우만 새로 생성
            TokenEntity tokenEntity = TokenEntity.builder()
                    .memberId(memberId)
                    .refreshToken(refreshHash) // 해시값 저장
                    .expiresAt(refreshExp)
                    .revokedAt(null)
                    .build();
            tokenRepository.save(tokenEntity);
        }

        String role = Optional.ofNullable(member.getMemberRole())
                .map(Object::toString)      // Enum -> "ADMIN"
                .map(s -> s.startsWith("ROLE_") ? s.substring(5) : s)
                .map(String::toUpperCase)
                .orElse("USER");

        // 7) 응답
        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .memberRole(role)
                .build();
    }


    @Override
    public TokenResponse refresh(TokenRequest tokenRequest){

        // (A) 클라에서 받은 리프레시 평문 → 해시 계산
        String hash = tokenHash.sha256(tokenRequest.getRefreshToken());
        Instant now = Instant.now();
        // (B) DB에서 유효한 리프레시 찾기: 해시 일치 + 미회수 + 미만료
        TokenEntity tokenEntity = tokenRepository
                .findFirstByRefreshTokenAndRevokedAtIsNullAndExpiresAtAfter(hash, now)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh"));
        // (C) JWT 자체의 서명/만료/subject도 검증 (권장)
        Claims claims = jwtProvider.parseClaims(tokenRequest.getRefreshToken()); // 만료여도 e.getClaims() 사용 가능 구현이면 점검
        String memberId = claims.getSubject();
        // subject-DB 일치성(선택, 보안 강화)
        if (!memberId.equals(tokenEntity.getMemberId())) {
            // 토큰-DB 불일치 → 즉시 차단
            tokenEntity.setRevokedAt(now);
            tokenRepository.save(tokenEntity);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "mismatched subject");
        }
        // (D) 회전(rotate): 기존 리프레시 무효화
        tokenEntity.setRevokedAt(now);
        tokenRepository.save(tokenEntity);

//새로운 Access/Refresh 토큰 생성 (토큰 로테이션
        String newAccessToken = jwtProvider.createAccessToken(tokenEntity.getMemberId());
        String newRefreshToken = jwtProvider.createRefreshToken(tokenEntity.getMemberId());

// 새 refresh claims에서 exp 꺼내서 expiresAt 반영
        Instant newRefreshExp = jwtProvider.getRefreshExpiration(newRefreshToken);

// 같은 row에 새 해시로 교체 + 만료시각 갱신 + 철회 null로
        tokenEntity.setRefreshToken(tokenHash.sha256(newRefreshToken));
        tokenEntity.setExpiresAt(newRefreshExp);
        tokenEntity.setRevokedAt(null);
        tokenRepository.save(tokenEntity);

        String role = memberRepository.findByMemberId(memberId)
                .map(MemberEntity::getMemberRole)
                .map(Object::toString)
                .map(s -> s.startsWith("ROLE_") ? s.substring(5) : s)
                .map(String::toUpperCase)
                .orElse("USER");

//클라이언트에는 평문 새 토큰들을 반환
//AccessToken: 즉시 사용
//RefreshToken: 다음 갱신 때 클라이언트가 다시 제출
        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .memberRole(role)
                .build();
    }

    @Override
    @Transactional
    public void logout(TokenRequest tokenRequest) {
        // 0) 입력 검증
        String refreshPlain = Optional.ofNullable(tokenRequest.getRefreshToken())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "refresh 토큰이 필요합니다."));

        // 1) 리프레시 토큰 "전용" 검증 (Access 검증 금지)
        if (!jwtProvider.validateRefreshToken(refreshPlain)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "무효한 리프레시 토큰입니다.");
        }

        Instant now = Instant.now();

        // 2) 해시로 활성 리프레시 토큰 레코드 조회 (미회수 + 미만료)
        String refreshHash = tokenHash.sha256(refreshPlain);
        TokenEntity tok = tokenRepository
                .findFirstByRefreshTokenAndRevokedAtIsNullAndExpiresAtAfter(refreshHash, now)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이미 만료되었거나 회수된 토큰입니다."));

        // 3) subject 교차검증(보안 강화) — 토큰의 sub와 DB의 memberId가 같아야 함
        String subject = jwtProvider.getUsernameFlexible(refreshPlain); // 만료여도 Claims 가능
        if (!subject.equals(tok.getMemberId())) {
            // 의심스러운 상황: 해당 리프레시를 즉시 회수
            tok.setRevokedAt(now);
            tokenRepository.save(tok);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "토큰 소유자 불일치");
        }

        // 4) 리프레시 토큰 회수(로그아웃)
        tok.setRevokedAt(now);
        tokenRepository.save(tok);

        // (선택) 동일 사용자 활성 리프레시 전부 회수하고 싶으면 정책에 따라:
        // tokenRepository.revokeAllActiveByMemberId(subject, now);

        // 5) 액세스 토큰 블랙리스트(있으면) — 즉시 차단
        String accessPlain = tokenRequest.getAccessToken();
        if (accessPlain != null && !accessPlain.isBlank()) {
            // addToBlacklist(TokenRequest)는 내부에서 access 토큰을 파싱/만료시각 추출/해시 저장한다고 가정
            blacklistService.addToBlacklist(tokenRequest);
        }

        // 멱등성: 이미 회수/블랙리스트여도 예외 없이 위 흐름을 통과하도록 설계하는 게 보통 안전합니다.
    }
}