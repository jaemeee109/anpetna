package com.anpetna.board.service;

import com.anpetna.board.dto.createComment.CreateCommReq;
import com.anpetna.board.dto.createComment.CreateCommRes;
import com.anpetna.board.dto.deleteComment.DeleteCommReq;
import com.anpetna.board.dto.deleteComment.DeleteCommRes;
import com.anpetna.board.dto.readComment.ReadCommReq;
import com.anpetna.board.dto.readComment.ReadCommRes;
import com.anpetna.board.dto.updateComment.UpdateCommReq;
import com.anpetna.board.dto.updateComment.UpdateCommRes;

public interface CommentService {

    // 1. 댓글 등록
    CreateCommRes createComment(CreateCommReq createCommReq);

    // 2. 댓글 보기
    ReadCommRes readComment(ReadCommReq readCommReq);

    // 3. 댓글 수정
    UpdateCommRes updateComment(UpdateCommReq updateCommReq);

    // 4. 댓글 삭제
    DeleteCommRes deleteComment(DeleteCommReq deleteCommReq);

    // 5. 댓글 좋아요
    // 아래 likeComment는 "토글" 의미로 동작하게 구현합니다.
    // 최초 클릭: 좋아요 ON (+1)
    // 다시 클릭: 좋아요 OFF (-1)
    UpdateCommRes likeComment(Long cno);
}
