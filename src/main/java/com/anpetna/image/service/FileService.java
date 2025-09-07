package com.anpetna.image.service;

import com.anpetna.image.dto.ImageDTO;
import org.springframework.web.multipart.MultipartFile;

public interface FileService {

   //======================== Description ========================
   // 명령어 옵션 : 하드코딩 금지, 빌드된 jar를 그대로 배포해도 옵션만 바꿔 환경에 맞춤
   // app.upload.dir 저장소 위치
   // app.upload.url-base = /files
   // 로컬 : http://192.168.0.000:8080/files/{fileName}
   // s3 : https://{bucketName}.s3.amazonaws.com/files/{fileName}
   // app.upload.bucket-name
   // app.upload.region : s3 Client 생성시 활용
   // app.upload.type : 개발 환경에서는 로컬 저장소, 운영 환경에서는 S3 같은 외부 스토리지 선택
   // s3 key = /files/{fileName}

   ImageDTO uploadFile(MultipartFile files, Integer sortOrder);

   byte[] downloadFile(String key);

   void deleteFile(String key);

}
