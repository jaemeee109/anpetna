package com.anpetna.exception;

import com.anpetna.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.anpetna.member.service.MemberService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;




@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 권한 없음(인가 실패) → 403 */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiError(HttpStatus.FORBIDDEN.value(), "접근 권한이 없습니다."));
    }

    /** 인증 실패(미인증) → 401 */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError(HttpStatus.UNAUTHORIZED.value(), "로그인이 필요합니다."));


    }



    /** @Valid 검증 실패 시(입력값 공백 등) 400 에러로 처리 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(HttpStatus.BAD_REQUEST.value(), message));
    }


    /** 요청 파라미터 바인딩 실패 시(형변환 오류, 필수값 누락) 400 에러로 처리 */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiError> handleBind(BindException e) {
        String message = e.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(HttpStatus.BAD_REQUEST.value(), message));
    }


    /** 서비스/컨트롤러에서 ResponseStatusException 던진 경우, 지정된 상태/메시지 그대로 반환 */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException e) {
        HttpStatus status = HttpStatus.resolve(e.getStatusCode().value());
        if (status == null) status = HttpStatus.BAD_REQUEST;
        String reason = (e.getReason() == null || e.getReason().isBlank())
                ? "요청을 처리할 수 없습니다."
                : e.getReason();
        return ResponseEntity
                .status(status)
                .body(new ApiError(status.value(), reason));
    }


    /** JSON 파싱/본문 누락 등 400 처리 (권장 보강) */
    @ExceptionHandler({ HttpMessageNotReadableException.class, MissingServletRequestParameterException.class })
    public ResponseEntity<ApiError> handleReadableOrMissing(Exception e) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(HttpStatus.BAD_REQUEST.value(), "요청을 처리할 수 없습니다."));
    }

    /** 회원가입 시 중복 아이디 예외 발생하면 409 에러 + “이미 가입한 ID 입니다” 메시지 반환*/
    @ExceptionHandler(MemberService.MemberIdExistException.class)
    public ResponseEntity<ApiError> handleMemberIdExist(MemberService.MemberIdExistException e) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ApiError(HttpStatus.CONFLICT.value(), "이미 가입한 ID 입니다"));
    }


    /** DB 무결성 위반(외래키 등) 발생 시 내부 SQL 노출 막고 400 에러로 처리 */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException e) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(new ApiError(HttpStatus.CONFLICT.value(), "요청을 처리할 수 없습니다."));
    }




    /** 그 외 예외 → 500 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAllExceptions(Exception e) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR.value(),  "오류가 발생했습니다."));
    }
}
