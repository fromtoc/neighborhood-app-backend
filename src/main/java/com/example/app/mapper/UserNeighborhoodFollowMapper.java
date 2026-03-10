package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.UserNeighborhoodFollow;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface UserNeighborhoodFollowMapper extends BaseMapper<UserNeighborhoodFollow> {

    @Select("SELECT neighborhood_id FROM user_neighborhood_follow WHERE user_id = #{userId} ORDER BY created_at ASC")
    List<Long> findNeighborhoodIdsByUserId(@Param("userId") Long userId);

    @Select("SELECT COUNT(*) FROM user_neighborhood_follow WHERE user_id = #{userId}")
    int countByUserId(@Param("userId") Long userId);

    @Select("SELECT COUNT(*) FROM user_neighborhood_follow WHERE user_id = #{userId} AND neighborhood_id = #{neighborhoodId}")
    int existsFollow(@Param("userId") Long userId, @Param("neighborhoodId") Long neighborhoodId);
}
