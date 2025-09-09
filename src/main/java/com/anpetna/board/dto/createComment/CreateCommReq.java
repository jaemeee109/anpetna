package com.anpetna.board.dto.createComment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateCommReq {

    @JsonProperty("bno")
    private Long bno;          // 어느 게시글(bno)에 다는 댓글인지 (FK)

    @JsonProperty("cno")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long cno;

    @JsonProperty("cWriter")
    private String cWriter;    // 작성자

    @JsonProperty("cContent")
    private String cContent;   // 내용

    @Builder.Default
    @JsonProperty("cLikeCount")
    private Integer cLikeCount = 0; // 좋아요 기본값
}
