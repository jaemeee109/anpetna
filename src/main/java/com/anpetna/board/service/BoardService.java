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
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import com.anpetna.board.dto.readAllBoard.ReadAllBoardReq;
import com.anpetna.board.dto.readAllBoard.ReadAllBoardRes;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface BoardService {

    // 1. 게시글 등록
    CreateBoardRes createBoard(CreateBoardReq createBoardReq, List<MultipartFile> files);

    // 2. 게시글 전체 조회 (페이징) //★ 수정
    /*ReadAllBoardRes readAllBoard(ReadAllBoardReq readAllBoardReq);*/
    // BoardService.java
    PageResponseDTO<BoardDTO> readAllBoard(PageRequestDTO pageRequestDTO);                       // 기존 것 유지
    PageResponseDTO<BoardDTO> readAll(BoardType type, String category, PageRequestDTO pr);      // 새로 추가

    // ★ 추가
    CreateBoardRes create(CreateBoardReq req, List<MultipartFile> files);

    // 3. 게시글 1개 상세 조회 + 조회수 증가
    ReadOneBoardRes readOneBoard(ReadOneBoardReq readOneBoardReq);

    // 4. 게시글 수정
    UpdateBoardRes updateBoard(UpdateBoardReq req, List<MultipartFile> addFiles, List<Long> deleteUuids, List<ImageOrderReq> orders);

    // 5. 게시글 삭제
    DeleteBoardRes deleteBoard(DeleteBoardReq deleteBoardReq);

    // 6. 게시글 좋아요 증가
    UpdateBoardRes likeBoard(Long bno);

}
