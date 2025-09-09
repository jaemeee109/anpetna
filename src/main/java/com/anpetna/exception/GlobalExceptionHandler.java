package com.anpetna.exception;

import com.anpetna.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ApiError handleAllExceptions(Exception e) {
        var status = HttpStatus.INTERNAL_SERVER_ERROR.value();
        var message = e.getMessage();

        return new ApiError(status, message);
    }
}
