// ✅ src/features/chat/data/chat.api.ts (최종 완전본)
import http from '@/shared/data/http';

export type ChatroomDTO = {
  id: number;
  title: string;
  hasNewMessage: boolean;
  memberCount: number;
  createdAt: string;
};

export type ChatMessageDTO = {
  sender: string;
  message: string;
};

/** 관리자 여부 판별 (스토리지/세션에서 읽기) */
function isAdminClient(): boolean {
  try {
    const raw =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('memberRole') ??
         sessionStorage.getItem('memberRole') ??
         '')) || '';
    const up = raw.toUpperCase();
    return up === 'ADMIN' || up === 'ROLE_ADMIN';
  } catch {
    return false;
  }
}

/** (관리자) 채팅방 목록 */
async function adminList(): Promise<ChatroomDTO[]> {
  const resp = await http.get('/chats');
  const data = resp.data ?? [];
  return Array.isArray(data) ? (data as ChatroomDTO[]) : [];
}


/** (회원) 내 채팅방 목록 */
async function list(): Promise<ChatroomDTO[]> {
  const resp = await http.get('/chats');
  const data = resp.data ?? [];
  return Array.isArray(data) ? (data as ChatroomDTO[]) : [];
}

/** 메시지 이력 조회 */
async function messages(chatroomId: number): Promise<ChatMessageDTO[]> {
  const { data } = await http.get(`/chats/${chatroomId}/messages`);
  return Array.isArray(data) ? (data as ChatMessageDTO[]) : [];
}

/** 새 채팅방 생성 */
async function create(title: string): Promise<ChatroomDTO> {
  const { data } = await http.post('/chats', null, { params: { title } });
  return data as ChatroomDTO;
}

/** 채팅방 입장 (회원용) */
async function join(chatroomId: number, currentChatroomId?: number) {
  const { data } = await http.post(`/chats/${chatroomId}`, null, {
    params: currentChatroomId ? { currentChatroomId } : {},
  });
  return !!data;
}

/** 채팅방 퇴장 */
async function leave(chatroomId: number) {
  const { data } = await http.delete(`/chats/${chatroomId}`);
  return !!data;
}

/** 메시지 전송 */
async function send(chatroomId: number, text: string): Promise<ChatMessageDTO> {
  const { data } = await http.post(`/chats/${chatroomId}/messages`, { message: text });
  return (data?.result ?? data) as ChatMessageDTO;
}

/** 외부 노출용 통합 객체 */
const chatApi = {
  isAdminClient,
  adminList,
  list,
  messages,
  create,
  join,
  leave,
  send,
};

export default chatApi;
