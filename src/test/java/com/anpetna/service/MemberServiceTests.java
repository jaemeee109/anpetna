package com.anpetna.service;

import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.deleteMember.DeleteMemberReq;
import com.anpetna.member.dto.joinMember.JoinMemberReq;
import com.anpetna.member.dto.modifyMember.ModifyMemberReq;
import com.anpetna.member.dto.readMemberAll.ReadMemberAllRes;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneReq;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneRes;
import com.anpetna.member.repository.MemberRepository;
import com.anpetna.member.service.MemberService;
import com.anpetna.member.service.MemberServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Slf4j
public class MemberServiceTests {
    @InjectMocks
    private MemberService memberService;

    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private ModelMapper modelMapper;

    MemberRepository mockRepo = Mockito.mock(MemberRepository.class);
    ModelMapper mockMapper = Mockito.mock(ModelMapper.class);
    MemberService service = new MemberServiceImpl(mockMapper, mockRepo, passwordEncoder);

    @BeforeEach
    public void setupAuthentication() {
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        Authentication auth = new UsernamePasswordAuthenticationToken("user01", null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    public void clearAuthentication() {

        SecurityContextHolder.clearContext();

    }

    @Test
    public void joinTest() throws MemberService.MemberIdExistException {
        // given
        JoinMemberReq memberReq = JoinMemberReq.builder()
                .memberId("user01")
                .memberPw("12345678")
                .memberName("testUser")
                .memberBirthY("1919")
                .memberBirthM("01")
                .memberBirthD("01")
                .memberEmail("test@test.com")
                .memberGender("M")
                .memberPhone("010-1234-5678")
                .memberZipCode("00000")
                .memberRoadAddress("경기도")
                .social(false)
                .memberHasPet("Y")
                .etc("반려견 1마리 키우는 중")
                .memberFileImage(null)
                .build();

        // stub1: passwordEncoder
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

        // stub2: ModelMapper
        when(modelMapper.map(any(JoinMemberReq.class), eq(MemberEntity.class)))
                .thenAnswer(invocation -> {
                    JoinMemberReq req = invocation.getArgument(0);
                    return MemberEntity.builder()
                            .memberId(req.getMemberId())
                            .memberPw("encodedPassword")
                            .memberName(req.getMemberName())
                            .memberEmail(req.getMemberEmail())
                            .memberGender(req.getMemberGender())
                            .memberHasPet(req.getMemberHasPet())
                            .memberRole(MemberRole.USER)
                            .build();
                });

        // stub3: Repository save
        when(memberRepository.save(any(MemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        memberService.join(memberReq);

        // then: 저장된 Entity 검증
        ArgumentCaptor<MemberEntity> captor = ArgumentCaptor.forClass(MemberEntity.class);
        verify(memberRepository).save(captor.capture());
        MemberEntity saved = captor.getValue();

        assertThat(saved.getMemberId()).isEqualTo("user01");
        assertThat(saved.getMemberPw()).isEqualTo("encodedPassword");
        assertThat(saved.getMemberName()).isEqualTo("testUser");
        assertThat(saved.getMemberEmail()).isEqualTo("test@test.com");
        assertThat(saved.getMemberHasPet()).isEqualTo("Y");
        assertThat(saved.getMemberRole()).isEqualTo(MemberRole.USER);
    }

    @Test
    public void readOneTest() {
        // given
        given(mockRepo.findById("user01"))
                .willReturn(java.util.Optional.of(new MemberEntity("user01","111","test","1999","01","01","M","M","Y","010-0000-0000","Y","ex@ex.com","Y","경기도~~~","00000","ㅇㅇㅇ동ㅎㅎㅎ호", MemberRole.USER,false,"반려동물1마리",null)));
        given(mockMapper.map(any(MemberEntity.class), eq(ReadMemberOneRes.class)))
                .willAnswer(invocation -> {
                    MemberEntity entity = invocation.getArgument(0);
                    // 직접 변환 메서드 호출 (MemberDTO.from() 가 있다고 가정)
                    return ReadMemberOneRes.from(entity);
                });
        // when
        ReadMemberOneReq req = new ReadMemberOneReq();
        req.setMemberId("user01");
        ReadMemberOneRes member = service.readOne(req);
        // then
        assertThat(member.getMemberId()).isEqualTo("user01");
        assertThat(member.getMemberName()).isEqualTo("test");
    }

    @Test
    public void readAllTest() {
        //given
        List<MemberEntity> memberEntityList = Arrays.asList(
                new MemberEntity("user01","111","test","1999","01","01","M","M","Y","010-0000-0000","Y","ex@ex.com","Y","경기도~~~","00000","ㅇㅇㅇ동ㅎㅎㅎ호",MemberRole.USER,false,"반려동물1마리",null),
                new MemberEntity("user02","111","test","1999","01","01","M","M","Y","010-0000-0000","Y","ex@ex.com","Y","경기도~~~","00000","ㅇㅇㅇ동ㅎㅎㅎ호",MemberRole.USER,false,"반려동물1마리",null)
        );
        given(mockRepo.findAll()).willReturn(memberEntityList);

        List<ReadMemberAllRes> expectedList = ReadMemberAllRes.from(memberEntityList);
        //when
        List<ReadMemberAllRes> memberList = service.memberReadAll();

        //then
        assertThat(memberList).isNotNull().containsExactlyElementsOf(expectedList);
    }

    @Test
    void loadUserByUsername_test() {
        // given
        String memberId = "user01";
        MemberEntity member = new MemberEntity();
        member.setMemberId(memberId);
        member.setMemberPw("encodedPassword");
        member.setMemberRole(MemberRole.USER);

        when(memberRepository.findById(memberId)).thenReturn(java.util.Optional.of(member));

        // when
        UserDetails userDetails = memberService.loadUserByUsername(memberId);

        // then
        assertThat(userDetails).isNotNull();
        assertThat(userDetails.getUsername()).isEqualTo(memberId);
        assertThat(userDetails.getPassword()).isEqualTo("encodedPassword");
        assertThat(userDetails.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_USER");
    }


    @Test
    public void ModifyTest() {
        // given
        String memberId = "user01";
        ModifyMemberReq member = ModifyMemberReq.builder()
                .memberId(memberId)
                .memberPhone("010-1234-1234")
                .memberEmail("test2@test.com")
                .memberZipCode("00001")
                .memberRoadAddress("한국")
                .etc("반려묘 한마리 추가입니다.")
                .memberFileImage(null)
                .build();

        MemberEntity oldMember = MemberEntity.builder()
                .memberId(memberId)
                .memberPhone("010-1234-5678")
                .memberEmail("test@test.com")
                .memberZipCode("00000")
                .memberRoadAddress("경기도")
                .memberEtc("반려견 1마리 키우는 중")
                .build();

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(oldMember));
        when(memberRepository.save(any(MemberEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        memberService.modify(member);

        // then
        assertThat(oldMember.getMemberPhone()).isEqualTo("010-1234-1234");
        assertThat(oldMember.getMemberEmail()).isEqualTo("test2@test.com");
        assertThat(oldMember.getMemberZipCode()).isEqualTo("00001");
        assertThat(oldMember.getMemberRoadAddress()).isEqualTo("한국");
        assertThat(oldMember.getMemberEtc()).isEqualTo("반려묘 한마리 추가입니다.");
//        assertThat(oldMember.getImages()).isNull();

        verify(memberRepository).findById(memberId);
        verify(memberRepository).save(oldMember);
    }


    @Test
    public void DeleteTest() {
        // given
        MemberEntity member = MemberEntity.builder()
                .memberId("user01")
                .memberPw("12345678")
                .memberName("testUser")
                .memberBirthY("1919")
                .memberBirthM("01")
                .memberBirthD("01")
                .memberEmail("test@test.com")
                .memberGender("M")
                .memberPhone("010-1234-5678")
                .memberZipCode("00000")
                .memberRoadAddress("경기도")
                .memberSocial(false)
                .memberHasPet("Y")
                .memberEtc("반려견 1마리 키우는 중")
                .build();

        DeleteMemberReq memberDTO = DeleteMemberReq.builder()
                .memberId("user01")
                .build();

        memberRepository.save(member);

        // when

        memberService.delete(memberDTO);

        // then

        assertThat(memberRepository.findById("user01")).isEqualTo(Optional.empty());

    }

}

