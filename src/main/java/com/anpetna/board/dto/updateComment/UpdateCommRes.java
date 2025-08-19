package com.anpetna.board.dto.updateComment;

import com.anpetna.board.domain.CommentEntity;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class UpdateCommRes {

    private CommentEntity updateComment;
}
