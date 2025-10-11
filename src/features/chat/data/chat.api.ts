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

/**  관리자 여부 판별 */
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
  const resp = await http.get('/consultants/chats', { params: { page: 0, size: 50 } });
  const page: any = resp.data ?? {};
  const arr: ChatroomDTO[] = Array.isArray(page.content) ? page.content : [];
  return arr;
}

/** (회원) 내 채팅방 목록 */
async function userList(): Promise<ChatroomDTO[]> {
  const { data } = await http.get('/chats');
  return (Array.isArray(data) ? data : []) as ChatroomDTO[];
}

/** 목록(회원: 본인 채팅방 / 관리자: 전체) */
async function list(): Promise<ChatroomDTO[]> {
  if (isAdminClient()) {
    try {
      return await adminList();
    } catch {
      // 관리자 엔드포인트 실패 시 회원 목록으로 폴백
      return await userList();
    }
  }
  // 일반 회원은 관리자 API를 호출하지 않음(401로 인한 강제 로그아웃 방지)
  return await userList();
}

// 메시지 내역 조회
async function messages(chatroomId: number): Promise<ChatMessageDTO[]> {
  const { data } = await http.get(`/chats/${chatroomId}/messages`);
  return data as ChatMessageDTO[];
}

// 새 채팅방 생성
async function create(title: string): Promise<ChatroomDTO> {
  const { data } = await http.post('/chats', null, { params: { title } });
  return data as ChatroomDTO;
}

// (선택) 입장
async function join(chatroomId: number, currentChatroomId?: number) {
  const { data } = await http.post(`/chats/${chatroomId}`, null, {
    params: currentChatroomId ? { currentChatroomId } : {},
  });
  return !!data;
}

// 퇴장 (관리자는 기록을 가지고있어야 하므로 퇴장 불가)
async function leave(chatroomId: number) {
  const { data } = await http.delete(`/chats/${chatroomId}`);
  return !!data;
}

// 메세지 전송
async function send(chatroomId: number, message: string): Promise<ChatMessageDTO> {
  const r = await http.post(`/chats/${chatroomId}/messages`, { message });
  return r.data as ChatMessageDTO;
}

export const chatApi = { list, messages, create, join, leave, send };
export default chatApi;
