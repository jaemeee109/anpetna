package com.anpetna.board.controller;

import com.anpetna.ApiResult;
import com.anpetna.board.dto.createComment.CreateCommReq;
import com.anpetna.board.dto.createComment.CreateCommRes;
import com.anpetna.board.dto.deleteComment.DeleteCommReq;
import com.anpetna.board.dto.deleteComment.DeleteCommRes;
import com.anpetna.board.dto.readComment.ReadCommReq;
import com.anpetna.board.dto.readComment.ReadCommRes;
import com.anpetna.board.dto.updateComment.UpdateCommReq;
import com.anpetna.board.dto.updateComment.UpdateCommRes;
import com.anpetna.board.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/comment")
public class CommentController {

    private final CommentService commentService;

    // 댓글 등록 (POST)===========================================================================================
    @PostMapping(value = "/create")
    @ResponseStatus(HttpStatus.CREATED) // ← 고정 201 (동적으로 바꾸려면 ResponseEntity 쓰세요)
    public ApiResult<CreateCommRes> create(@RequestBody CreateCommReq req) {
        var data = commentService.createComment(req);
        var body = new ApiResult<>(data);
        body.setResCode(HttpStatus.CREATED.value());
        body.setResMessage(HttpStatus.CREATED.name());
        return body;
    }

    // 목록 조회 (GET)===========================================================================================
    @GetMapping(value = "/read")
    public ApiResult<ReadCommRes> list(
            @RequestParam Long bno,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "cno") String sortBy
    ) {
        var req = new ReadCommReq();
        req.setBno(bno);
        req.setPage(page);
        req.setSize(size);
        req.setSortBy(sortBy);
        return new ApiResult<>(commentService.readComment(req));
    }

    // 내용 수정 (POST)===========================================================================================
    @PostMapping("/{cno}/update")
    public ApiResult<UpdateCommRes> update(@PathVariable Long cno, @RequestBody UpdateCommReq req) {
        req.setCno(cno);
        return new ApiResult<>(commentService.updateComment(req));
    }

    // 좋아요 +1 (POST)===========================================================================================
    @PostMapping("/{cno}/like")
    public ApiResult<UpdateCommRes> like(@PathVariable Long cno) {
        return new ApiResult<>(commentService.likeComment(cno));
    }

    // 삭제 (POST)===========================================================================================
    @PostMapping("/{cno}/delete")
    public ApiResult<DeleteCommRes> delete(@PathVariable Long cno) {
        var req = DeleteCommReq.builder().cno(cno).build();
        return new ApiResult<>(commentService.deleteComment(req));
    }
}
