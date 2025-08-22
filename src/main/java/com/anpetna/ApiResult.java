package com.anpetna;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;
import org.springframework.http.HttpStatus;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({ "isSuccess", "resCode", "resMessage", "data" })
public class ApiResult<T> {

    @JsonProperty("isSuccess")
    private boolean isSuccess = true;

    private int resCode = HttpStatus.OK.value();

    private String resMessage = HttpStatus.OK.name();

    private T result;

    public ApiResult(T data) {
        this.result = data;
    }
}
