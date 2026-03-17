package com.example.app.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface MgmtAnalyticsMapper {

    @Select("SELECT COUNT(*) FROM `user` WHERE deleted = 0 AND is_guest = 0")
    long countTotalUsers();

    @Select("SELECT COUNT(*) FROM `user` WHERE deleted = 0 AND is_guest = 1")
    long countTotalGuests();

    @Select("SELECT COUNT(*) FROM post WHERE deleted = 0")
    long countTotalPosts();

    @Select("SELECT COUNT(*) FROM place WHERE deleted = 0")
    long countTotalPlaces();

    @Select("SELECT COUNT(*) FROM neighborhood WHERE status = 1 AND deleted = 0")
    long countTotalNeighborhoods();

    @Select("SELECT COUNT(*) FROM `user` WHERE deleted = 0 AND is_guest = 0 AND created_at >= #{todayStart}")
    long countTodayNewUsers(@Param("todayStart") LocalDate todayStart);

    @Select("SELECT COUNT(*) FROM post WHERE deleted = 0 AND created_at >= #{todayStart}")
    long countTodayNewPosts(@Param("todayStart") LocalDate todayStart);

    @Select("SELECT COUNT(DISTINCT user_id) FROM user_login_log WHERE created_at >= #{since}")
    long countWeekActiveUsers(@Param("since") LocalDate since);

    @Select("SELECT DATE(created_at) AS `date`, COUNT(*) AS `count` " +
            "FROM `user` WHERE deleted = 0 AND is_guest = 0 AND created_at >= #{since} " +
            "GROUP BY DATE(created_at) ORDER BY `date`")
    List<Map<String, Object>> dailyNewUsers(@Param("since") LocalDate since);

    @Select("SELECT DATE(created_at) AS `date`, COUNT(*) AS `count` " +
            "FROM post WHERE deleted = 0 AND created_at >= #{since} " +
            "GROUP BY DATE(created_at) ORDER BY `date`")
    List<Map<String, Object>> dailyNewPosts(@Param("since") LocalDate since);

    @Select("SELECT provider, COUNT(DISTINCT user_id) AS `count` " +
            "FROM user_identity GROUP BY provider")
    List<Map<String, Object>> providerDistribution();

    @Select("SELECT type, COUNT(*) AS `count` " +
            "FROM post WHERE deleted = 0 GROUP BY type")
    List<Map<String, Object>> postTypeDistribution();
}
