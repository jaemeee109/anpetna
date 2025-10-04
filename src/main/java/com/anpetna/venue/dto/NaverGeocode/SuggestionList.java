package com.anpetna.venue.dto.NaverGeocode;

import lombok.Data;
import java.util.List;

// 주소 제안 목록 래퍼

@Data
public class SuggestionList {
    private final List<Suggestion> items;
}
