// src/main/java/com/anpetna/auth/debug/AuthDebugController.java
package com.anpetna.auth.debug;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AuthDebugController {

    @GetMapping("/whoami")
    public Map<String, Object> whoami(Authentication authentication) {
        if (authentication == null) {
            return Map.of("authenticated", false);
        }
        return Map.of(
                "authenticated", true,
                "principal", authentication.getName(),
                "authorities", authentication.getAuthorities() // ← ROLE_ADMIN 보이면 성공
        );
    }
}
