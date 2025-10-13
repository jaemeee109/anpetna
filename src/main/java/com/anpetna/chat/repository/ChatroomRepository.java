package com.anpetna.chat.repository;

import com.anpetna.chat.domain.ChatroomEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatroomRepository extends JpaRepository<ChatroomEntity, Long> {
}
