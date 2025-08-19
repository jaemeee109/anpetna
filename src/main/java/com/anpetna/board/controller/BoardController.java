package com.anpetna.board.controller;

import com.anpetna.ApiResult;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping(value = "anpetna/board")
@Log4j2
@RequiredArgsConstructor //final 을 붙인 필드로 생성자 만듬.
public class BoardController {


    private final BoardService boardService;

    // 1. 게시물 등록=========================================================================================
    /*@PostMapping("/create")
    public ApiResult<CreateBoardRes> createBoard(@RequestBody CreateBoardReq createBoardReq) {
        return new ApiResult<>(boardService.createBoard(createBoardReq));
    }*/
    @PostMapping("/create")
    public ApiResult<?> createBoard(@RequestBody Map<String, Object> body) {
        log.info("[DEBUG] incoming keys={}", body.keySet());// 여기에 bContent인지 b_content인지 찍힘
        // 바로 실패 응답으로 돌려도 됨
        return new ApiResult<>(body);
    }

   // 2. 게시물 전체 + 페이징 + 검색 ======================================================================
    @GetMapping("/readAll")
    public ApiResult<PageResponseDTO<?>> readAllBoard(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "type", required = false) String type,     // 검색 조건 (t,c,w 등)
            @RequestParam(value = "keyword", required = false) String keyword // 검색어
    ) {
        PageRequestDTO pageRequest = new PageRequestDTO();
        pageRequest.setPage(page);
        pageRequest.setSize(size);
        pageRequest.setType(type);
        pageRequest.setKeyword(keyword);

        return new ApiResult<>(boardService.readAllBoard(pageRequest));
    }


    //3. 게시글 상세 조회 + 조회수 증가 + 좋아요 가능====================================================================

    @GetMapping("/readOne/{bno}")
    public ApiResult<ReadOneBoardRes> readOneBoard(
            @PathVariable Long bno,
            @RequestParam(value = "like", defaultValue = "false") boolean like
    ) {
        // 좋아요
        if (like) {
            boardService.likeBoard(bno);
        }

        // 게시글 상세 조회 (조회수 증가 포함)
        return new ApiResult<>(boardService.readOneBoard(
                ReadOneBoardReq.builder().bno(bno).build()
        ));
    }

    // 4. 게시물 수정 하기=====================================================================================
    @PostMapping("/update/{bno}")
    public ApiResult<UpdateBoardRes> updateBoard(
            @PathVariable Long bno,
            @RequestBody UpdateBoardReq req
    ) {
        req.setBno(bno);
        return new ApiResult<>(boardService.updateBoard(req));
    }

    // 5. 게시물 삭제 하기=====================================================================================
    @PostMapping("/delete/{bno}")
    public ApiResult<DeleteBoardRes> deleteBoard(@PathVariable Long bno) {
        return new ApiResult<>(boardService.deleteBoard(
                DeleteBoardReq.builder().bno(bno).build()
        ));
    }

   /* // 6. 게시글 좋아요
    @PostMapping("/like/{bno}")
    public ApiResult<UpdateBoardRes> likeBoard(@PathVariable Long bno) {
        return new ApiResult<>(boardService.likeBoard(bno));
    }*/
}
