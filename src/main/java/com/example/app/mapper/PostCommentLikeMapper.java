package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.PostCommentLike;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface PostCommentLikeMapper extends BaseMapper<PostCommentLike> {

    @Update("UPDATE post_comment SET like_count = like_count + 1 WHERE id = #{commentId}")
    void incrementLike(@Param("commentId") Long commentId);

    @Update("UPDATE post_comment SET like_count = GREATEST(like_count - 1, 0) WHERE id = #{commentId}")
    void decrementLike(@Param("commentId") Long commentId);
}
