import { http } from '@/shared/data/http';
import type {
  BoardType,
  // BoardDTO에 맞춘 타입(목록/상세 공용)
  BoardDetail as BoardDTO,  //  타입 이름에 맞춰 alias 사용 (원하면 BoardDTO로 이름 통일해도 됨)
  CreateBoardReq,
  UpdateBoardReq,
  // 페이지네이션 타입
  PageReq,
  PageRes,                  // PageResponseDTO<T> 형태(서버 구조에 맞춤)
} from './board.types';

/** 
 * BoardController는 /anpetna/board 아래 엔드포인트
 *  - POST   /create            : 글 등록
 *  - GET    /readAll           : 목록(+검색, 페이지네이션)
 *  - GET    /readOne/{bno}     : 상세 (조회수 + like=true면 좋아요 증가)
 *  - POST   /update/{bno}      : 수정   (PUT 아님!)
 *  - POST   /delete/{bno}      : 삭제   (DELETE 아님!)
 *  - POST   /like/{bno}        : 좋아요 +1
 */
const BASE_PATH = '/anpetna/board';

/**
 * 서버가 ApiResult<T> 같이 래핑해서 보낼 수도 있으니
 * 안/밖 어디에 data가 있어도 안전하게 꺼내는 유틸.
 * - axios 응답(r)           : r.data
 * - 서버 래퍼(ApiResult<T>) : r.data.data
 */
function unwrap<T>(r: any): T {
  return (r?.data?.data ?? r?.data) as T;
}

/**
 * readAll에서 사용하는 쿼리 스트링 빌더
 *  - page: 1부터 시작(서버 PageRequestDTO가 내부에서 -1 처리)
 *  - size: 페이지 사이즈
 *  - type: "t", "c", "w" 조합 (예: "t", "tw", "tcw" 등)
 *  - keyword: 검색어 (없으면 생략)
 */
function buildListQuery(params: { page?: number; size?: number; type?: string; keyword?: string }) {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set('page', String(params.page));
  if (params.size != null) qs.set('size', String(params.size));
  if (params.type) qs.set('type', params.type);        // 예: "t", "tw", "tcw"
  if (params.keyword) qs.set('keyword', params.keyword);
  const q = qs.toString();
  return q ? `${BASE_PATH}/readAll?${q}` : `${BASE_PATH}/readAll`;
}

export const boardApi = {
  /**
   * 게시글 목록 (검색/페이징)
   * - GET /anpetna/board/readAll?page=1&size=10&type=tw&keyword=abc
   * - type은 제목(t)/내용(c)/작성자(w) 문자 조합
   *   (예: "t", "c", "w", "tc", "tw", "tcw"...)
   * - 반환은 PageResponseDTO<BoardDTO>
   */
  list: (opts: { page?: number; size?: number; type?: string; keyword?: string }) =>
    http.get(buildListQuery(opts)).then((r) => unwrap<PageRes<BoardDTO>>(r)),

  /**
   * 게시글 상세
   * - GET /anpetna/board/readOne/{bno}
   * - like=true를 쿼리로 주면 조회와 동시에 좋아요 +1
   *   (서버에서 like=true 시 service.likeBoard(bno) 호출)
   *   예: /readOne/123?like=true
   */
  get: (bno: number, like = false) =>
    http
      .get(`${BASE_PATH}/readOne/${bno}${like ? '?like=true' : ''}`)
      .then((r) => unwrap<{ readOneBoard: BoardDTO }>(r)),

  /**
   * 게시글 생성
   * - POST /anpetna/board/create
   * - 본문: CreateBoardReq (bWriter, bTitle, bContent, boardType, flags, imageUrls 등)
   * - 반환: CreateBoardRes { createBoard: BoardDTO } (ApiResult로 한 번 더 감싸질 수 있음)
   */
  create: (payload: CreateBoardReq) =>
    http.post(`${BASE_PATH}/create`, payload).then((r) => unwrap<{ createBoard: BoardDTO }>(r)),

  /**
   * 게시글 수정
   * - POST /anpetna/board/update/{bno}  ← PUT/patch가 아닌 점 주의
   * - 본문: UpdateBoardReq (부분 수정 가능)
   * - 반환: UpdateBoardRes { updateBoard: BoardDTO }
   */
  update: (payload: UpdateBoardReq) =>
    http.post(`${BASE_PATH}/update/${payload.bno}`, payload).then((r) => unwrap<{ updateBoard: BoardDTO }>(r)),

  /**
   * 게시글 삭제
   * - POST /anpetna/board/delete/{bno}  ← DELETE가 아닌 점 주의
   * - 반환: DeleteBoardRes { deleteBoard: BoardDTO }
   */
  remove: (bno: number) =>
    http.post(`${BASE_PATH}/delete/${bno}`).then((r) => unwrap<{ deleteBoard: BoardDTO }>(r)),

  /**
   * 좋아요 +1 (상세에서 like=true로도 가능하지만, 별도 엔드포인트도 제공)
   * - POST /anpetna/board/like/{bno}
   * - 반환: UpdateBoardRes { updateBoard: BoardDTO }
   */
  like: (bno: number) =>
    http.post(`${BASE_PATH}/like/${bno}`).then((r) => unwrap<{ updateBoard: BoardDTO }>(r)),
};
