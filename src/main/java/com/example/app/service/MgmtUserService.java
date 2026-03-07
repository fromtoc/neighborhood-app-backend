package com.example.app.service;

import com.example.app.common.result.PageResult;
import com.example.app.dto.mgmt.AdminUserResponse;

public interface MgmtUserService {

    PageResult<AdminUserResponse> listUsers(Long id, String keyword, String provider, int page, int size);

    AdminUserResponse setAdmin(Long targetId, boolean admin);
}
