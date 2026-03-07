package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.Post;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface PostMapper extends BaseMapper<Post> {

    @Update("UPDATE post SET like_count = GREATEST(0, like_count - 1) WHERE id = #{postId}")
    void decrementLike(Long postId);

    @Update("UPDATE post SET like_count = like_count + 1 WHERE id = #{postId}")
    void incrementLike(Long postId);

    @Update("UPDATE post SET comment_count = comment_count + 1 WHERE id = #{postId}")
    void incrementComment(Long postId);
}
