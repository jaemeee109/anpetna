package com.anpetna.board.controller;

import com.anpetna.ApiResult;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardRes;
import com.anpetna.board.dto.readAllBoard.ReadAllBoardReq;
import com.anpetna.board.dto.readAllBoard.ReadAllBoardRes;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.board.service.BoardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping(value = "anpetna/board")
@Log4j2
@RequiredArgsConstructor //final 을 붙인 필드로 생성자 만듬.
public class BoardController {

    @Autowired
    private final BoardService boardService;

    // 1. 게시물 등록=========================================================================================
    @GetMapping("/create")
    public void createBoardGet() {

    }

    @PostMapping("/create")
    public ApiResult<CreateBoardRes> createBoardReq(@RequestBody CreateBoardReq createBoardReq) {

        var result = boardService.createBoard(createBoardReq);
        return new ApiResult<>(result);
    }

    // 2. 게시물 전체 보기 + 좋아요수 증가======================================================================
 /*  @GetMapping("/readAll/{bno}")
    @ResponseBody
    public ApiResult<ReadAllBoardRes> readAllBoard(@RequestBody ReadAllBoardReq readAllBoardReq) {
        var request = new ReadAllBoardReq();  // 현재는 조회 조건 없음
        var result = boardService.readAllBoard(request);
        return new ApiResult<>(result);
    }*/

    // 3. 게시물 하나 보기 + 조회수 증가========================================================================
    @GetMapping("/readOne/{bno}")
    @ResponseBody
    public ApiResult<ReadOneBoardRes> readOneBoardReq(@PathVariable("bno") Long bno) {

        var request = ReadOneBoardReq.builder()
                .bno(bno)
                .build();

        var result = boardService.readOneBoard(request);
        return new ApiResult<>(result);
    }

    // 4. 게시물 수정 하기=====================================================================================
    @PostMapping("/update/{bno}")
    @ResponseBody
    public ApiResult<UpdateBoardRes> updateBoardReq(
            @PathVariable("bno") Long bno,
            @RequestBody UpdateBoardReq updateBoardReq) {

        /*var request = UpdateBoardReq.builder()
                .bno(bno)
                .build();*/

        updateBoardReq.setBno(bno);
        var result = boardService.updateBoard(updateBoardReq);
        return new ApiResult<>(result);
    }

    // 5. 게시물 삭제 하기=====================================================================================
    @PostMapping("/delete/{bno}")
    @ResponseBody
    public ApiResult<DeleteBoardRes> deleteBoardReq(@PathVariable("bno") Long bno) {

        var request = DeleteBoardReq.builder()
                .bno(bno)
                .build();

        var result = boardService.deleteBoard(request);
        return new ApiResult<>(result);
    }
}
