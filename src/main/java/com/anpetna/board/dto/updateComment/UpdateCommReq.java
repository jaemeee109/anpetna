package com.anpetna.board.dto.updateComment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateCommReq {

    @JsonProperty("cno")
    private Long cno;          // 어느 게시글(bno)에 다는 댓글인지 (FK)

    @JsonProperty("cWriter")
    private String cWriter;    // 작성자

    @JsonProperty("cContent")
    private String cContent;   // 내용

    @JsonProperty("cLikeCount")
    private Integer cLikeCount;   // 좋아요
}
