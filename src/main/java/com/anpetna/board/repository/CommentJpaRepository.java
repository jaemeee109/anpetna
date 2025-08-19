package com.anpetna.board.repository;

import com.anpetna.board.domain.CommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentJpaRepository extends JpaRepository<CommentEntity, Long> {

    Page<CommentEntity> findByBoard_Bno(Long bno, Pageable pageable);
    Optional<CommentEntity> findByBoard_BnoAndCno(Long bno, Long cno);
}
