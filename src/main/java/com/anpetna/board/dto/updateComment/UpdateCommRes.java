package com.anpetna.board.dto.updateComment;

import com.anpetna.board.dto.CommentDTO;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class UpdateCommRes {

    private CommentDTO updateComment;
}
