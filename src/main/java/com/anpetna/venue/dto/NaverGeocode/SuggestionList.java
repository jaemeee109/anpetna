package com.anpetna.venue.dto.NaverGeocode;

import lombok.Data;
import java.util.List;

@Data
public class SuggestionList {
    private final List<Suggestion> items;
}
