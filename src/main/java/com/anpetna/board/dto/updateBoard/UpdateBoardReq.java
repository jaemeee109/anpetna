package com.anpetna.board.dto.updateBoard;

import com.anpetna.image.dto.ImageDTO;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateBoardReq {

    @JsonProperty("bno")
    private Long bno;

    @JsonProperty("bTitle")
    private String bTitle;

    @JsonProperty("bContent")
    private String bContent;

    @JsonProperty("images")
    private List<ImageDTO> images;

    @JsonProperty("noticeFlag")
    private Boolean noticeFlag;

    @JsonProperty("isSecret")
    private Boolean isSecret;
}
