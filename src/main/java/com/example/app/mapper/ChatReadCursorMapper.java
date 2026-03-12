package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.ChatReadCursor;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface ChatReadCursorMapper extends BaseMapper<ChatReadCursor> {

    /**
     * 查詢使用者在多個聊天室的未讀數量。
     * 回傳 List of {room_id, unread_count}
     */
    @Select("""
        <script>
        SELECT cr.id AS room_id,
               COALESCE(SUM(CASE WHEN cm.id > COALESCE(crc.last_read_msg_id, 0) THEN 1 ELSE 0 END), 0) AS unread_count
        FROM chat_room cr
        LEFT JOIN chat_message cm ON cm.room_id = cr.id AND cm.deleted = 0
        LEFT JOIN chat_read_cursor crc ON crc.room_id = cr.id AND crc.user_id = #{userId}
        WHERE cr.id IN
        <foreach item="rid" collection="roomIds" open="(" separator="," close=")">
            #{rid}
        </foreach>
        GROUP BY cr.id
        </script>
    """)
    List<Map<String, Object>> countUnreadByRooms(@Param("userId") Long userId, @Param("roomIds") List<Long> roomIds);
}
