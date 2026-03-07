package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.result.PageResult;
import com.example.app.dto.post.PostResponse;
import com.example.app.entity.Post;
import com.example.app.entity.User;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.impl.PostQueryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostQueryServiceTest {

    @Mock PostMapper postMapper;
    @Mock UserMapper userMapper;
    @Mock com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks PostQueryServiceImpl service;

    // ── listByNeighborhood ────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void listByNeighborhood_returnsPaginatedPosts() {
        Post p = post(1L, 10L, "hello content", "fresh");
        Page<Post> page = new Page<>(1, 20);
        page.setRecords(List.of(p));
        page.setTotal(1L);

        when(postMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(page);
        when(userMapper.selectBatchIds(any(Collection.class))).thenReturn(List.of(user(1L, "測試用戶")));

        PageResult<PostResponse> result = service.listByNeighborhood(10L, null, 1, 20);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getRecords()).hasSize(1);
        assertThat(result.getRecords().get(0).getContent()).isEqualTo("hello content");
        assertThat(result.getRecords().get(0).getAuthorName()).isEqualTo("測試用戶");
    }

    @Test
    @SuppressWarnings("unchecked")
    void listByNeighborhood_withTypeFilter_returnsFiltered() {
        Post p = post(2L, 10L, "好吃便當推薦", "store_visit");
        Page<Post> page = new Page<>(1, 20);
        page.setRecords(List.of(p));
        page.setTotal(1L);

        when(postMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(page);
        when(userMapper.selectBatchIds(any(Collection.class))).thenReturn(List.of());

        PageResult<PostResponse> result = service.listByNeighborhood(10L, "store_visit", 1, 20);

        assertThat(result.getRecords().get(0).getType()).isEqualTo("store_visit");
    }

    @Test
    @SuppressWarnings("unchecked")
    void listByNeighborhood_emptyResult() {
        Page<Post> page = new Page<>(1, 20);
        page.setRecords(List.of());
        page.setTotal(0L);

        when(postMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(page);

        PageResult<PostResponse> result = service.listByNeighborhood(99L, null, 1, 20);

        assertThat(result.getTotal()).isEqualTo(0);
        assertThat(result.getRecords()).isEmpty();
    }

    // ── getById ───────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void getById_found_returnsPost() {
        Post p = post(1L, 10L, "test content", "general");
        when(postMapper.selectById(1L)).thenReturn(p);
        when(userMapper.selectBatchIds(any(Collection.class))).thenReturn(List.of(user(1L, "作者")));

        PostResponse result = service.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getAuthorName()).isEqualTo("作者");
    }

    @Test
    void getById_notFound_returnsNull() {
        when(postMapper.selectById(99L)).thenReturn(null);

        assertThat(service.getById(99L)).isNull();
    }

    // ── PostResponse.parseImages ──────────────────────────────

    @Test
    void postResponse_parsesImagesJson() {
        Post p = post(1L, 10L, "content", "general");
        p.setImagesJson("[\"https://a.com/1.jpg\",\"https://b.com/2.jpg\"]");

        var resp = com.example.app.dto.post.PostResponse.from(p);

        assertThat(resp.getImages()).containsExactly("https://a.com/1.jpg", "https://b.com/2.jpg");
    }

    @Test
    void postResponse_nullImages_returnsEmptyList() {
        Post p = post(1L, 10L, "content", "general");
        p.setImagesJson(null);

        assertThat(com.example.app.dto.post.PostResponse.from(p).getImages()).isEmpty();
    }

    // ── helpers ───────────────────────────────────────────────

    private User user(Long id, String nickname) {
        User u = new User();
        u.setId(id);
        u.setNickname(nickname);
        u.setIsGuest(0);
        return u;
    }

    private Post post(Long id, Long neighborhoodId, String content, String type) {
        Post p = new Post();
        p.setId(id);
        p.setNeighborhoodId(neighborhoodId);
        p.setUserId(1L);
        p.setContent(content);
        p.setType(type);
        p.setLikeCount(0);
        p.setCommentCount(0);
        p.setStatus(1);
        p.setDeleted(0);
        p.setCreatedAt(LocalDateTime.now());
        return p;
    }
}
