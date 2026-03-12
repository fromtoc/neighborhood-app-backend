package com.example.app.service;

import com.example.app.common.enums.UserRole;
import com.example.app.common.result.PageResult;
import com.example.app.dto.post.CreatePostRequest;
import com.example.app.dto.post.PostResponse;
import com.example.app.entity.Post;

import java.util.List;

/**
 * 社群貼文查詢 Service（App / Web 共用）。
 */
public interface PostQueryService {

    /**
     * 分頁查詢指定里的貼文（依建立時間倒序）。
     *
     * @param neighborhoodId 里 ID
     * @param type           貼文類型過濾（null = 全部）
     * @param page           頁碼（從 1 開始）
     * @param size           每頁筆數
     */
    PageResult<PostResponse> listByNeighborhood(Long neighborhoodId, String type, int page, int size);

    /** 查詢指定用戶的貼文 */
    PageResult<PostResponse> listByUser(Long userId, int page, int size);

    /** 依 ID 取得單筆貼文（含作者暱稱） */
    PostResponse getById(Long id);

    /** 建立貼文 */
    Post create(Long userId, CreatePostRequest req);

    /** 編輯貼文（只能編輯自己的貼文） */
    PostResponse updatePost(Long postId, Long requesterId, UserRole requesterRole, String title, String content, List<String> images, java.util.Map<String, Object> extra, String urgency);

    /** 刪除貼文 */
    void deletePost(Long postId, Long requesterId, UserRole requesterRole);
}
