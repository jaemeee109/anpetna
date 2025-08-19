package com.anpetna.board.dto.updateComment;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class UpdateCommReq {

    private Long cno;
    private String cContent;
    private String cWriter;
}
