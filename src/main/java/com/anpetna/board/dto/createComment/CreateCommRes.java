package com.anpetna.board.dto.createComment;

import com.anpetna.board.domain.CommentEntity;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class CreateCommRes {

    private CommentEntity createComm;
}
