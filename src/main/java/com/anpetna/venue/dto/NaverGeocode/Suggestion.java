package com.anpetna.venue.dto.NaverGeocode;

import lombok.Data;

@Data
public class Suggestion {
    private String label;
    private double lat;
    private double lng;

    public Suggestion(String label, double lat, double lng) {
        this.label = label;
        this.lat = lat;
        this.lng = lng;
    }
}
