package com.anpetna.board.dto.readOneBoard;

import com.anpetna.core.coreDto.ImageDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Getter
@Service
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadOneBoardReq {

    private Long bno;
    private List<ImageDTO> images;

}
