package com.anpetna.auth.util;

import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import java.nio.charset.StandardCharsets;
import java.security.Key;

public final class KeysUtil {
    private KeysUtil() {}

    /** secret 이 Base64URL / Base64 / 평문 중 무엇이든 안전하게 Key 생성 */
    public static Key hmacKey(String secret) {
        if (secret == null) throw new IllegalArgumentException("secret is null");
        String s = secret.trim();
        byte[] keyBytes;
        // 1) Base64URL( - _ 사용 ) 시도
        try {
            keyBytes = Decoders.BASE64URL.decode(s);
        } catch (IllegalArgumentException e1) {
            // 2) 일반 Base64( + / 사용 ) 시도
            try {
                keyBytes = Decoders.BASE64.decode(s);
            } catch (IllegalArgumentException e2) {
                // 3) 둘 다 아니면 평문으로 간주
                keyBytes = s.getBytes(StandardCharsets.UTF_8);
            }
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
