package com.anpetna.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)

    public ResponseEntity handleAllExceptions(Exception e) {
        var status = HttpStatus.INTERNAL_SERVER_ERROR;
        var message = e.getMessage();

        return new ResponseEntity(status);

    }
}
