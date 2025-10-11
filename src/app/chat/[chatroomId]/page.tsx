// src/app/chat/[chatroomId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import { chatApi, type ChatMessageDTO } from '@/features/chat/data/chat.api';

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

/** 최소 STOMP 클라이언트 */
class MiniStomp {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: (body: string) => void;
  constructor(url: string, onMessage: (body: string) => void) {
    this.url = url; this.onMessage = onMessage;
  }
  connect(onOpen?: () => void) {
    this.ws = new WebSocket(this.url.replace(/^http/i, 'ws'));
    this.ws.onopen = () => {
      this.sendFrame('CONNECT', { 'accept-version': '1.2', host: '' }, '');
      onOpen?.();
    };
    this.ws.onmessage = (ev) => {
      const text = String(ev.data || '');
      const split = text.split('\n\n');
      const body = split.length > 1 ? split.slice(1).join('\n\n').replace(/\u0000+$/, '') : '';
      this.onMessage(body);
    };
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

export default function ChatRoomPage() {
  const router = useRouter();
  const { chatroomId } = useParams<{ chatroomId: string }>();
  const id = Number(Array.isArray(chatroomId) ? chatroomId[0] : chatroomId) || 0;

  const [history, setHistory] = useState<ChatMessageDTO[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const stompRef = useRef<MiniStomp | null>(null);
  const admin = isAdminClient();

  // 1) 과거 대화 로드 (GET /chats/{id}/messages)
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

  // 2) STOMP 연결 + 구독 (/sub/chats 로 수신)
  useEffect(() => {
    if (!id) return;
    const base = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';
    const url = `${base}/stomp/chats`;
    const s = new MiniStomp(url, (body) => {
      try {
        const obj = JSON.parse(body);
        if (obj && typeof obj === 'object' && 'sender' in obj && 'message' in obj) {
          setHistory(prev => [...prev, { sender: (obj as any).sender, message: (obj as any).message }]);
          return;
        }
      } catch {}
      setHistory(prev => [...prev, { sender: 'SYSTEM', message: body }]);
    });
    stompRef.current = s;
    s.connect(() => {
    
      s.subscribe('/sub/chats');
      setReady(true);
    });
    return () => { s.disconnect(); stompRef.current = null; };
  }, [id]);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    try {
     
      const sent = await chatApi.send(id, msg);
      // 내 화면에 즉시 반영 
      setHistory(prev => [...prev, sent]);
      setText('');
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

  return (
    <RequireLogin>
      <main className="mx-auto w-[700px] px-4">
        <h1 className="text-xl font-semibold text-center my-4">채팅방 #{id}</h1>

        {err && <div className="text-center text-red-600 mb-2">{err}</div>}

        <div className="border rounded-lg p-3 h-[420px] overflow-y-auto bg-white/70">
          {history.map((m, i) => (
            <div key={i} className="mb-1">
              <span className="font-semibold mr-2">{m.sender}</span>
              <span>{m.message}</span>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center text-gray-500 py-10">대화가 없습니다. 첫 메시지를 보내보세요.</div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e)=>setText(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==='Enter') onSend(); }}
            className="flex-1 border rounded px-3 py-2"
            placeholder="메시지를 입력하세요"
          />
          <button type="button" className="btn-3d btn-white" onClick={onSend} disabled={!ready}>전송</button>
          {!admin && (
            <button type="button" className="btn-3d btn-white" onClick={onLeave}>퇴장</button>
          )}
        </div>
      </main>
    </RequireLogin>
  );
}
