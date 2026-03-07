package com.example.app.dto.post;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PostLikeResponse {
    private boolean liked;
    private int likeCount;
}
