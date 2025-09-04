package com.anpetna.board.service;

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

    UpdateBoardRes likeBoard(Long bno, String memberId);
}
