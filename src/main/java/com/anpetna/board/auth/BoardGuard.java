package com.anpetna.board.auth;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.repository.BoardJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

@Component("boardGuard")
@RequiredArgsConstructor
public class BoardGuard {

    private final BoardJpaRepository boardRepo;

    /* ========= 공통 유틸 ========= */
    private boolean isAuth(Authentication a) {
        return a != null && a.isAuthenticated();
    }

    /*private boolean hasRole(Authentication a, String role) {
        if (a == null) return false;
        for (GrantedAuthority ga : a.getAuthorities()) {
            if (role.equals(ga.getAuthority())) return true;
        }
        return false;
    }*/

    private static final String ROLE_PREFIX = "ROLE_";

    /**
     * 문자열 권한을 ROLE_ 접두사 + 대문자로 표준화
     */
    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) return "";
        String up = role.trim().toUpperCase();
        return up.startsWith(ROLE_PREFIX) ? up : (ROLE_PREFIX + up);
    }

    /**
     * 단일 권한 검사 (ROLE 표준화 포함)
     */
    private boolean hasRole(Authentication a, String role) {
        if (a == null) return false;
        String wanted = normalizeRole(role);
        for (GrantedAuthority ga : a.getAuthorities()) {
            String have = normalizeRole(ga.getAuthority());
            if (have.equals(wanted)) return true;
        }
        return false;
    }

    /**
     * 여러 권한 중 하나라도 보유하면 true
     */
    private boolean hasAnyRole(Authentication a, String... roles) {
        if (a == null || roles == null || roles.length == 0) return false;
        for (String r : roles) {
            if (hasRole(a, r)) return true;
        }
        return false;
    }

    /**
     * 관리자 판별 — ADMIN/SUPER_ADMIN/MANAGER 등 포함
     */
    private boolean isAdmin(Authentication a) {
        return hasAnyRole(a, "ADMIN", "SUPER_ADMIN", "MANAGER", "ROLE_ADMIN" , "ROLE_1", "1");
    }


    private boolean isUser(Authentication a) {
        return hasRole(a, "ROLE_USER") || isAdmin(a);
    }

    private boolean isOwner(BoardEntity e, Authentication a) {
        return a != null && e != null && e.getBWriter() != null && e.getBWriter().equals(a.getName());
    }

    /* ========= 목록 접근 =========
       - NOTICE/FREE/FAQ: 모두 목록 조회 가능 (비회원 가능)
       - QNA: 목록 조회는 로그인 필요 (비회원 불가)
    */
    public boolean canList(String boardType, Authentication a) {
        if (boardType == null) return true;
        BoardType type = BoardType.valueOf(boardType.toUpperCase());
        return switch (type) {
            case NOTICE, FREE, FAQ -> true;
            case QNA -> isAuth(a); // “문의하기/나의문의내역”은 프론트 탭(view) 개념
            default -> true;
        };
    }

    /* ========= 상세 읽기 =========
   - NOTICE: 로그인 필수
   - FAQ   : 비회원 포함 모두 허용
   - FREE  : 로그인 필수
   - QNA   : 작성자 또는 관리자만
   - 비밀글: 작성자 또는 관리자만
    */
    public boolean canReadOne(Long bno, Authentication a) {
        BoardEntity e = boardRepo.findById(bno).orElse(null);
        if (e == null) return false;

        boolean owner = isOwner(e, a);
        boolean admin = isAdmin(a);

        // 비밀글이면 작성자 또는 관리자만
        if (Boolean.TRUE.equals(e.getIsSecret())) {
            return owner || admin;
        }

        return switch (e.getBoardType()) {
            case NOTICE -> isAuth(a);
            case FAQ -> true;
            case FREE -> isAuth(a);
            case QNA -> admin || owner;
            default -> true;
        };
    }

    /* ========= 글 등록 =========
       - NOTICE: 관리자만
       - FREE  : 회원 이상
       - FAQ   : 관리자만
       - QNA   : 회원 이상 (프론트 탭에서 “문의하기”가 글쓰기 의미)
    */
    public boolean canCreate(String boardType, Authentication a) {
        if (!isAuth(a)) return false;

        // ★ FIX: null 방어 (요청에 boardType 누락 시 500 방지)
        if (boardType == null || boardType.isBlank()) return false;

        BoardType type = BoardType.valueOf(boardType.toUpperCase());
        return switch (type) {
            case NOTICE -> isAdmin(a);
            case FREE -> isUser(a);
            case FAQ -> isAdmin(a);
            case QNA -> isUser(a);
            default -> isUser(a);
        };
    }

    /* ========= 글 수정 =========
       - NOTICE/FAQ: 관리자만
       - FREE/QNA  : 본인 또는 관리자
    */
    public boolean canUpdate(Long bno, Authentication a) {
        if (!isAuth(a)) return false;
        BoardEntity e = boardRepo.findById(bno).orElse(null);
        if (e == null) return false;

        return switch (e.getBoardType()) {
            case NOTICE, FAQ -> isAdmin(a);
            case FREE, QNA -> isAdmin(a) || isOwner(e, a);
            default -> isAdmin(a) || isOwner(e, a);
        };
    }

    /* ========= 글 삭제 =========
       - NOTICE/FAQ: 관리자만
       - FREE/QNA  : 본인 또는 관리자(관리자는 전체 삭제 가능)
    */
    public boolean canDelete(Long bno, Authentication a) {
        if (!isAuth(a)) return false;
        BoardEntity e = boardRepo.findById(bno).orElse(null);
        if (e == null) return false;

        return switch (e.getBoardType()) {
            case NOTICE, FAQ -> isAdmin(a);
            case FREE, QNA -> isAdmin(a) || isOwner(e, a);
            default -> isAdmin(a) || isOwner(e, a);
        };
    }

    /* ========= 댓글 등록/수정/삭제 =========
       - NOTICE: 회원 이상 등록 / 본인 수정삭제, 관리자 모든 댓글 삭제
       - FREE  : 회원 이상 등록 / 본인 수정삭제, 관리자 모든 댓글 삭제
       - FAQ   : 댓글 비활성(정책상 필요 시 관리자만 허용으로 변경 가능)
       - QNA   : 회원 이상 등록 / 본인 수정삭제, 관리자 모든 댓글 수정삭제
       ※ 실제 구현 시 CommentEntity/Repository 기준으로 owner 비교 필요
    */
    public boolean canCommentCreate(Long bno, Authentication a) {
        if (!isAuth(a)) return false;
        BoardEntity e = boardRepo.findById(bno).orElse(null);
        if (e == null) return false;

        return switch (e.getBoardType()) {
            case NOTICE, FREE -> isUser(a);
            case FAQ -> false; // 필요시 true로 변경
            case QNA -> isUser(a);
            default -> isUser(a);
        };
    }

    public boolean canCommentModify(boolean isOwner, Authentication a) {
        if (!isAuth(a)) return false;
        return isAdmin(a) || isOwner;
    }

    public boolean canCommentDelete(boolean isOwner, Authentication a) {
        if (!isAuth(a)) return false;
        return isAdmin(a) || isOwner;
    }
}
