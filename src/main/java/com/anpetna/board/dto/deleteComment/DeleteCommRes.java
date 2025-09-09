package com.anpetna.board.dto.deleteComment;

import com.anpetna.board.dto.CommentDTO;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DeleteCommRes {

    private CommentDTO deleteComment;
}
