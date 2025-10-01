package com.anpetna.banner.dto.updateBanner;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateBannerReq {

        /** 클릭 시 이동할 링크 */
        @Size(max = 255, message = "링크 URL 은 255자 이내입니다.")
        private String linkUrl;

        /** 노출 여부 */
        private Boolean active;

        /** 노출 시작/종료 시간 */
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime startAt;

        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime endAt;

        /** 정렬 순서 */
        @Min(value = 0, message = "정렬 순서는 0 이상이어야 합니다.")
        private Integer sortOrder;
}

/*
 * 배너 수정 요청 DTO
 * - multipart/form-data 바인딩을 고려해서, 파일은 컨트롤러에서 MultipartFile 로 받음
 * - null 허용 필드는 "부분 업데이트"를 의도 (null 이면 해당 필드는 변경하지 않음)
 */