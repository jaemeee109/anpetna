package com.anpetna.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.List;
import java.time.Duration;
import java.util.Arrays;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Setter
@Getter
@Component
@Primary
@ConfigurationProperties(prefix = "spring.data.redis")
public class RedisClusterProperties {

    /** 기본 타임아웃 5초 */
    private Duration timeout = Duration.ofMillis(5000);

    /** 기본 클러스터 노드 */
    private Cluster cluster = new Cluster();

    @Setter
    @Getter
    public static class Cluster {
        // 기본 노드 목록
        private List<String> nodes = Arrays.asList(
                "172.28.141.159:7000",
                "172.28.141.159:7001",
                "172.28.141.159:7002",
                "172.28.141.159:7003",
                "172.28.141.159:7004",
                "172.28.141.159:7005"
        );

    }

}
