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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

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

        TokenEntity tokenEntity = TokenEntity.builder()
                .memberId(member.getMemberId())
                .build();

        // 2) 비밀번호 검증
        //    - passwordEncoder.matches(rawPassword, encodedPassword)
        //    - 요청으로 들어온 평문 비밀번호와 DB에 저장된 암호문을 비교

        // 3) JWT 발급 (subject = 사용자 id)
        //    - AccessToken: 짧은 수명, 요청 인증에 사용
        //    - RefreshToken: 긴 수명, 재발급 용도
        String accessToken = jwtProvider.createAccessToken(tokenEntity.getMemberId());
        String refreshToken = jwtProvider.createRefreshToken(tokenEntity.getMemberId());
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(15);

        // 4) RefreshToken 저장
        //    - 평문 저장은 위험하므로 해시(sha256)로 변환해 저장 (유출 피해 최소화)
        tokenEntity.setRefreshToken(tokenHash.sha256(refreshToken));
        tokenRepository.save(tokenEntity);

        // 5) 클라이언트에 새 토큰 반환
        return new TokenResponse(accessToken, refreshToken);
    }

    @Override
    public TokenResponse refresh(TokenRequest tokenRequest){

        //클라이언트가 보낸 refreshToken의 유효성 검사
        if(!jwtProvider.validateToken(tokenRequest.getRefreshToken())){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "무효한 토큰입니다");
        }

        //refreshToken의 subject(사용자 식별자)를 추출
        String id = jwtProvider.getUsername(tokenRequest.getRefreshToken());

        //DB에서 해당 사용자의 토큰 레코드 조회
        TokenEntity tokenEntity = tokenRepository.findByTokenMemberId(id)
                .orElseThrow(()-> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

//요청으로 받은 refreshToken을 sha256으로 해싱
//평문 토큰을 DB에 보관하지 않기 위해 해시로 비교 (유출 대비)
        String reqRefreshToken = tokenHash.sha256(tokenRequest.getRefreshToken()); //요청받은 refresh토큰을 hash로 변환



//DB에 저장된 해시값과 비교 (불일치 시 위조/재사용/오류로 간주)
        if (!reqRefreshToken.equals(tokenEntity.getRefreshToken())){
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "발급받은 토큰이 맞지 않습니다");
        }

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
