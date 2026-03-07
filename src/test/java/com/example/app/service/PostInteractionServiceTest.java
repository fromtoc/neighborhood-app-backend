package com.example.app.service;

import com.example.app.dto.post.PostCommentResponse;
import com.example.app.dto.post.PostLikeResponse;
import com.example.app.entity.Post;
import com.example.app.entity.PostComment;
import com.example.app.entity.PostLike;
import com.example.app.entity.User;
import com.example.app.mapper.PostCommentMapper;
import com.example.app.mapper.PostLikeMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.impl.PostInteractionServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostInteractionServiceTest {

    @Mock PostLikeMapper    postLikeMapper;
    @Mock PostCommentMapper postCommentMapper;
    @Mock PostMapper        postMapper;
    @Mock UserMapper        userMapper;

    @InjectMocks PostInteractionServiceImpl service;

    /* ── toggleLike ─────────────────────────────────── */

    @Test
    void toggleLike_firstLike_insertsAndReturnsLiked() {
        when(postLikeMapper.selectOne(any())).thenReturn(null);
        when(postMapper.selectById(1L)).thenReturn(postWith(1L, 1));

        PostLikeResponse res = service.toggleLike(1L, 10L);

        assertThat(res.isLiked()).isTrue();
        assertThat(res.getLikeCount()).isEqualTo(1);
        verify(postLikeMapper).insert(any(PostLike.class));
        verify(postMapper).incrementLike(1L);
    }

    @Test
    void toggleLike_alreadyLiked_deletesAndReturnsUnliked() {
        PostLike existing = new PostLike();
        existing.setId(99L);
        when(postLikeMapper.selectOne(any())).thenReturn(existing);
        when(postMapper.selectById(1L)).thenReturn(postWith(1L, 0));

        PostLikeResponse res = service.toggleLike(1L, 10L);

        assertThat(res.isLiked()).isFalse();
        assertThat(res.getLikeCount()).isEqualTo(0);
        verify(postLikeMapper).deleteById(99L);
        verify(postMapper).decrementLike(1L);
    }

    /* ── listComments ───────────────────────────────── */

    @SuppressWarnings("unchecked")
    @Test
    void listComments_returnsOrderedList() {
        PostComment c1 = comment(1L, 1L, 10L, "hello");
        PostComment c2 = comment(2L, 1L, 20L, "hi");
        when(postCommentMapper.selectList(any())).thenReturn(List.of(c1, c2));
        when(userMapper.selectBatchIds(any(List.class))).thenReturn(List.of(
                userWith(10L, "Alice"), userWith(20L, "Bob")));

        List<PostCommentResponse> list = service.listComments(1L);

        assertThat(list).hasSize(2);
        assertThat(list.get(0).getNickname()).isEqualTo("Alice");
        assertThat(list.get(1).getNickname()).isEqualTo("Bob");
    }

    /* ── addComment ─────────────────────────────────── */

    @SuppressWarnings("unchecked")
    @Test
    void addComment_savesAndIncrementsCount() {
        when(userMapper.selectBatchIds(any(List.class))).thenReturn(List.of(userWith(10L, "小明")));

        PostCommentResponse res = service.addComment(1L, 10L, "測試留言");

        verify(postCommentMapper).insert(any(PostComment.class));
        verify(postMapper).incrementComment(1L);
        assertThat(res.getContent()).isEqualTo("測試留言");
        assertThat(res.getNickname()).isEqualTo("小明");
    }

    /* ── helpers ────────────────────────────────────── */

    private Post postWith(Long id, int likeCount) {
        Post p = new Post();
        p.setId(id);
        p.setLikeCount(likeCount);
        p.setCommentCount(0);
        return p;
    }

    private PostComment comment(Long id, Long postId, Long userId, String content) {
        PostComment c = new PostComment();
        c.setId(id);
        c.setPostId(postId);
        c.setUserId(userId);
        c.setContent(content);
        c.setCreatedAt(LocalDateTime.now());
        return c;
    }

    private User userWith(Long id, String nickname) {
        User u = new User();
        u.setId(id);
        u.setNickname(nickname);
        u.setIsGuest(0);
        return u;
    }
}
