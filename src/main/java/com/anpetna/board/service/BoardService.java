package com.anpetna.board.service;

import com.anpetna.board.constant.BoardType;
import com.anpetna.board.dto.BoardDTO;
import com.anpetna.board.dto.ImageOrderReq;
import com.anpetna.board.dto.createBoard.CreateBoardReq;
import com.anpetna.board.dto.createBoard.CreateBoardRes;
import com.anpetna.board.dto.deleteBoard.DeleteBoardReq;
import com.anpetna.board.dto.deleteBoard.DeleteBoardRes;
import com.anpetna.board.dto.likeCountTop5.LikeCountTop5Res;
import com.anpetna.board.dto.noticeTop5.NoticeTop5Res;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardReq;
import com.anpetna.board.dto.readOneBoard.ReadOneBoardRes;
import com.anpetna.board.dto.updateBoard.UpdateBoardReq;
import com.anpetna.board.dto.updateBoard.UpdateBoardRes;
import com.anpetna.core.coreDto.PageRequestDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface BoardService {

    // 목록(검색 포함)
    PageResponseDTO<BoardDTO> readAllBoard(PageRequestDTO pageRequestDTO);
    PageResponseDTO<BoardDTO> readAll(BoardType type, String category, PageRequestDTO pageRequestDTO);

    // 상세 (회원 전용이면 컨트롤러에서 인증 체크 후 호출)
    ReadOneBoardRes readOneBoard(ReadOneBoardReq readOneBoardReq);

    // 생성/수정/삭제/좋아요 — ✅ memberId를 인자로 받음
    CreateBoardRes createBoard(CreateBoardReq req, List<MultipartFile> files, String memberId);
    CreateBoardRes create(CreateBoardReq req, List<MultipartFile> files, String memberId);

    UpdateBoardRes updateBoard(UpdateBoardReq req,
                               List<MultipartFile> addFiles,
                               List<UUID> deleteUuids,
                               List<ImageOrderReq> orders,
                               String memberId);

    DeleteBoardRes deleteBoard(DeleteBoardReq deleteBoardReq, String memberId);

    // likeBoard는 "토글" 의미로 동작하게 구현합니다.
    // 처음 누르면 → 좋아요 ON (+1)
    // 이미 눌린 상태에서 다시 누르면 → 좋아요 OFF (-1)
    // 멱등/동시성은 DB 유니크 제약 + 원자적 UPDATE로 보장
    UpdateBoardRes likeBoard(Long bno, String memberId);

    // NOTICE 중에서 최신순 5개
    List<NoticeTop5Res> getNoticeTop5();

    // FREE 게시물 중 좋아요 많은순 5개
    List<LikeCountTop5Res> getLikeCountTop5();
}
