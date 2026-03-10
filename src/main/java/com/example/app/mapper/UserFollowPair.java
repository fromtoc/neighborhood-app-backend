package com.example.app.mapper;

import lombok.Data;

/** 通知查詢輔助 DTO：使用者 ID + 其關注的里 ID */
@Data
public class UserFollowPair {
    private Long userId;
    private Long neighborhoodId;
}
