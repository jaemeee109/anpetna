package com.anpetna.board.controller;

import com.anpetna.ApiResult;
import com.anpetna.board.dto.BoardDTO;
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
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/anpetna/board")
@RequiredArgsConstructor
@Validated
@Log4j2
public class BoardController {

    private final BoardService boardService;

    /* 게시글 등록 */
    @PostMapping(value = "/create", consumes = "application/json", produces = "application/json")
    public ApiResult<CreateBoardRes> createBoard(@Valid @RequestBody CreateBoardReq req) {
        log.info("[POST]/create req={}", req);
        return new ApiResult<>(boardService.createBoard(req));
    }

    /* 게시글 목록 + 페이징 + 검색 */
    @GetMapping(value = "/readAll", produces = "application/json")
    public ApiResult<PageResponseDTO<BoardDTO>> readAllBoard(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "type", required = false) String type,     // t,c,w 등의 조합
            @RequestParam(value = "keyword", required = false) String keyword
    ) {
        var pageRequest = new PageRequestDTO();
        pageRequest.setPage(page);
        pageRequest.setSize(size);
        pageRequest.setType(type);
        pageRequest.setKeyword(keyword);
        log.info("[GET]/readAll params page={}, size={}, type={}, keyword={}", page, size, type, keyword);
        return new ApiResult<>(boardService.readAllBoard(pageRequest));
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

    /* 게시글 수정 */
    @PostMapping(value = "/update/{bno}", consumes = "application/json", produces = "application/json")
    public ApiResult<UpdateBoardRes> updateBoard(
            @PathVariable Long bno,
            @Valid @RequestBody UpdateBoardReq req
    ) {
        req.setBno(bno);
        log.info("[POST]/update/{} req={}", bno, req);
        return new ApiResult<>(boardService.updateBoard(req));
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
