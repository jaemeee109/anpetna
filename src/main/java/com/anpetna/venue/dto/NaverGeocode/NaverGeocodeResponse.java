package com.anpetna.venue.dto.NaverGeocode;

import lombok.Data;
import java.util.List;

@Data
public class NaverGeocodeResponse {
    private String status;
    private List<Address> addresses;

    @Data
    public static class Address {
        private String roadAddress;   // 도로명
        private String jibunAddress;  // 지번
        private String englishAddress;
        private String x;             // lng
        private String y;             // lat
    }
}
