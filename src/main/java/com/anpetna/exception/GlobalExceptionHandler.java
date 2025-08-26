package com.anpetna.exception;

<<<<<<< HEAD
import com.anpetna.ApiError;
import org.springframework.http.HttpStatus;
=======
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
>>>>>>> 880a35e (modify테스트중)
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
<<<<<<< HEAD
    public ApiError handleAllExceptions(Exception e) {
        var status = HttpStatus.INTERNAL_SERVER_ERROR.value();
        var message = e.getMessage();

        return new ApiError(status, message);
=======
    public ResponseEntity handleAllExceptions(Exception e) {
        var status = HttpStatus.INTERNAL_SERVER_ERROR;
        var message = e.getMessage();

        return new ResponseEntity(status);
>>>>>>> 880a35e (modify테스트중)
    }
}
