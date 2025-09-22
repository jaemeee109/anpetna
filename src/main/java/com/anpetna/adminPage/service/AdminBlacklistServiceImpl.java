package com.anpetna.adminPage.service;

import com.anpetna.adminPage.domain.AdminBlacklistEntity;
import com.anpetna.adminPage.dto.createBlacklist.CreateBlacklistReq;
import com.anpetna.adminPage.dto.deleteBlacklist.DeleteBlacklistRes;
import com.anpetna.adminPage.dto.readBlacklist.ReadBlacklistReq;
import com.anpetna.adminPage.dto.readBlacklist.ReadBlacklistRes;
import com.anpetna.adminPage.dto.updateBlacklist.UpdateBlacklistReq;
import com.anpetna.adminPage.dto.updateBlacklist.UpdateBlacklistRes;
import com.anpetna.adminPage.repository.AdminBlacklistJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.constant.MemberRole;




import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor // ★ final 필드 주입용 생성자 자동 생성
@Log4j2
public class AdminBlacklistServiceImpl implements AdminBlacklistService {




    /*의존성 주입*/
    private final AdminBlacklistJpaRepository adminBlacklistJpaRepository;
    private final MemberRepository memberRepository;  // ★ 추가

    /* 관리자 여부만 true/false 로 확인 */
    private boolean isAdmin() {
        // SecurityContext 에 인증이 있고, 권한 중 "ROLE_ADMIN"이 있는지 검사
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if ("ROLE_ADMIN".equals(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    /*======================================================================================================*/
    @Override
    public Long createBlacklistRes(String memberId, CreateBlacklistReq createBlacklistReq) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        // 1) 입력값 1차 검증
        if (memberId == null || memberId.isBlank()) {
            throw new IllegalArgumentException("memberId 필수 입력값 입니다");
        }
        if (createBlacklistReq == null || createBlacklistReq.getReason() == null || createBlacklistReq.getReason().isBlank()) {
            throw new IllegalArgumentException("사유는 필수 입력입니다");
        }
        if (createBlacklistReq.getDuration() == null || createBlacklistReq.getDuration().isBlank()) {
            throw new IllegalArgumentException("기간을 선택해주세요");
        }

        // 2) 만료시각 계산 (KST 기준)
        final ZoneId KST = ZoneId.of("Asia/Seoul");
        LocalDateTime now = LocalDateTime.now(KST);
        String duration = createBlacklistReq.getDuration().trim().toUpperCase(); // 소문자 들어와도 대응

        LocalDateTime untilAt;
        switch (duration) {
            case "D3" -> untilAt = now.plusDays(3);
            case "D5" -> untilAt = now.plusDays(5);
            case "D7" -> untilAt = now.plusDays(7);
            case "INDEFINITE" -> untilAt = null; // 무기한
            default -> throw new IllegalArgumentException("기간 선택은 필수입니다.");
        }

        // 3) 실제 조치한 관리자 ID(감사용) — SecurityContext 에서 추출
        String adminId = SecurityContextHolder.getContext().getAuthentication().getName();

        // 4) 엔티티 생성
        AdminBlacklistEntity entity = AdminBlacklistEntity.builder()
                .memberId(memberId)
                .blacklistReason(createBlacklistReq.getReason())
                .adminId(adminId)
                .untilAt(untilAt)
                .build();

        // 5) 저장 & 결과 반환
        AdminBlacklistEntity saved = adminBlacklistJpaRepository.save(entity);

        log.info("블랙리스트 생성: id={}, memberId={}, duration={}, untilAt={}, adminId={}",
                saved.getId(), memberId, duration, untilAt, adminId);

// ★ 블랙리스트 저장 직후, 회원 ROLE = BLACKLIST 로 동기화
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "존재하지 않는 회원입니다. memberId=" + memberId));

        if (member.getMemberRole() != MemberRole.BLACKLIST) {
            member.setMemberRole(MemberRole.BLACKLIST);
        }

        return saved.getId();

    }

    /*======================================================================================================*/
    @Override
    @Transactional(readOnly = true)
    public ReadBlacklistRes readBlacklistRes(ReadBlacklistReq readBlacklistReq, Pageable pageable) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        // 1) 파라미터 정리
        final ZoneId KST = ZoneId.of("Asia/Seoul");
        LocalDateTime now = LocalDateTime.now(KST);

        String keyword = (readBlacklistReq.getKeyword() == null || readBlacklistReq.getKeyword().isBlank())
                ? null : readBlacklistReq.getKeyword();
        boolean activeOnly = (readBlacklistReq.getActiveOnly() == null) ? true : readBlacklistReq.getActiveOnly();

        // (선택) 방어코드: 너무 큰 size 로 오는 걸 제한 (DoS 방지)
        int size = pageable.getPageSize();
        if (size > 100) {
            pageable = PageRequest.of(pageable.getPageNumber(), 100, pageable.getSort());
        }

        // 2) 레포 호출 (활성만 or 전체 이력)
        Page<AdminBlacklistEntity> page = activeOnly
                ? adminBlacklistJpaRepository.findActiveBlacklist(keyword, now, pageable)
                : adminBlacklistJpaRepository.findAllHistory(keyword, pageable);

        // 3) 엔티티 → DTO 매핑
        List<ReadBlacklistRes.Row> rows = page.getContent().stream().map(adminBlacklistEntity ->
                ReadBlacklistRes.Row.builder()
                        .id(adminBlacklistEntity.getId())
                        .memberId(adminBlacklistEntity.getMemberId())
                        .reason(adminBlacklistEntity.getBlacklistReason())
                        .adminId(adminBlacklistEntity.getAdminId())
                        .untilAt(adminBlacklistEntity.getUntilAt())
                        .active(adminBlacklistEntity.getUntilAt() == null || adminBlacklistEntity.getUntilAt().isAfter(now))
                        .createDate(adminBlacklistEntity.getCreateDate())
                        .latestDate(adminBlacklistEntity.getLatestDate())
                        .build()
        ).toList();

        // 4) 페이징 메타 포함 응답 생성
        return ReadBlacklistRes.builder()
                .content(rows)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .sort(pageable.getSort().toString())
                .build();
    }

    /*======================================================================================================*/
    @Override
    public UpdateBlacklistRes updateBlacklistRes(Long id, UpdateBlacklistReq updateBlacklistReq) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        // 1) 파라미터 검증: 둘 중 하나라도 작성해야함
        boolean hasReason = StringUtils.hasText(updateBlacklistReq.getReason());
        boolean hasDuration = StringUtils.hasText(updateBlacklistReq.getDuration());
        if (!hasReason && !hasDuration) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사유 또는 기한 중 하나는 수정되어야 합니다.");
        }

        // 2) 엔티티 로드
        AdminBlacklistEntity adminBlacklistEntity = adminBlacklistJpaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "블랙리스트에 존재하지 않습니다."));

        // 3) 수정 적용
        // 3-1) 사유 수정
        if (hasReason) {
            adminBlacklistEntity.setBlacklistReason(updateBlacklistReq.getReason().trim());
        }

        // 3-2) 기한 수정
        if (hasDuration) {
            // duration → untilAt 재계산 (KST 기준)
            final ZoneId KST = ZoneId.of("Asia/Seoul");
            LocalDateTime now = LocalDateTime.now(KST);

            String dur = updateBlacklistReq.getDuration().trim().toUpperCase();
            LocalDateTime untilAt;
            switch (dur) {
                case "D3" -> untilAt = now.plusDays(3);
                case "D5" -> untilAt = now.plusDays(5);
                case "D7" -> untilAt = now.plusDays(7);
                case "INDEFINITE" -> untilAt = null; // 무기한
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "기한은 D3|D5|D7|INDEFINITE 만 허용됩니다.");
            }
            adminBlacklistEntity.setUntilAt(untilAt);
        }

        // 4) 저장
        adminBlacklistJpaRepository.save(adminBlacklistEntity);

        // 5) 응답 DTO 구성
        final ZoneId KST = ZoneId.of("Asia/Seoul");
        LocalDateTime now = LocalDateTime.now(KST);
        boolean active = (adminBlacklistEntity.getUntilAt() == null) || adminBlacklistEntity.getUntilAt().isAfter(now);

        return UpdateBlacklistRes.builder()
                .id(adminBlacklistEntity.getId())
                .memberId(adminBlacklistEntity.getMemberId())
                .reason(adminBlacklistEntity.getBlacklistReason())
                .adminId(adminBlacklistEntity.getAdminId())
                .untilAt(adminBlacklistEntity.getUntilAt())
                .active(active)
                .createDate(adminBlacklistEntity.getCreateDate())   // BaseEntity 필드명에 맞게 조정
                .latestDate(adminBlacklistEntity.getLatestDate())
                .build();
    }

    /*======================================================================================================*/
    @Override
    public DeleteBlacklistRes deleteBlacklistRes(Long id) {
        // 0) 관리자 권한 검증
        if (!isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }

        // 1) 엔티티 조회
        AdminBlacklistEntity adminBlacklistEntity = adminBlacklistJpaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "블랙리스트가 존재하지 않습니다."));

        // 2) 현재 활성 판단
        final ZoneId KST = ZoneId.of("Asia/Seoul");
        LocalDateTime now = LocalDateTime.now(KST);
        boolean previouslyActive = (adminBlacklistEntity.getUntilAt() == null) || adminBlacklistEntity.getUntilAt().isAfter(now);

        // 3) 해제(논리 삭제): untilAt 을 now 로 설정
        // (이미 만료된 경우에도 idempotent 하게 그대로 저장/반환)
        // 블랙리스트 활성 조건이 (untilAt IS NULL OR untilAt > now) 이기 때문에, now 로 맞추면 즉시 비활성이 됨.
        // 레코드는 남으므로 이력에도 계속 노출됨
        adminBlacklistEntity.setUntilAt(now);
        adminBlacklistJpaRepository.save(adminBlacklistEntity);

        return DeleteBlacklistRes.builder()
                .id(adminBlacklistEntity.getId())
                .memberId(adminBlacklistEntity.getMemberId())
                .previouslyActive(previouslyActive)
                .nowActive(false)
                .untilAtAfter(adminBlacklistEntity.getUntilAt())
                .build();
    }

    /* 블랙리스트 -> 일반회원으로 복귀 메서드 추가 */
    public void deactivateAllActiveForMember(String memberId) {
        if (!isAdmin()) throw new AccessDeniedException("관리자 권한이 필요합니다.");

        final ZoneId KST = ZoneId.of("Asia/Seoul");
        LocalDateTime now = LocalDateTime.now(KST);

        // 활성 블랙리스트 모두 비활성화
        adminBlacklistJpaRepository.deactivateActiveForMember(memberId, now);

        // ROLE → USER 복귀
        MemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "존재하지 않는 회원입니다. memberId=" + memberId));
        if (member.getMemberRole() != MemberRole.USER) {
            member.setMemberRole(MemberRole.USER);
        }
    }




}
