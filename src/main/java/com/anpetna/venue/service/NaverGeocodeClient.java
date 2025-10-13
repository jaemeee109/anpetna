package com.anpetna.venue.service;

import org.springframework.web.client.HttpStatusCodeException;
import com.anpetna.venue.dto.NaverGeocode.NaverGeocodeResponse;
import com.anpetna.venue.dto.NaverGeocode.Suggestion;
import com.anpetna.venue.dto.NaverGeocode.SuggestionList;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

// 네이버 지도 OpenAPI (지오코딩/역지오코딩) 호출 전용 클래스
// application.properties에 ClientId와 SecretKey 값을 설정해야 함
// ClientId와 SecretKey가 없으면 호출을 하지 않고, 빈 화면만 반환
@Service
@RequiredArgsConstructor
@Slf4j
public class NaverGeocodeClient {

    @Value("${naver.geocode.client-id:}")
    private String clientId; // API 클라이언트 아이디

    @Value("${naver.geocode.client-secret:}")
    private String clientSecret; // API 클라이언트 시크릿 키

    private static final String GEOCODE_ENDPOINT =
            "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode";
    private static final String REVERSE_ENDPOINT =
            "https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc";

    // 기존 시그니처, 단순 문자열 검색 (위치 바이어스 미적용)
    public SuggestionList search(String query) {
        return search(query, null, null);
    }

   // 좌표 바이어스 -> 실패 시 지역 접두어 보강 재시도
   //  1차 : 검색어 원문으로 지오코딩 시도
   //  2차 : (위도, 경도가 있을 경우) 사용자의 좌표로 역지오코딩해서 지역명+검색어로 재시도
    public SuggestionList search(String query, Double lat, Double lng) {
        if (isBlank(query)) {
            return new SuggestionList(Collections.<Suggestion>emptyList());
        }

        // 1차
        SuggestionList first = doGeocode(query, lat, lng);
        if (first.getItems() != null && !first.getItems().isEmpty()) {
            return first;
        }

        // 2차
        if (lat != null && lng != null) {
            String regionPrefix = reverseRegion(lat.doubleValue(), lng.doubleValue());
            if (!isBlank(regionPrefix)) {
                String boosted = (regionPrefix + " " + query).trim();
                SuggestionList second = doGeocode(boosted, lat, lng);
                if (second.getItems() != null && !second.getItems().isEmpty()) {
                    return second;
                }
            }
        }
        return new SuggestionList(Collections.<Suggestion>emptyList());
    }

    // 실제 지오코딩 호출
    // 좌표 바이어스 지원
    // 지번, 도로명, 영문 주소를 우선순위로 라벨을 빌드 후, 위도 경도 파싱후 리스트 구성
    private SuggestionList doGeocode(String query, Double lat, Double lng) {
        // NCP 키 미설정이면 외부 호출하지 않고 빈 목록
        if (isBlank(clientId) || isBlank(clientSecret)) {
            log.warn("[geocode] NCP credential missing (clientId/clientSecret). Returning empty list.");
            return new SuggestionList(Collections.<Suggestion>emptyList());
        }

        RestTemplate rt = new RestTemplate();

        UriComponentsBuilder b = UriComponentsBuilder
                .fromHttpUrl(GEOCODE_ENDPOINT)
                .queryParam("query", query);

        // 좌표 바이어스
        if (lat != null && lng != null) {
            b.queryParam("coordinate",
                    String.format(java.util.Locale.US, "%.6f,%.6f", lng.doubleValue(), lat.doubleValue()));
        }

        // UTF-8 퍼센트 인코딩 (한글/공백 포함 쿼리 안전 처리)
        URI uri = b.build(false).encode(StandardCharsets.UTF_8).toUri();


        HttpHeaders headers = buildHeaders();
        HttpEntity<Void> req = new HttpEntity<Void>(headers);

        ResponseEntity<NaverGeocodeResponse> resp;
        try {
            resp = rt.exchange(uri, HttpMethod.GET, req, NaverGeocodeResponse.class);
        } catch (HttpStatusCodeException e) {
            log.error("[geocode] HTTP {} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            return new SuggestionList(Collections.<Suggestion>emptyList());
        } catch (Exception e) {
            log.error("[geocode] call error: {}", String.valueOf(e));
            return new SuggestionList(Collections.<Suggestion>emptyList());
        }


        NaverGeocodeResponse body = resp.getBody();
        if (resp.getStatusCode() != HttpStatus.OK || body == null || body.getAddresses() == null) {
            log.debug("[geocode] non-OK or empty body. status={}, body={}", resp.getStatusCode(), body);
            return new SuggestionList(Collections.<Suggestion>emptyList());
        }

        // 지번 → 도로명 → 영어 (중복 제거)
        LinkedHashSet<String> dup = new LinkedHashSet<String>();
        List<Suggestion> out = new ArrayList<Suggestion>();
        try {
            List<NaverGeocodeResponse.Address> addrs = body.getAddresses();
            for (int i = 0; i < addrs.size(); i++) {
                NaverGeocodeResponse.Address a = addrs.get(i);

                String label;
                if (!isBlank(a.getJibunAddress())) {
                    label = a.getJibunAddress();
                } else if (!isBlank(a.getRoadAddress())) {
                    label = a.getRoadAddress();
                } else {
                    label = (a.getEnglishAddress() != null) ? a.getEnglishAddress() : "";
                }
                if (isBlank(label)) continue;

                double latV, lngV;
                try {
                    latV = Double.parseDouble(a.getY());
                    lngV = Double.parseDouble(a.getX());
                } catch (Exception ignore) {
                    continue;
                }

                String key = label + "|" + latV + "|" + lngV;
                if (dup.add(key)) out.add(new Suggestion(label, latV, lngV));
                if (out.size() >= 12) break;
            }
        } catch (Exception e) {
            log.debug("[geocode] parse error: {}", String.valueOf(e));
        }
        return new SuggestionList(out);
    }

    // 역지오코딩으로 '시/군/구 읍/면/동' 접두어 생성
    private String reverseRegion(double lat, double lng) {
        if (isBlank(clientId) || isBlank(clientSecret)) {
            return "";
        }

        RestTemplate rt = new RestTemplate();

        URI uri = UriComponentsBuilder.fromHttpUrl(REVERSE_ENDPOINT)
                .queryParam("coords", String.format(java.util.Locale.US, "%.6f,%.6f", lng, lat))
                .queryParam("sourcecrs", "epsg:4326")
                .queryParam("orders", "admcode")
                .queryParam("output", "json")
                .build(false)
                .encode(StandardCharsets.UTF_8)
                .toUri();


        HttpHeaders headers = buildHeaders();
        HttpEntity<Void> req = new HttpEntity<Void>(headers);

        Map<?, ?> res;
        try {
            ResponseEntity<Map> resp = rt.exchange(uri, HttpMethod.GET, req, Map.class);
            if (resp.getStatusCode() != HttpStatus.OK || resp.getBody() == null) return "";
            res = resp.getBody();
        } catch (Exception e) {
            log.debug("[reverse] call error: {}", String.valueOf(e));
            return "";
        }

        try {
            Object resultsObj = res.containsKey("results") ? res.get("results") : null;
            List<?> results = (resultsObj instanceof List) ? (List<?>) resultsObj : Collections.emptyList();
            if (results.isEmpty()) return "";

            Object firstObj = results.get(0);
            if (!(firstObj instanceof Map)) return "";
            Map<?, ?> first = (Map<?, ?>) firstObj;

            Object regionObj = first.get("region");
            if (!(regionObj instanceof Map)) return "";
            Map<?, ?> region = (Map<?, ?>) regionObj;

            String a1 = name(region.get("area1"));
            String a2 = name(region.get("area2"));
            String a3 = name(region.get("area3"));

            StringBuilder sb = new StringBuilder();
            if (!isBlank(a2)) sb.append(a2);
            if (!isBlank(a3)) {
                if (sb.length() > 0) sb.append(' ');
                sb.append(a3);
            }
            String joined = sb.toString();
            if (isBlank(joined) && !isBlank(a1)) joined = a1;
            return joined.trim();
        } catch (Exception e) {
            log.debug("[reverse] parse error: {}", String.valueOf(e));
            return "";
        }
    }

    private static String name(Object areaObj) {
        if (!(areaObj instanceof Map)) return null;
        Object n = ((Map<?, ?>) areaObj).get("name");
        return (n == null) ? null : String.valueOf(n);
    }

    // 인증 헤더 생성
    // 네이버  API 게이트웨에 요구 헤더 세팅
    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-NCP-APIGW-API-KEY-ID", clientId);
        headers.set("X-NCP-APIGW-API-KEY", clientSecret);
        headers.setAccept(java.util.Arrays.asList(MediaType.APPLICATION_JSON));
        headers.setAcceptCharset(java.util.Arrays.asList(StandardCharsets.UTF_8));
        return headers;
    }

    // 문자열 검사
    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    // 애플리케이션 시작 시 자격증명 상태 로그 출력(운영상 확인용)
    @PostConstruct
    void _logNcpCred() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            log.error("[geocode] NCP credential missing (clientId/clientSecret).");
        } else {
            String idHead = clientId.length() >= 4 ? clientId.substring(0, 4) : clientId;
            log.info("[geocode] NCP credential present: id={}*** (len={}), secretLen={}", idHead, clientId.length(), clientSecret.length());
        }
    }

    // 진단용 메서드
    public boolean hasCredentials() {
        return !(isBlank(clientId) || isBlank(clientSecret));
    }


    
}
