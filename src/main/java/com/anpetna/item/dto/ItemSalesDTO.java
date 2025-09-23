package com.anpetna.item.dto;

import com.anpetna.item.constant.ItemCategory;
import com.anpetna.item.domain.ItemEntity;

import java.time.LocalDate;

public interface ItemSalesDTO {

    ItemEntity getItem();
    ItemCategory getItemCategory();
    int getQuantity();
    LocalDate getPeriod();
}
