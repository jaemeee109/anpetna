package com.anpetna.board.service;

import com.anpetna.board.domain.BoardEntity;
import com.anpetna.board.dto.BoardDTO;
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
import com.anpetna.board.repository.BoardJpaRepository;
import com.anpetna.coreDomain.ImageEntity;
import com.anpetna.coreDto.PageRequestDTO;
import com.anpetna.coreDto.PageResponseDTO;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BoardServiceImpl implements BoardService {


    private final BoardJpaRepository boardJpaRepository; // 의존성 주입

    //=================================================================================
    @Transactional
    public CreateBoardRes createBoard(CreateBoardReq req) {

        BoardEntity board = BoardEntity.builder()
                .bWriter(req.getBWriter())
                .bTitle(req.getBTitle())
                .bContent(req.getBContent())
                .boardType(req.getBoardType())
                .noticeFlag(Boolean.TRUE.equals(req.getNoticeFlag()))
                .isSecret(Boolean.TRUE.equals(req.getIsSecret()))
                .bViewCount(req.getBViewCount() == null ? 0 : req.getBViewCount())
                .bLikeCount(req.getBLikeCount() == null ? 0 : req.getBLikeCount())
                .build();

        if (req.getImages() != null) {
            for (var img : req.getImages()) {
                ImageEntity.forBoard(img.getFileName(), img.getUrl(), board, img.getSortOrder());
            }
        }

        var saved = boardJpaRepository.save(board);
        return CreateBoardRes.builder().createBoard(saved).build();
    }
    /* @Override
    public CreateBoardRes createBoard(CreateBoardReq createBoardReq) {

        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration().setSkipNullEnabled(true);

        modelMapper.typeMap(CreateBoardReq.class, BoardEntity.class)
                .addMappings(mapper -> mapper.skip(BoardEntity::setImages));

        //  DTO -> Entity
        BoardEntity board = modelMapper.map(createBoardReq, BoardEntity.class);

        // 이미지 첨부 (이미 attachToBoard 내부에서 양방향 설정 처리됨)
        if (createBoardReq.getImages() != null) {
            for (var imgDto : createBoardReq.getImages()) {
                ImageEntity.forBoard(imgDto.getFileName(), imgDto.getUrl(), board, imgDto.getSortOrder());
            }
        }

        //  저장
        BoardEntity saved = boardJpaRepository.save(board);

        //  반환
        return CreateBoardRes.builder()
                .createBoard(saved)
                .build();
    }*/


    //=================================================================================
    @Override
    public PageResponseDTO<BoardDTO> readAllBoard(PageRequestDTO pageRequestDTO) {

        var pageable = pageRequestDTO.getPageable("createDate"); // 최신순 정렬
        var types = pageRequestDTO.getTypes();
        var keyword = pageRequestDTO.getKeyword();

        // 검색 메서드 사용
        var page = boardJpaRepository.search(pageable, types, keyword);

        // BoardEntity -> BoardDTO 변환
        List<BoardDTO> dtoList = page.stream()
                .map(BoardDTO::new)
                .toList();

        // PageResponseDTO 생성
        return PageResponseDTO.<BoardDTO>withAll()
                .pageRequestDTO(pageRequestDTO)
                .dtoList(dtoList)
                .total((int) page.getTotalElements())
                .build();
    }


    //=================================================================================
    @Override
    public ReadOneBoardRes readOneBoard(ReadOneBoardReq readOneBoardReq) {

        var boardEntity = boardJpaRepository.findById(readOneBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));


        // 조회수 증가
        boardEntity.setBViewCount(boardEntity.getBViewCount() + 1);
        //이미지
        List<ImageEntity> images = boardEntity.getImages();

        return ReadOneBoardRes.builder()
                .readOneBoard(boardEntity)
                .build();
    }

    //=================================================================================

    @Override
    public UpdateBoardRes updateBoard(UpdateBoardReq updateBoardReq) {

        // 1. DB에서 기존 게시글 조회
        BoardEntity boardEntity = boardJpaRepository.findById(updateBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글 입니다."));

        // 2. 제목/내용 업데이트
        if (updateBoardReq.getBTitle() != null) boardEntity.setBTitle(updateBoardReq.getBTitle());
        if (updateBoardReq.getBContent() != null) boardEntity.setBContent(updateBoardReq.getBContent());

        // 3. 이미지 업데이트
        if (updateBoardReq.getImages() != null) {
            // 기존 이미지 삭제
            boardEntity.getImages().clear();

            // 새로운 이미지 추가 (attachToBoard 내부에서 양방향 처리)
            for (var imgDto : updateBoardReq.getImages()) {
                ImageEntity.forBoard(imgDto.getFileName(), imgDto.getUrl(), boardEntity, imgDto.getSortOrder());
            }
        }

        boardJpaRepository.flush();

        return UpdateBoardRes.builder()
                .updateBoard(boardEntity)
                .build();
    }
    //=================================================================================
    @Override
    public DeleteBoardRes deleteBoard(DeleteBoardReq deleteBoardReq) {

        BoardEntity board = boardJpaRepository.findById(deleteBoardReq.getBno())
                .orElseThrow(() -> new RuntimeException("게시글 없음"));

        boardJpaRepository.delete(board);

        return DeleteBoardRes.builder().deleteBoard(board).build();

    }
        /*Long bno = deleteBoardReq.getBno();

        var boardEntity = boardJpaRepository.findById(bno)
                .orElseThrow(() -> {
                            throw new RuntimeException("존재하지 않는 게시글 입니다.");
                        }
                );

        boardJpaRepository.delete(boardEntity);

        return DeleteBoardRes.builder()
                .deleteBoard(boardEntity)
                .build();*/


    @Override
    @Transactional
    public UpdateBoardRes likeBoard(Long bno) {

        // 1. 게시글 조회
        BoardEntity boardEntity = boardJpaRepository.findById(bno)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 게시글입니다."));

        // 2. 좋아요 1 증가
        int currentLike = boardEntity.getBLikeCount() != null ? boardEntity.getBLikeCount() : 0;
        boardEntity.setBLikeCount(currentLike + 1);

        // 3. JPA 변경 감지(dirty checking)로 자동 반영됨

        // 4. 결과 반환
        return UpdateBoardRes.builder()
                .updateBoard(boardEntity)
                .build();
    }
}



