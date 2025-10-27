// src/app/chat/[chatroomId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import chatApi, { type ChatMessageDTO, type ChatroomDTO } from '@/features/chat/data/chat.api';
import ChevronIcon from '@/components/icons/Chevron';

function isChatMessageDTO(v: any): v is ChatMessageDTO {
  return v && typeof v === 'object'
    && typeof (v as any).sender === 'string'
    && typeof (v as any).message === 'string';
}

/** 관리자 여부 판별 */
function isAdminClient(): boolean {
  try {
    const raw =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('memberRole') ??
         sessionStorage.getItem('memberRole') ??
         (() => {
           try {
             const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
             return m ? decodeURIComponent(m[1]) : '';
           } catch { return ''; }
         })())) || '';
    const role = raw.toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  } catch { return false; }
}

/** API 베이스(포트 보정) */
function resolveApiBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    '';
  if (envBase) return envBase.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const guessPort = port ? (port === '3000' ? '8000' : port) : '8000';
  return `${protocol}//${hostname}${guessPort ? `:${guessPort}` : ''}`.replace(/\/+$/, '');
}

/**  STOMP 클라이언트 */
class MiniStomp {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: (body: string) => void;
  constructor(url: string, onMessage: (body: string) => void) {
    this.url = url; this.onMessage = onMessage;
  }
  connect(onOpen?: () => void) {
    // http/https -> ws/wss 치환
    this.ws = new WebSocket(this.url.replace(/^http/i, 'ws') + '/ws');
    this.ws.onopen = () => {
      this.sendFrame('CONNECT', { 'accept-version': '1.2', host: '' }, '');
      onOpen?.();
    };
    this.ws.onmessage = (ev) => {
      const text = String(ev.data || '');
      const idx = text.indexOf('\n\n');
      let body = (idx >= 0 ? text.slice(idx + 2) : text).replace(/\u0000+$/, '');
      body = (body || '').trim();
      if (!body) return;
      try {
        const obj = JSON.parse(body);
        if (isChatMessageDTO(obj)) {
          this.onMessage(body);
        }
      } catch {
        // 비-JSON 프레임은 무시
      }
    };
    this.ws.onerror = () => { /* STOMP 실패해도 REST 전송은 가능해야 함 */ };
    this.ws.onclose = () => { /* noop */ };
  }
  subscribe(dest: string, id = 'sub-1') {
    this.sendFrame('SUBSCRIBE', { destination: dest, id }, '');
  }
  disconnect() {
    try { this.sendFrame('DISCONNECT', {}, ''); } catch {}
    try { this.ws?.close(); } catch {}
    this.ws = null;
  }
  private sendFrame(command: string, headers: Record<string,string>, body: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const headerLines = Object.entries(headers).map(([k,v]) => `${k}:${v}`).join('\n');
    const frame = `${command}\n${headerLines}\n\n${body}\u0000`;
    this.ws.send(frame);
  }
}

/** 내 메시지 판단  */
function isMine(sender: string, admin: boolean): boolean {
  try {
    const nameCandidates = [
      localStorage.getItem('memberName'),
      localStorage.getItem('username'),
      localStorage.getItem('loginId'),
      sessionStorage.getItem('memberName'),
      sessionStorage.getItem('username'),
    ].filter(Boolean) as string[];
    const myName = (nameCandidates[0] || '').trim();
    if (myName && sender.trim() === myName) return true;
  } catch {}
  if (admin) {
    const s = sender.trim().toUpperCase();
    if (s === 'ADMIN' || s === 'ROLE_ADMIN' || s.includes('관리자')) return true;
  }
  return false;
}

export default function ChatRoomPage() {
  const router = useRouter();
  const { chatroomId } = useParams<{ chatroomId: string }>();
  const id = Number(Array.isArray(chatroomId) ? chatroomId[0] : chatroomId) || 0;

  const [history, setHistory] = useState<ChatMessageDTO[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [roomTitle, setRoomTitle] = useState<string>(`채팅방 #${id}`); 
  const stompRef = useRef<MiniStomp | null>(null);
  const admin = isAdminClient();

  // 방 제목 : 목록에서 id 매칭 (단건 API가 없음)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rooms: ChatroomDTO[] = admin ? await chatApi.adminList() : await chatApi.list();
        if (!alive) return;
        const found = rooms.find(r => Number(r.id) === id);
        const title = (found?.title || '').trim();
        if (title) {
          setRoomTitle(title);
          try { document.title = `${title} - Chat`; } catch {}
        } else {
          setRoomTitle(`채팅방 #${id}`);
        }
      } catch {
        setRoomTitle(`채팅방 #${id}`);
      }
    })();
    return () => { alive = false; };
  }, [id, admin]);

  //  방 진입 시 참여 등록 (관리자 제외) — 읽음 처리 트리거
  useEffect(() => {
  let alive = true;
  (async () => {
    if (!id) return;
    try {
      await chatApi.join(id);  // 서버의 @PostMapping("/{chatroomId}") 호출
    } catch {}
  })();
  return () => { alive = false; };
}, [id]);


  //  과거 대화 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await chatApi.messages(id);
        if (!alive) return;
        setHistory(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setErr(e?.message || '메시지 로드 실패');
      }
    })();
    return () => { alive = false; };
  }, [id]);

  //  STOMP 연결 + 구독
  useEffect(() => {
    if (!id) return;
    setReady(true); // STOMP 성공 여부와 무관하게 전송 버튼 사용 가능
    const url = `${resolveApiBase()}/stomp/chats`;
    const s = new MiniStomp(url, (body) => {
      try {
        const obj = JSON.parse(body);
        if (isChatMessageDTO(obj)) setHistory((prev) => [...prev, obj]);
      } catch {}
    });
    stompRef.current = s;
    s.connect(() => s.subscribe(`/sub/chats/${id}`));
    return () => { s.disconnect(); stompRef.current = null; };
  }, [id]);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    try {
      await chatApi.send(id, msg);
      setText(''); // STOMP 브로드캐스트로 반영
    } catch (e: any) {
      alert(e?.message || '전송 실패');
    }
  };

  const onLeave = async () => {
    if (admin) return; // 관리자 퇴장 불가
    if (!window.confirm('이 채팅방에서 퇴장하시겠습니까?')) return;
    try {
      const ok = await chatApi.leave(id);
      if (ok) router.replace('/chat');
    } catch (e: any) {
      alert(e?.message || '퇴장 실패');
    }
  };

  const goList = () => router.push('/chat');

  return (
    <RequireLogin>
      <main className="chat-wrap">
        <h1 className="chat-title">{roomTitle}</h1>

        {err && <div className="error-box">{err}</div>}

        {/* 본문 메시지 영역 */}
        <div className="chat-body" role="log" aria-live="polite">
          {history.map((m, i) => {
            const mine = isMine(m.sender, admin);
            return (
              <div key={i} className={mine ? 'row me' : 'row you'}>
                <div className={mine ? 'bubble mine' : 'bubble yours'}>
                  <div className="sender">{m.sender}</div>
                  <div className="message">{m.message}</div>
                </div>
              </div>
            );
          })}
          {history.length === 0 && (
            <div className="empty">대화가 없습니다. 첫 메시지를 보내보세요.</div>
          )}
        </div>

        <div className="composer">
          <input
            value={text}
            onChange={(e)=>setText(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') onSend(); }}
            className="composer-input"
            placeholder="메시지를 입력하세요"
            aria-label="메시지 입력"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!ready}
            className="btn-send"
            aria-label="전송"
          >
            <ChevronIcon className="icon-send" title="전송" />
          </button>
        </div>

        <div className="footer-actions">
          <button type="button" onClick={goList} className="btn">목록으로</button>
          {!admin && (
            <button type="button" onClick={onLeave} className="btn">퇴장하기</button>
          )}
        </div>
      </main>

      {/* ==================== 스타일 ==================== */}
      <style jsx>{`
        /* ===== 조정 지점: 전체 컨테이너 폭/패딩 ===== */
        .chat-wrap {
          max-width: 440px;     /* ← 전체 가로폭 */
          margin: 0 auto;
          padding: 0 16px;      /* ← 좌우 여백 */
          box-sizing: border-box;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans KR', sans-serif;
          color: #111111;       /* ← 기본 글자색 */
        }

        /* ===== 조정 지점: 제목 폰트/여백 ===== */
        .chat-title {
          text-align: center;
          font-size: 20px;      /* ← 제목 크기 */
          font-weight: 600;     /* ← 제목 굵기 */
          margin: 12px 0;
        }

        .error-box {
          text-align: center;
          color: #c1121f;       /* ← 에러 글자색 */
          margin-bottom: 8px;
        }

        /* ===== 조정 지점: 본문 영역 크기/테두리/배경 ===== */
        .chat-body {
          height: 500px;                 /* ← 메시지 영역 높이 */
          overflow-y: auto;
          background: rgba(255,255,255,0.7);
          border: 1px solid #c9c9c9;     /* ← 본문 테두리색 */
          border-radius: 12px;           /* ← 둥근 모서리 */
          padding: 15px 10px 15px 10px;                 /* ← 내부 여백 */
          box-sizing: border-box;
        }
        .empty {
          color: #6b7280;               
          text-align: center;
          padding: 20px 0;
        }

        /* 줄 컨테이너: 좌/우 정렬 */
        .row {
          display: flex;
          margin: 8px 8px;               /* ← 말풍선 간격 */
        }
        .row.you { justify-content: flex-start; }
        .row.me  { justify-content: flex-end; }

        /* ===== 조정 지점: 말풍선 공통 스타일 ===== */
        .bubble {
          max-width: 80%;                /* ← 말풍선 최대폭 */
          border: 0px solid #c9c9c9;     /* ← 말풍선 테두리색 */
          border-radius: 12px;           /* ← 말풍선 둥근 모서리 */
          padding: 8px 10px;             /* ← 말풍선 내부 여백 */
          display: grid;
          grid-auto-rows: min-content;
          gap: 6px;                      /* ← 보낸이/본문 간격 */
          word-break: break-word;
          white-space: pre-wrap;         /* ← 줄바꿈 유지 */
          box-sizing: border-box;

           position: relative; /* ::before 하이라이트용 */
            box-shadow:
              0 2px 3px rgba(0, 0, 0, 0.06),
              0 1px 3px rgba(0, 0, 0, 0.08),
              0 2px 3px rgba(0, 0, 0, 0.08); 
            background-clip: padding-box; /* 테두리와 그림자 경계 깔끔하게 */
        }

        .bubble::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px; /* .bubble과 동일 */
          pointer-events: none;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.65),  /* 위쪽 하이라이트 */
            inset 0 -1px 0 rgba(0, 0, 0, 0.06);       /* 아래쪽 살짝 음영 */
        }
        /* ===== 조정 지점: 받는사람/보내는사람 배경색 ===== */
        .bubble.yours { background: #e8f4ff; } /* ← 하늘색 */
        .bubble.mine  { background: #fff6cc; } /* ← 노란색 */

        /* ===== 조정 지점: 보낸이/메시지 텍스트 ===== */
        .sender { font-size: 12px; color: #111111; opacity: 0.75; }
        .message { font-size: 14px; font-weight: 400; color: #111111; line-height: 1.5; }

        /* ===== 조정 지점: 입력+전송 박스 배치/폭 ===== */
        .composer {
          width: 80%;                    /* ← 입력영역 전체 너비 (가운데 정렬) */
          margin: 12px auto 0;           /* ← 상단 간격/가운데/하단 0 */
          display: flex;
          align-items: center;
          justify-content: center;       /* ← 가운데 정렬 */
          gap: 8px;                      /* ← 입력창과 버튼 간격 */
          box-sizing: border-box;
        }

        /* ===== 조정 지점: 입력창 색/테두리/둥글기/패딩 ===== */
        .composer-input {
          flex: 1 1 auto;
          background: #ffffff;           /* ← 배경 하얀색 */
          color: #111111;                /* ← 글자색 */
          border: 1px solid #c9c9c9;     /* ← 테두리 회색 */
          border-radius: 10px;           /* ← 둥근 모서리 */
          padding: 10px 12px;            /* ← 내부 여백 */
          outline: none;
        }

        /* ===== 조정 지점: 버튼 공통 ===== */
        .btn {
          background: #ffffff;           /* ← 버튼 배경 하얀색 */
          color: #111111;                /* ← 버튼 글자색 */
          border: 1px solid #c9c9c9;     /* ← 버튼 테두리 회색 */
          border-radius: 10px;           /* ← 둥근 모서리 */
          padding: 10px 14px;            /* ← 내부 여백 */
          cursor: pointer;
          transition: transform 0.02s ease;
          user-select: none;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn:active { transform: translateY(1px); }

        /* ===== 전송 아이콘 버튼 ===== */
        .btn-send {
          background: #ffd4d8ff;
          color: #111111;
          border: 1px solid #ecc8c8ff;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.02s ease;
          user-select: none;
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-send:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-send:active { transform: translateY(1px); }
        :global(.icon-send) {
          width: 18px;
          height: 18px;
          display: block;
          color: #ffffff;
          fill: currentColor;
        }

        /* ===== 하단 버튼 영역 ===== */
        .footer-actions {
          display: flex;
          gap: 10px;                     
          justify-content: center;       
          margin: 20px 0 60px;           
        }
      `}</style>
    </RequireLogin>
  );
}
