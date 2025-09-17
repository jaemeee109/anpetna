package com.anpetna.notification.common.service;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SseSessionRegistry {

    // 사용자별 SSE 연결(Emitter)들을 보관하는 레지스트리.
    // key = memberId, value = 해당 사용자의 활성화된 Emitter 목록
    // - ConcurrentHashMap: 다중 스레드 환경에서 안전한 Map
    // - CopyOnWriteArrayList: 쓰기(추가/삭제) 시 전체 복사, 읽기/순회는 락 없이 빠름
    //   → "등록/해제 빈도 < 브로드캐스트 빈도"일 때 유리 (보통 같은 유저가 탭 1~3개 정도)
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> map = new ConcurrentHashMap<>();

//
//      특정 사용자(memberId)의 SSE 연결을 등록한다.
//
//      @param memberId  사용자 식별자
//      @param timeoutMs 서버가 연결을 유지하려는 최대 시간(ms). 경과 시 onTimeout 콜백 발생
//      @return 생성/등록된 SseEmitter (Controller 가 그대로 반환하면 클라이언트와 스트림 연결됨)
//
    public SseEmitter register(String memberId, long timeoutMs) {
        // 타임아웃이 걸린 Emitter 생성
        SseEmitter emitter = new SseEmitter(timeoutMs);

        // 사용자 키로 리스트를 준비(없으면 생성)하고, emitter 추가
        map.computeIfAbsent(memberId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        // 공통 정리 작업(콜백) — 완료/타임아웃/에러 시 같은 동작 수행
        Runnable cleanup = () -> remove(memberId, emitter);

        // 정상 완료 시: 레지스트리에서 제거
        emitter.onCompletion(cleanup);

        // 타임아웃 시: complete() 호출로 응답 종료 + 레지스트리에서 제거
        emitter.onTimeout(() -> {
            try { emitter.complete(); } catch (Exception ignored) {}
            cleanup.run();
        });

        // 오류 발생 시: completeWithError()로 종료 + 레지스트리에서 제거
        emitter.onError(ex -> {
            try { emitter.completeWithError(ex); } catch (Exception ignored) {}
            cleanup.run();
        });

        // 주의: 여기서 complete()를 호출하면 즉시 연결이 끊기므로 절대 호출 금지!
        return emitter;
    }

    /**
     * 해당 사용자의 현재 활성 Emitter 리스트 스냅샷을 반환한다.
     * - 원본 리스트(CopyOnWriteArrayList)를 그대로 노출하지 않고
     *   불변 스냅샷(List.copyOf)으로 제공하여 외부 수정/경합을 방지한다.
     */
    public List<SseEmitter> emittersOf(String memberId) {
        var list = map.get(memberId);
        return (list == null) ? List.of() : List.copyOf(list); // 불변 스냅샷
    }

    /**
     * 레지스트리에서 특정 emitter를 제거한다.
     * - 사용자에게 열린 탭이 모두 닫히면 키 자체도 제거하여 메모리 릭 방지
     */
    public void remove(String memberId, SseEmitter emitter) {
        var list = map.get(memberId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) map.remove(memberId); // 더 이상 연결 없으면 엔트리 삭제
        }
    }

    /**
     * 특정 사용자에게 이벤트를 브로드캐스트(푸시)한다.
     * - send 중 예외(끊긴 연결 등)가 발생하면 emitter를 정리하고 레지스트리에서 제거한다.
     */
    public void broadcast(String memberId, SseEmitter.SseEventBuilder event) {
        // 스냅샷을 순회 → 순회 중 remove가 일어나도 안전
        for (var emitter : emittersOf(memberId)) {
            try {
                emitter.send(event); // 실제 데이터 전송
            } catch (Exception e) {
                // 전송 실패: 연결 종료 + 레지스트리 정리(끊긴 연결 청소)
                try { emitter.completeWithError(e); } catch (Exception ignored) {}
                remove(memberId, emitter);
            }
        }
    }
}
