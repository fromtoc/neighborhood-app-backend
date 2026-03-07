package com.example.app.dto.mgmt;

import com.example.app.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class AdminUserResponse {

    private Long id;
    private String nickname;
    private String avatarUrl;
    private Boolean isGuest;
    private Boolean isAdmin;
    private Boolean isSuperAdmin;
    private List<String> providers;
    private LocalDateTime createdAt;

    public static AdminUserResponse from(User u, List<String> providers) {
        return AdminUserResponse.builder()
                .id(u.getId())
                .nickname(u.getNickname())
                .avatarUrl(u.getAvatarUrl())
                .isGuest(Integer.valueOf(1).equals(u.getIsGuest()))
                .isAdmin(Integer.valueOf(1).equals(u.getIsAdmin()))
                .isSuperAdmin(Integer.valueOf(1).equals(u.getIsSuperAdmin()))
                .providers(providers != null ? providers : List.of())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
