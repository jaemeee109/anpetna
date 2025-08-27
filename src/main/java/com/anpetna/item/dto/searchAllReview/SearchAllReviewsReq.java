package com.anpetna.item.dto.searchAllReview;

import lombok.Getter;
import lombok.Setter;
import org.hibernate.query.SortDirection;

import java.time.LocalDate;

@Getter
@Setter
public class SearchAllReviewsReq {

    private LocalDate orderByRegDate; //최신순

    private Integer orderByRating; //별점순

    private SortDirection direction; // ASC, DESC (Enum)

}
