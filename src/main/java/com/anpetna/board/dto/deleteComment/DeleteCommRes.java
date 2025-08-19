package com.anpetna.board.dto.deleteComment;

import com.anpetna.board.domain.CommentEntity;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DeleteCommRes {

    private CommentEntity deleteComment;
}
