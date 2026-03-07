package com.example.app.service;

import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.dto.chat.ChatRoomResponse;

import java.util.List;

/**
 * 聊天室 Service（App / Web 共用）。
 * Step 11 在此基礎上加 WebSocket 推播。
 */
public interface ChatQueryService {

    /** 取得（或自動建立）指定里的公開聊天室 */
    ChatRoomResponse getOrCreateRoom(Long neighborhoodId, String neighborhoodName);

    /**
     * 取得歷史訊息（cursor-based 分頁）。
     *
     * @param roomId  聊天室 ID
     * @param before  訊息 ID cursor（null = 最新）
     * @param limit   筆數上限（最大 50）
     */
    List<ChatMessageResponse> getMessages(Long roomId, Long before, int limit);

    /** 取得（或建立）兩人之間的私聊房間（需要非訪客身份）*/
    ChatRoomResponse getOrCreatePrivateRoom(Long requesterId, Long targetId);

    /** 列出用戶所有私聊房間 */
    List<ChatRoomResponse> listPrivateRooms(Long userId);

    /** 發送訊息（REST fallback，WebSocket 優先） */
    ChatMessageResponse sendMessage(Long roomId, Long userId, String content);
}
