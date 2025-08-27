package com.anpetna.auth.service;

import com.anpetna.auth.domain.TokenEntity;
import com.anpetna.auth.dto.LoginMemberReq;
import com.anpetna.auth.dto.TokenRequest;
import com.anpetna.auth.dto.TokenResponse;
import com.anpetna.auth.repository.TokenRepository;
import com.anpetna.auth.util.TokenHash;
import com.anpetna.config.JwtProvider;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.AttributeAccessor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

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
        Instant refreshExp = jwtProvider.parseClaims(refreshToken).getExpiration().toInstant();

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

        // 7) 응답
        return new TokenResponse(accessToken, refreshToken);
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


//        //클라이언트가 보낸 refreshToken의 유효성 검사
//        if(!jwtProvider.validateToken(tokenRequest.getRefreshToken())){
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "무효한 토큰입니다");
//        }
//
//        //refreshToken의 subject(사용자 식별자)를 추출
//        String id = jwtProvider.getUsername(tokenRequest.getRefreshToken());
//
//        //DB에서 해당 사용자의 토큰 레코드 조회
//        TokenEntity tokenEntity = tokenRepository.findByTokenMemberId(id)
//                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
//
////요청으로 받은 refreshToken을 sha256으로 해싱
////평문 토큰을 DB에 보관하지 않기 위해 해시로 비교 (유출 대비)
//        String reqRefreshToken = tokenHash.sha256(tokenRequest.getRefreshToken()); //요청받은 refresh토큰을 hash로 변환
//
//
//
////DB에 저장된 해시값과 비교 (불일치 시 위조/재사용/오류로 간주)
//        if (!reqRefreshToken.equals(tokenEntity.getRefreshToken())){
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "발급받은 토큰이 맞지 않습니다");
//        }

//새로운 Access/Refresh 토큰 생성 (토큰 로테이션
        String newAccessToken = jwtProvider.createAccessToken(tokenEntity.getMemberId());
        String newRefreshToken = jwtProvider.createRefreshToken(tokenEntity.getMemberId());

//새 refresh 토큰은 DB에 '해시'로 저장 (평문 저장 금지)
        tokenEntity.setRefreshToken(tokenHash.sha256(newRefreshToken));
        tokenRepository.save(tokenEntity);

//클라이언트에는 평문 새 토큰들을 반환
//AccessToken: 즉시 사용
//RefreshToken: 다음 갱신 때 클라이언트가 다시 제출
        return new TokenResponse(newAccessToken, newRefreshToken);
    }

    @Override
    public void logout(TokenRequest tokenRequest){
        //클라이언트가 보낸 refreshToken의 유효성 검사
        if(!jwtProvider.validateToken(tokenRequest.getRefreshToken())){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "무효한 토큰입니다");
        }

        String id = jwtProvider.getUsername(tokenRequest.getRefreshToken());

        TokenEntity tokenEntity = tokenRepository.findByTokenMemberId(id)
                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        String reqRefreshToken = tokenHash.sha256(tokenRequest.getRefreshToken()); //요청받은 refresh토큰을 hash로 변환

        //DB에 저장된 해시값과 비교 (불일치 시 위조/재사용/오류로 간주)
        if (!reqRefreshToken.equals(tokenEntity.getRefreshToken())){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "토큰이 맞지 않습니다");
        }

        //Refresh Token 무효화 (삭제 or revoke)
        tokenRepository.revokeByMemberId(tokenEntity.getMemberId());

        //Access Token 즉시 차단 → 블랙리스트 서비스에 “그대로” 전달
        //당신의 BlacklistServiceImpl은 토큰 원문을 받아 내부에서 parse + exp 확인 + 해시 저장을 처리합니다.
        blacklistService.addToBlacklist(tokenRequest);

        // 3) 멱등성: 이미 무효화/블랙리스트여도 예외 없이 통과
    }
}
