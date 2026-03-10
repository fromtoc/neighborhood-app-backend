package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.UserNotificationSettings;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface UserNotificationSettingsMapper extends BaseMapper<UserNotificationSettings> {

    /**
     * 查詢關注指定里的非訪客使用者，並確認指定通知類型已開啟。
     * 回傳 (userId, neighborhoodId) pair，方便記錄通知時存入正確的里 ID。
     */
    @Select("""
            SELECT u.id AS user_id, f.neighborhood_id AS neighborhood_id
            FROM `user` u
            JOIN user_neighborhood_follow f ON f.user_id = u.id
                AND f.neighborhood_id = #{neighborhoodId}
            LEFT JOIN user_notification_settings s ON s.user_id = u.id
            WHERE u.is_guest = 0
              AND u.deleted = 0
              AND (s.user_id IS NULL OR s.${settingColumn} = 1)
            """)
    List<UserFollowPair> findEnabledUsersByNeighborhood(
            @Param("neighborhoodId") Long neighborhoodId,
            @Param("settingColumn") String settingColumn);

    /**
     * 批量查詢關注多個里（同一個區）的使用者，用於 district_info 廣播。
     * 每個 pair 包含使用者自己關注的里 ID，方便通知記錄各自歸屬正確的里。
     */
    @Select("""
            <script>
            SELECT u.id AS user_id, f.neighborhood_id AS neighborhood_id
            FROM `user` u
            JOIN user_neighborhood_follow f ON f.user_id = u.id
            LEFT JOIN user_notification_settings s ON s.user_id = u.id
            WHERE f.neighborhood_id IN
              <foreach item='id' collection='neighborhoodIds' open='(' separator=',' close=')'>#{id}</foreach>
              AND u.is_guest = 0
              AND u.deleted = 0
              AND (s.user_id IS NULL OR s.${settingColumn} = 1)
            </script>
            """)
    List<UserFollowPair> findEnabledUsersByNeighborhoods(
            @Param("neighborhoodIds") List<Long> neighborhoodIds,
            @Param("settingColumn") String settingColumn);
}
