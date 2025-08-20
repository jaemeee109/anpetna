package com.anpetna;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

@Data
@JsonPropertyOrder({ "isSuccess", "resCode", "resMessage" })
public class ApiError {

    @JsonProperty("isSuccess")
    private boolean isSuccess = false;

    private int resCode;

    private String resMessage;

    public ApiError(int resCode, String resMessage) {
        this.resCode = resCode;
        this.resMessage = resMessage;
    }
}
