package com.anpetna.auth.util;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
public class TokenHash {

    public String sha256(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("token is blank");
        }
        try{
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(token.getBytes(StandardCharsets.UTF_8)));
        }catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
