package com.anpetna.core.controller;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
@Schema(description = "유저 생성 요청")
public class CreateUserRequest {
    @NotBlank
    @Schema(description = "유저명", example = "chae")
    private String username;

    // getter/setter
}
