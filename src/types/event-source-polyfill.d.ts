// src/types/event-source-polyfill.d.ts

/** TypeScript 선언 파일 */

// 브라우저의 기본 EventSource기능을 오래된 브라우저나 Node.js 환경에서도 사용 가능하게 해주는 라이브러리
declare module 'event-source-polyfill' {
  export const EventSourcePolyfill: any;
}
