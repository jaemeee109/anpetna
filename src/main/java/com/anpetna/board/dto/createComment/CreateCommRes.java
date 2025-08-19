package com.anpetna.board.dto.createComment;

import com.anpetna.board.dto.CommentDTO;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class CreateCommRes {

    private CommentDTO createComm;
}
