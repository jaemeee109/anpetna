package com.anpetna.notification.common.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SearchAllNotificationReq {
    private Boolean unreadOnly;
    private int page = 1;
    private int size = 10;
}
