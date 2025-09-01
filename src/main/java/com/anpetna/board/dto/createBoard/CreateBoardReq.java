package com.anpetna.board.dto.createBoard;

import com.anpetna.board.constant.BoardType;
import com.anpetna.image.dto.ImageDTO;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateBoardReq {

    @NotBlank
    @JsonProperty("bWriter")
    private String bWriter;          // 작성자

    @NotBlank
    @JsonProperty("bTitle")
    private String bTitle;           // 제목

    @NotBlank
    @JsonProperty("bContent")
    private String bContent;         // 내용

    @JsonProperty("boardType")
    private BoardType boardType;    // 게시글 타입 (NOTICE, FAQ, FREE, QNA, REVIEW, EVENT)

    @JsonProperty("noticeFlag")
    private Boolean noticeFlag;     // 상단 고정 여부 (초기값 = false)

    @JsonProperty("isSecret")
    private Boolean isSecret;       // 비밀글 여부 (초기값 = false)

    @JsonProperty("images")
    private List<ImageDTO> images;

    // 기본값 0
    @Builder.Default
    @JsonProperty("bViewCount")
    private Integer bViewCount = 0;

    @Builder.Default
    @JsonProperty("bLikeCount")
    private Integer bLikeCount = 0;

    @Size(max = 50)
    private String faqCategory; // ★ 추가

}


