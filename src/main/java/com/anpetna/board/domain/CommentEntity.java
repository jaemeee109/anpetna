package com.anpetna.board.domain;


import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "anpetna_commnet")
@Getter
@Setter
@Builder
@AllArgsConstructor // 모든 필드값으로 생성자 만듬
@NoArgsConstructor // 기본생성자
@ToString(exclude = "board")
public class CommentEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bno")
    private BoardEntity board;        // 게시물 번호 -> board 쪽 게시물 번호 fk

    @Column(name = "cWriter", nullable = false)
    private String cWriter;    // 댓글 작성자 -> member 쪽 회원 id fk

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cno", nullable = false)
    private Long cno;         // 댓글 번호

    @Lob
    @Column(name = "cContent", nullable = false)
    private String cContent;     // 댓글 내용

    @Column(name = "cLikeCount", nullable = false)
    private Integer cLikeCount;   // 댓글 좋아요 수
}
