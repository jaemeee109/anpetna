package com.anpetna.member.service;


import com.anpetna.image.domain.ImageEntity;
import com.anpetna.item.repository.ItemRepository;
import com.anpetna.member.constant.MemberRole;
import com.anpetna.member.domain.MemberEntity;
import com.anpetna.member.dto.deleteMember.DeleteMemberReq;
import com.anpetna.member.dto.deleteMember.DeleteMemberRes;
import com.anpetna.member.dto.joinMember.JoinMemberReq;
import com.anpetna.member.dto.joinMember.JoinMemberRes;
import com.anpetna.member.dto.modifyMember.ModifyMemberReq;
import com.anpetna.member.dto.modifyMember.ModifyMemberRes;
import com.anpetna.member.dto.readMemberAll.ReadMemberAllRes;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneReq;
import com.anpetna.member.dto.readMemberOne.ReadMemberOneRes;
import com.anpetna.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.java.Log;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.parameters.P;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
@Transactional
@Log
public class MemberServiceImpl implements MemberService {

    private final ModelMapper modelMapper;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final ItemRepository itemRepository;
    // final -> 생성자를 만들고 주입

    @Value("${app.upload.dir}")       // 실제 파일 저장 경로 (예: C:/uploads or /var/www/uploads)
    private String uploadDir;

    @Value("${app.upload.url-base}")  // 접근 URL 베이스 (예: /files or https://cdn.example.com/files)
    private String uploadUrlBase;


    // 프로필 1장만 허용할 때: 기존 이미지가 있으면 지우고 새로 저장
    private void replaceProfileImage(MemberEntity member, MultipartFile file) {
        if (file == null || file.isEmpty()) return;

        try {
            // 1) 기존 프로필 이미지 제거 (엔티티 + 물리 파일)
            // -- A안: MemberEntity 쪽에 orphanRemoval=true인 images 컬렉션이 있고 remove 메서드가 있다면:
            if (member.getImages() != null && !member.getImages().isEmpty()) {
                // 단일 정책이므로 첫 번째 것만 있다고 가정(여러 개 있으면 모두 제거)
                member.getImages().forEach(img -> deletePhysicalIfLocal(img.getUrl()));
                member.getImages().clear(); // orphanRemoval=true 라면 DB에서 자동 삭제
                // 만약 orphanRemoval 설정이 없다면 아래 B안처럼 imageRepository.delete(...)가 필요
            }

            // 2) 새 파일 저장
            Path base = Paths.get(uploadDir);
            if (!Files.exists(base)) Files.createDirectories(base);

            String original = file.getOriginalFilename();
            String ext = StringUtils.getFilenameExtension(original);
            String uuid = UUID.randomUUID().toString();
            String savedName = (ext == null || ext.isBlank()) ? uuid : (uuid + "." + ext);
            Path target = base.resolve(savedName);
            file.transferTo(target.toFile());

            String url = uploadUrlBase.endsWith("/") ? (uploadUrlBase + savedName)
                    : (uploadUrlBase + "/" + savedName);

            // 3) 연결 (단일이므로 sortOrder=0 고정)
            ImageEntity.forMember(savedName, url, member, 0);

        } catch (Exception e) {
            throw new RuntimeException("프로필 이미지 저장 중 오류가 발생했습니다.", e);
        }
    }

    // 로컬 저장소를 쓰는 경우에만: URL에서 파일명을 추출해 삭제
// (CDN/외부 스토리지면 이 부분은 형님 정책에 맞춰 별도 구현)
    private void deletePhysicalIfLocal(String url) {
        try {
            if (url == null) return;
            // url이 /files/xxxxx.jpg 형태라면 마지막 세그먼트가 파일명
            String fileName = url.substring(url.lastIndexOf('/') + 1);
            Path path = Paths.get(uploadDir).resolve(fileName);
            if (Files.exists(path)) Files.delete(path);
        } catch (Exception ignore) { /* 로그만 남기고 무시해도 OK */ }
    }



    @Override
    public JoinMemberRes join(JoinMemberReq joinMemberReq, MultipartFile profileFile)
            throws MemberIdExistException {

        String memberId = joinMemberReq.getMemberId();
        if (memberRepository.existsById(memberId)) throw new MemberIdExistException();

        MemberEntity member = modelMapper.map(joinMemberReq, MemberEntity.class);
        member.setMemberPw(passwordEncoder.encode(joinMemberReq.getMemberPw()));
        member.setMemberRole(joinMemberReq.getMemberRole());

        MemberEntity saved = memberRepository.save(member);

        // 프로필이 넘어왔다면 교체(=새로 저장)
        if (profileFile != null && !profileFile.isEmpty()) {
            replaceProfileImage(saved, profileFile);
        }

        return JoinMemberRes.from(saved);
    }

    @Override
    public UserDetails loadUserByUsername(String memberId) throws UsernameNotFoundException {
        MemberEntity member = memberRepository.findById(memberId).orElse(null);

        if (member == null) {
            throw new UsernameNotFoundException(memberId);
        }

        return User.builder()
                .username(member.getMemberId())
                .password(member.getMemberPw())
                .roles(member.getMemberRole().name())
                .build();
    }

    @Override
    @PreAuthorize("hasRole('ADMIN') or (#p0 != null and #p0.memberId == authentication.name)")
    @Transactional(readOnly = true)
    public ReadMemberOneRes readOne(ReadMemberOneReq readMemberOneReq) {

        // ▼ 요청 대상 ID를 우선 사용 (컨트롤러에서 이미 me/경로변수로 채워서 옴)
        String targetId = (readMemberOneReq != null && readMemberOneReq.getMemberId() != null
                && !readMemberOneReq.getMemberId().isBlank())
                ? readMemberOneReq.getMemberId()
                : SecurityContextHolder.getContext().getAuthentication().getName();

        MemberEntity member = memberRepository.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."));

        return ReadMemberOneRes.from(member);
    }


    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
     public List<ReadMemberAllRes> memberReadAll() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        List<MemberEntity> member = memberRepository.findAll();

        return ReadMemberAllRes.from(member);
    }


    @Override
    public ModifyMemberRes modify(ModifyMemberReq modifyMemberReq,
                                  MultipartFile profileFile,
                                  Boolean removeProfile) {

        String memberId = modifyMemberReq.getMemberId();

        MemberEntity member = memberRepository.findById(memberId).orElse(null);
        System.out.println(member);
        if (member == null) {
            throw new UsernameNotFoundException(memberId);
        }
//        ResponseStatusException(HttpStatus.)

        member.setMemberPw(passwordEncoder.encode(modifyMemberReq.getMemberPw()));
        member.setMemberPhone(modifyMemberReq.getMemberPhone());
        member.setMemberEmail(modifyMemberReq.getMemberEmail());
        member.setMemberZipCode(modifyMemberReq.getMemberZipCode());
        member.setMemberRoadAddress(modifyMemberReq.getMemberRoadAddress());
        member.setMemberEtc(modifyMemberReq.getEtc());
        member.setMemberHasPet(modifyMemberReq.getMemberHasPet());

        // (1) 삭제만 요청된 경우
        if (Boolean.TRUE.equals(removeProfile)) {
            if (member.getImages() != null && !member.getImages().isEmpty()) {
                member.getImages().forEach(img -> deletePhysicalIfLocal(img.getUrl()));
                member.getImages().clear(); // orphanRemoval=true 필요
                // orphanRemoval 없으면: imageRepository.deleteAll(member.getImages());
            }
        }
        // (2) 새 파일이 온 경우 → 교체
        if (profileFile != null && !profileFile.isEmpty()) {
            replaceProfileImage(member, profileFile);
        }


        memberRepository.save(member);

        return ModifyMemberRes.from(member);

    }

    @Override
    public DeleteMemberRes delete(DeleteMemberReq deleteMemberReq) {

        String memberId = deleteMemberReq.getMemberId();

        MemberEntity member = memberRepository.findById(memberId).orElse(null);

        memberRepository.delete(member);
        return null;

    }




}
