package com.anpetna.coreDto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;


@Data
@Builder // 세터를 사용하지 않고 빌터 페턴을 사용 아래 2개 어너노테이션 필수
@AllArgsConstructor
@NoArgsConstructor
@Log4j2
public class PageRequestDTO {

    // 페이징
    private Integer page;       // 페이지 번호 (0부터 시작)
    private Integer size;       // 한 페이지에 담을 아이템 수

    // 정렬
    private String sortBy;      // 정렬 기준 (ex: "cartId", "price")
    private String sortDir;     // asc / desc

    // 무한 스크롤용 옵션
    private Long lastId;        // lastId 기반 페이징 (cursor) -> 무한 스크롤 시 필요

    // 입력 검색
    private String keyword;

    // 편의 메서드: Slice/Page Pageable 변환 가능
    public Pageable toPageable() {
        Sort sort = "asc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        return PageRequest.of(page != null ? page : 0, size != null ? size : 20, sort);
    }


/*

    private String link;  // 프론트에 페이징번호 클릭시 처리되는 문자열
    // list?page=3&type=w&keyword=kkw

    public String getLink(){

        if(link == null){
            StringBuilder builder = new StringBuilder(); // String + 연산자로 사용하면 객체가 많이생김
            // 이를 해결하기 위한 기법

            builder.append("page=" + this.page); // page=1
            builder.append("&size=" + this.size); // page=1&size=10

            if(sortBy != null && sortBy.length() >0 ){
                // 타입이 있을 때
                builder.append("&type=" + sortBy); // page=1&size=10&type=???

            } // 타입이 있을 때 if문 종료

            if(keyword != null){
                try {
                    builder.append("&keyword=" + URLEncoder.encode(keyword,"UTF-8"));
                    // page=1&size=10&type=???&keyword=????
                }catch (UnsupportedEncodingException e){
                    log.info(e.getStackTrace());
                    log.info("UTF-8 처리중 오류발생");
                } // try문 종료
            } // 키워드 if문 종료
            link = builder().toString(); // 최종 결과물이 문자열로 변환되어 link에 저장
        } // if 문 종료
        return link; // page=1&size=10&type=???&keyword=????

    }// 메서드 종료


    // 추가메서드
    public String[] getTypes(){
        // 프론트에서 문자열이 여러개가 넘어오면 배열로 변환
        if(sortBy==null || sortBy.isEmpty()){
            // 넘어온 값이 널이거나 비어 있으면
            return null;
        }
        return sortBy.split(""); // 차후에 프론트에 폼박스 확인하고 조절!!!!
        // 문자열로 넘어온 값일 분할하여 배열에 꼽는다.
    }

    // 테스트용 코드를 dto로 만들어 메서드 처리함!!!
    public Pageable getPageable(String...props){ // String...props 배열이 몇개가 들어올지 모를때
        return PageRequest.of(this.page-1, this.size, Sort.by(props).descending());
        //                    페이지번호     게시물 수    정렬기법
    }

*/

}
