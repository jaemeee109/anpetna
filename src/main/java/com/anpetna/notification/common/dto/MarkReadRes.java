package com.anpetna.notification.common.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MarkReadRes {

    private Long nId;
    private boolean success;

}
