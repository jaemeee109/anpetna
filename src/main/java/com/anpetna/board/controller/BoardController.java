package com.anpetna.board.controller;

import com.anpetna.ApiResult;
import com.anpetna.board.constant.BoardType;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.ImageOrderReq;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardRes;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.board.service.BoardService;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/board")
@RequiredArgsConstructor
@Validated
@Log4j2
public class BoardController {

    private final BoardService boardService;

    // ===========================================================
    /* 게시글 등록 (multipart: json + files[]) */
    @PreAuthorize("@boardGuard.canCreate("
            + "(#body.boardType != null ? #body.boardType.name() : null), "
            + "authentication)")
    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = "application/json")
    public ApiResult<CreateBoardRes> createBoard(
            @AuthenticationPrincipal UserDetails user,
            @RequestPart("json") @Valid CreateBoardReq body,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        if (user == null) throw new AccessDeniedException("로그인이 필요합니다.");
        String memberId = user.getUsername();
        log.info("[POST]/create by={}, images={}", memberId, files == null ? 0 : files.size());
        return new ApiResult<>(boardService.createBoard(body, files, memberId));
    }

    // ===========================================================


    @GetMapping(value = "/readAll", produces = "application/json")
    public ApiResult<PageResponseDTO<BoardDTO>> readAllBoard(
            @RequestParam(value = "boardType", required = false) BoardType boardType,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "keyword", required = false) String keyword,
            PageRequestDTO pageRequest,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails user
    ) {
        // 프런트에서 넘어온 검색 파라미터를 우선 세팅
        pageRequest.setType(type);
        pageRequest.setKeyword(keyword);

        // QNA의 "나의 문의내역" 처리: type=w (writer)
        if (boardType == BoardType.QNA && "w".equalsIgnoreCase(type)) {
            if (user == null) {
                throw new org.springframework.security.access.AccessDeniedException("로그인이 필요합니다.");
            }
            boolean isAdmin = user.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

            if (isAdmin) {
                // 관리자: 전체 문의글 보이게 검색조건 제거
                pageRequest.setType(null);
                pageRequest.setKeyword(null);
            } else {
                // 일반회원: 본인 글만
                pageRequest.setType("w");
                pageRequest.setKeyword(user.getUsername());
            }
        }

        PageResponseDTO<BoardDTO> res = boardService.readAll(boardType, category, pageRequest);
        return new ApiResult<>(res);

    }
    /* *//* 게시글 목록 + 페이징 + (선택)검색 *//*
    @PreAuthorize("@boardGuard.canList(#boardType, authentication)")
    @GetMapping(value = "/readAll", produces = "application/json")
    public ApiResult<PageResponseDTO<BoardDTO>> readAllBoard(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "type", required = false) String type,         // t,c,w
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "boardType", required = false) String boardType, // NOTICE/FREE/QNA/FAQ
            @RequestParam(value = "category", required = false) String category    // FAQ: 회원계정/주문·배송/…
    ) {
        var pageRequest = new PageRequestDTO();
        pageRequest.setPage(page);
        pageRequest.setSize(size);
        pageRequest.setType(type);
        pageRequest.setKeyword(keyword);
        pageRequest.setBoardType(boardType);

        log.info("[GET]/readAll page={}, size={}, type={}, keyword={}, boardType={}, category={}",
                page, size, type, keyword, boardType, category);

        // 문자열 boardType → enum 안전 변환
        BoardType bt = null;
        if (boardType != null && !boardType.isBlank()) {
            try {
                bt = BoardType.valueOf(boardType.toUpperCase());
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid boardType: {}", boardType);
            }
        }

        if (bt != null) {
            return new ApiResult<>(boardService.readAll(bt, category, pageRequest));
        } else {
            return new ApiResult<>(boardService.readAllBoard(pageRequest));
        }
    }
*/
    // ===========================================================
    /* 게시글 상세 (회원 전용으로 강제하려면 아래 가드 유지) + (옵션) 좋아요 증가 */
    @PreAuthorize("hasRole('ADMIN') or @boardGuard.canReadOne(#bno, authentication)")
    @GetMapping(value = "/readOne/{bno}", produces = "application/json")
    public ApiResult<ReadOneBoardRes> readOneBoard(
            @AuthenticationPrincipal UserDetails user, // 회원 전용이면 필요
            @PathVariable Long bno,
            @RequestParam(value = "like", defaultValue = "false") boolean like
    ) {
        // ※ “회원만 열람” 정책을 유지하려면 아래 가드를 활성화
        // if (user == null) throw new AccessDeniedException("로그인이 필요합니다.");

        log.info("[GET]/readOne/{} like={}", bno, like);

        // like=true로 들어온 경우는 회원만 허용
        if (like) {
            if (user == null) throw new AccessDeniedException("로그인이 필요합니다.");
            boardService.likeBoard(bno, user.getUsername());
        }

        return new ApiResult<>(boardService.readOneBoard(
                ReadOneBoardReq.builder().bno(bno).build()
        ));
    }

    // ===========================================================
    /* 게시글 수정 (multipart: json + addFiles[] + deleteUuids + orders) */
    @PreAuthorize("@boardGuard.canUpdate(#bno, authentication)")
    @PostMapping(value = "/update/{bno}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = "application/json")
    public ApiResult<UpdateBoardRes> updateBoard(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long bno,
            @RequestPart("json") UpdateBoardReq body,
            @RequestPart(value = "addFiles", required = false) List<MultipartFile> addFiles,
            @RequestPart(value = "deleteUuids", required = false) List<UUID> deleteUuids,
            @RequestPart(value = "orders", required = false) List<ImageOrderReq> orders
    ) {
        if (user == null) throw new AccessDeniedException("로그인이 필요합니다.");
        body.setBno(bno);
        log.info("[POST]/update/{} by={} addFiles={} del={} orders={}",
                bno, user.getUsername(),
                addFiles == null ? 0 : addFiles.size(),
                deleteUuids == null ? 0 : deleteUuids.size(),
                orders == null ? 0 : orders.size());
        return new ApiResult<>(boardService.updateBoard(body, addFiles, deleteUuids, orders, user.getUsername()));
    }

    // ===========================================================
    /* 게시글 삭제 */
    @PreAuthorize("@boardGuard.canDelete(#bno, authentication)")
    @PostMapping(value = "/delete/{bno}", produces = "application/json")
    public ApiResult<DeleteBoardRes> deleteBoard(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long bno
    ) {
        if (user == null) throw new AccessDeniedException("로그인이 필요합니다.");
        log.info("[POST]/delete/{} by={}", bno, user.getUsername());
        return new ApiResult<>(boardService.deleteBoard(
                DeleteBoardReq.builder().bno(bno).build(),
                user.getUsername()
        ));
    }

    // ===========================================================
    /* 좋아요 1 증가 (별도 엔드포인트) */
    @PostMapping(value = "/like/{bno}", produces = "application/json")
    public ApiResult<UpdateBoardRes> likeBoard(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long bno
    ) {
        if (user == null) throw new AccessDeniedException("로그인이 필요합니다.");
        log.info("[POST]/like/{} by={}", bno, user.getUsername());
        return new ApiResult<>(boardService.likeBoard(bno, user.getUsername()));
    }
}
// ===========================================================
// readOne: “회원만 열람” 정책을 유지하려면 주석 처리된 가드를 켜세요. 
// (프론트가 비회원에서도 상세를 열 수 있어야 한다면 주석 그대로 두면 됩니다. 대신 like=true로 들어오는 경우만 회원 요구)

//나머지 엔드포인트는 회원 필수이므로 @AuthenticationPrincipal로 UserDetails를 받고, user == null이면 AccessDeniedException으로 막습니다.

//응답 형태(ApiResult<...>)와 경로(/board/**)는 기존 그대로라 프론트 변경 불필요입니다.
/// / ===========================================================