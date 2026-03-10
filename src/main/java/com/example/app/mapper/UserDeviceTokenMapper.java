package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.UserDeviceToken;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface UserDeviceTokenMapper extends BaseMapper<UserDeviceToken> {

    /** 取得某 neighborhood 所有使用者的 FCM token */
    @Select("""
            SELECT t.token FROM user_device_token t
            JOIN `user` u ON u.id = t.user_id
            WHERE u.default_neighborhood_id = #{neighborhoodId}
              AND u.deleted = 0
            """)
    List<String> findTokensByNeighborhoodId(@Param("neighborhoodId") Long neighborhoodId);

    /** 取得某些 neighborhood 所有使用者的 FCM token（district 用） */
    @Select("""
            SELECT t.token FROM user_device_token t
            JOIN `user` u ON u.id = t.user_id
            WHERE u.default_neighborhood_id IN
              <foreach item='id' collection='neighborhoodIds' open='(' separator=',' close=')'>#{id}</foreach>
              AND u.deleted = 0
            """)
    List<String> findTokensByNeighborhoodIds(@Param("neighborhoodIds") List<Long> neighborhoodIds);

    /** 取得指定 userIds 的 FCM token */
    @Select("""
            SELECT token FROM user_device_token
            WHERE user_id IN
              <foreach item='id' collection='userIds' open='(' separator=',' close=')'>#{id}</foreach>
            """)
    List<String> findTokensByUserIds(@Param("userIds") List<Long> userIds);

    /** 取得單一使用者的 FCM token */
    @Select("SELECT token FROM user_device_token WHERE user_id = #{userId}")
    List<String> findTokensByUserId(@Param("userId") Long userId);
}
