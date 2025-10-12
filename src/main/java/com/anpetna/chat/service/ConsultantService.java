package com.anpetna.chat.service;

import com.anpetna.chat.domain.ChatroomEntity;
import com.anpetna.chat.dto.ChatroomDTO;
import com.anpetna.chat.repository.ChatroomRepository;
import com.anpetna.chat.repository.MemberChatroomMappingRepository;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.MemberDTO;
import com.anpetna.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class ConsultantService {

    private final ChatroomRepository chatroomRepository;

    private final MemberRepository memberRepository;
    private final MemberChatroomMappingRepository memberChatroomMappingRepository;

    public MemberDTO saveMember(MemberDTO memberDTO) {

        MemberEntity member = MemberDTO.to(memberDTO);

        memberRepository.save(member);

        return MemberDTO.from(member);
    }

    public Page<ChatroomDTO> getChatroomPage(Pageable pageable) {
        Page<ChatroomEntity> chatroomPage = chatroomRepository.findAll(pageable);


        //================== 추가 ========================
        return chatroomPage.map(c -> {
            int memberCount = 0;
            try {
                memberCount = memberChatroomMappingRepository.countByChatroomId(c.getId());
            } catch (Exception ignore) {}

            // 관리자 화면의 hasNew는 글로벌 기준 계산 로직이 없다면 false로 둠(또는 필요 시 확장)
            boolean hasNew = Boolean.TRUE.equals(c.getHasNewMessage());

            return new ChatroomDTO(
                    c.getId(),
                    c.getTitle(),
                    hasNew,
                    memberCount,
                    c.getCreatedAt()
            );
        });
        //================== 추가 끝 ========================
        // 기존코드
        // return chatroomPage.map(ChatroomDTO::from);
    }
}
