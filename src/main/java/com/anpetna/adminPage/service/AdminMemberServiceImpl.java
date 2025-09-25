package com.anpetna.adminPage.service;

import com.anpetna.adminPage.dto.AdminPageDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
@Log4j2
public class AdminMemberServiceImpl implements AdminMemberService {

    /*의존성 주입*/
    private final MemberRepository memberRepository;

    /*======================================================================================================*/
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AdminPageDTO> readAllMembers(String searchKeyword, Pageable pageable) {

        // 1) 검색 조건 빌드 (검색어가 없으면 전체 조회)
        Specification<MemberEntity> memberEntitySpecification = buildSearchSpec(searchKeyword, false);

        // 2) 페이징 조회
        Page<MemberEntity> page = memberRepository.findAll(memberEntitySpecification, pageable);

        // 3) PageResponseDTO 로 변환 (프로젝트 표준)
        return PageResponseDTO.toDTO(page, this::toAdminPageDTO, pageable);
    }

    /*======================================================================================================*/
    @Override
    public void grantAdminRole(String memberId) {
        // 1) 대상 회원 조회 (없으면 에러)
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. memberId=" + memberId));

        // 2) 역할을 ADMIN 으로 변경 (이미 ADMIN 이면 그대로 둠)
        if (member.getMemberRole() != MemberRole.ADMIN) {
            member.setMemberRole(MemberRole.ADMIN);
        }
        // @Transactional 이므로 Dirty Checking 으로 자동 반영됩니다.
    }

    /*======================================================================================================*/
    @Override
    public void revokeAdminRole(String memberId) {
        // 1) 대상 회원 조회 (없으면 에러)
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. memberId=" + memberId));

        // 2) 현재 역할이 ADMIN 인 경우에만 USER 로 변경
        if (member.getMemberRole() == MemberRole.ADMIN) {
            member.setMemberRole(MemberRole.USER);
        }
        // 참고: BLACKLIST 인 경우 관리자 해제 대상이 아니므로 변경하지 않습니다.
    }

    /*======================================================================================================*/
    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<AdminPageDTO> readBlacklistMembers(String searchKeyword, Pageable pageable) {

        // 1) "블랙리스트만" 보도록 조건에 ROLE = BLACKLIST 추가
        Specification<MemberEntity> spec = buildSearchSpec(searchKeyword, true);

        // 2) 페이징 조회
        Page<MemberEntity> page = memberRepository.findAll(spec, pageable);

        // 3) 표준 페이지 DTO 로 변환
        return PageResponseDTO.toDTO(page, this::toAdminPageDTO, pageable);
    }

    /*======================================================================================================*/

    /*
     * 헬퍼
     * Admin 페이지 표 행으로 쓰기 좋은 DTO 로 변환 (필요한 최소 필드만)
     */
    private AdminPageDTO toAdminPageDTO(MemberEntity memberEntity) {
        return AdminPageDTO.builder()
                .memberId(memberEntity.getMemberId())
                .name(memberEntity.getMemberName())
                .email(memberEntity.getMemberEmail())
                .role(memberEntity.getMemberRole())
                .phone(memberEntity.getMemberPhone())
                .build();
    }

    /*======================================================================================================*/

    // ✅ 여기(클래스 내부)에 위치해야 합니다.
    private MemberRole parseRoleKeyword(String raw) {
        if (raw == null) return null;
        String s = raw.trim().toLowerCase(Locale.ROOT);
        // 한국어/영어 키워드 모두 대응
        if (s.equals("관리") || s.equals("관리자") || s.equals("admin")) return MemberRole.ADMIN;
        if (s.equals("회원") || s.equals("user")) return MemberRole.USER;
        if (s.equals("블랙") || s.equals("블랙리스트") || s.equals("black") || s.equals("blacklist")) return MemberRole.BLACKLIST;
        return null;
    }

    /*
     * 검색 스펙 조립
     * @param searchKeyword null/blank 이면 검색 안 함
     * @param blacklistOnly true 이면 ROLE = BLACKLIST 강제
     */
    private Specification<MemberEntity> buildSearchSpec(String searchKeyword, boolean blacklistOnly) {
        Specification<MemberEntity> spec = Specification.where(null);

        if (searchKeyword != null && !searchKeyword.isBlank()) {
            final String kw = searchKeyword.trim();
            final String kwLower = kw.toLowerCase(Locale.ROOT);
            final MemberRole roleToken = parseRoleKeyword(kw);

            spec = spec.and((root, query, cb) -> {
                // ✅ 중복 제거 (페이지가 “안 바뀌는 것처럼” 보이는 현상 방지)
                query.distinct(true);

                // 문자열 컬럼만 lower+like (ENUM/숫자엔 lower() 금지)
                var byId    = cb.like(cb.lower(root.get("memberId")),    "%" + kwLower + "%");
                var byName  = cb.like(cb.lower(root.get("memberName")),  "%" + kwLower + "%");
                var byEmail = cb.like(cb.lower(root.get("memberEmail")), "%" + kwLower + "%");
                var byPhone = cb.like(cb.lower(root.get("memberPhone")), "%" + kwLower + "%");

                // 기본 OR 묶음
                var orPred = cb.or(byId, byName, byEmail, byPhone);

                // ✅ 역할 키워드가 인식되면, ENUM은 LIKE 대신 equals 로만 추가 (DB 방언 안전)
                if (roleToken != null) {
                    orPred = cb.or(orPred, cb.equal(root.get("memberRole"), roleToken));
                }
                return orPred;
            });
        }

        if (blacklistOnly) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("memberRole"), MemberRole.BLACKLIST));
        }
        return spec;
    }
}
