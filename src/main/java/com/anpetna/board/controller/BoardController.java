package com.anpetna.board.controller;

import com.anpetna.ApiResult;
import com.anpetna.board.constant.BoardType; // ★ enum import
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
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(value = "/anpetna/board")
@RequiredArgsConstructor
@Validated
@Log4j2
public class BoardController {

    private final BoardService boardService;

    /* 게시글 등록
    @PostMapping(value = "/create", consumes = "application/json", produces = "application/json")
    public ApiResult<CreateBoardRes> createBoard(@Valid @RequestBody CreateBoardReq req) {
        log.info("[POST]/create req={}", req);
        return new ApiResult<>(boardService.create(req)); // ★ 인터페이스 시그니처에 맞춰 변경
    }*/

    /* 게시글 등록 25.08.27 수정 */
    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = "application/json")
    public ApiResult<CreateBoardRes> createBoard(
            @RequestPart("json") @Valid CreateBoardReq body,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        log.info("[POST]/create multipart, images={}", files == null ? 0 : files.size());
        return new ApiResult<>(boardService.createBoard(body, files));
    }

    /* 게시글 목록 + 페이징 + 검색 */
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
        pageRequest.setBoardType(boardType); // 필요하면 유지

        log.info("[GET]/readAll page={}, size={}, type={}, keyword={}, boardType={}, category={}",
                page, size, type, keyword, boardType, category); // ★ 로그 포맷 수정

        // ★ boardType 문자열을 enum으로 안전 변환
        BoardType bt = null;
        if (boardType != null && !boardType.isBlank()) {
            try {
                bt = BoardType.valueOf(boardType.toUpperCase());
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid boardType: {}", boardType);
            }
        }

        // ★ boardType이 유효하면 카테고리 필터 버전 호출, 아니면 기존 목록 호출
        if (bt != null) {
            return new ApiResult<>(boardService.readAll(bt, category, pageRequest));
        } else {
            return new ApiResult<>(boardService.readAllBoard(pageRequest));
        }
    }

    /* 게시글 상세 + 조회수 증가 + 좋아요 */
    @GetMapping(value = "/readOne/{bno}", produces = "application/json")
    public ApiResult<ReadOneBoardRes> readOneBoard(
            @PathVariable Long bno,
            @RequestParam(value = "like", defaultValue = "false") boolean like
    ) {
        log.info("[GET]/readOne/{} like={}", bno, like);
        if (like) {
            boardService.likeBoard(bno);
        }
        return new ApiResult<>(boardService.readOneBoard(
                ReadOneBoardReq.builder().bno(bno).build()
        ));
    }

    /* 게시글 수정
    @PostMapping(value = "/update/{bno}", consumes = "application/json", produces = "application/json")
    public ApiResult<UpdateBoardRes> updateBoard(
            @PathVariable Long bno,
            @Valid @RequestBody UpdateBoardReq req
    ) {
        req.setBno(bno);
        log.info("[POST]/update/{} req={}", bno, req);
        return new ApiResult<>(boardService.updateBoard(req));
    }*/

    /* 08.27 게시글 수정 컨트롤러 수정 */
    @PostMapping(value = "/update/{bno}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = "application/json")
    public ApiResult<UpdateBoardRes> updateBoard(
            @PathVariable Long bno,
            @RequestPart("json") UpdateBoardReq body, // 제목/내용/noticeFlag/isSecret 등
            @RequestPart(value = "addFiles", required = false) List<MultipartFile> addFiles, // 새로 추가
            @RequestPart(value = "deleteUuids", required = false) List<Long> deleteUuids,    // 삭제할 이미지 UUID 목록
            @RequestPart(value = "orders", required = false) List<ImageOrderReq> orders      // 정렬 변경용 {uuid, sortOrder}
    ) {
        body.setBno(bno);
        return new ApiResult<>(boardService.updateBoard(body, addFiles, deleteUuids, orders));
    }

    /* 게시글 삭제 */
    @PostMapping(value = "/delete/{bno}", produces = "application/json")
    public ApiResult<DeleteBoardRes> deleteBoard(@PathVariable Long bno) {
        log.info("[POST]/delete/{}", bno);
        return new ApiResult<>(boardService.deleteBoard(
                DeleteBoardReq.builder().bno(bno).build()
        ));
    }

    /* 좋아요 1 증가 (별도 엔드포인트) */
    @PostMapping(value = "/like/{bno}", produces = "application/json")
    public ApiResult<UpdateBoardRes> likeBoard(@PathVariable Long bno) {
        log.info("[POST]/like/{}", bno);
        return new ApiResult<>(boardService.likeBoard(bno));
    }
}
