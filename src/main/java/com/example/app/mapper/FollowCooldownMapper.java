package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.FollowCooldown;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;

public interface FollowCooldownMapper extends BaseMapper<FollowCooldown> {

    @Select("SELECT COUNT(*) FROM follow_cooldown WHERE user_id = #{userId} AND expired_at > #{now}")
    int countActiveByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Select("SELECT MAX(expired_at) FROM follow_cooldown WHERE user_id = #{userId} AND expired_at > #{now}")
    LocalDateTime findLatestExpiredAt(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
