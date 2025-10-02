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
    @Size(max = 200, message = "제목은 최대 200자까지 입력 가능합니다.")
    private String bTitle;           // 제목

    @NotBlank
    @JsonProperty("bContent")
    @Size(max = 4000, message = "내용은 최대 4000자까지 입력 가능합니다.")
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
    private String category; // ★ 추가

}


