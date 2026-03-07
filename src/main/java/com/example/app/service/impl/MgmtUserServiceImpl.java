package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.mgmt.AdminUserResponse;
import com.example.app.entity.User;
import com.example.app.entity.UserIdentity;
import com.example.app.mapper.UserIdentityMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.MgmtUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MgmtUserServiceImpl implements MgmtUserService {

    private final UserMapper userMapper;
    private final UserIdentityMapper userIdentityMapper;

    @Override
    public PageResult<AdminUserResponse> listUsers(Long id, String keyword, String provider, int page, int size) {

        // 若指定 provider，先撈符合的 userId 集合（GUEST 特殊處理）
        Set<Long> providerUserIds = null;
        boolean filterGuest = false;
        if (StringUtils.hasText(provider)) {
            if ("GUEST".equalsIgnoreCase(provider)) {
                filterGuest = true;
            } else {
                List<UserIdentity> identities = userIdentityMapper.selectList(
                        new LambdaQueryWrapper<UserIdentity>()
                                .eq(UserIdentity::getProvider, provider.toUpperCase()));
                if (identities.isEmpty()) {
                    return new PageResult<>(0L, List.of());
                }
                providerUserIds = identities.stream().map(UserIdentity::getUserId).collect(Collectors.toSet());
            }
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();

        if (id != null) {
            wrapper.eq(User::getId, id);
        } else {
            if (filterGuest) {
                wrapper.eq(User::getIsGuest, 1);
            } else {
                if (StringUtils.hasText(keyword)) {
                    wrapper.like(User::getNickname, keyword);
                }
                if (providerUserIds != null) {
                    wrapper.in(User::getId, providerUserIds);
                }
            }
        }

        wrapper.orderByDesc(User::getId);

        var result = userMapper.selectPage(new Page<>(page, size), wrapper);
        List<User> users = result.getRecords();

        // 批次撈所有 user_identity，組成 userId → providers list
        Map<Long, List<String>> providerMap = batchLoadProviders(users);

        List<AdminUserResponse> records = users.stream()
                .map(u -> AdminUserResponse.from(u, providerMap.getOrDefault(u.getId(), List.of())))
                .toList();
        return new PageResult<>(result.getTotal(), records);
    }

    @Override
    public AdminUserResponse setAdmin(Long targetId, boolean admin) {
        User user = userMapper.selectById(targetId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");
        }
        if (Integer.valueOf(1).equals(user.getIsSuperAdmin())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "無法修改超級管理員");
        }
        if (Integer.valueOf(1).equals(user.getIsGuest())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "訪客無法設為管理員");
        }
        userMapper.update(new LambdaUpdateWrapper<User>()
                .eq(User::getId, targetId)
                .set(User::getIsAdmin, admin ? 1 : 0));
        user.setIsAdmin(admin ? 1 : 0);

        List<UserIdentity> identities = userIdentityMapper.selectList(
                new LambdaQueryWrapper<UserIdentity>().eq(UserIdentity::getUserId, targetId));
        List<String> providers = identities.stream().map(UserIdentity::getProvider).toList();
        return AdminUserResponse.from(user, providers);
    }

    private Map<Long, List<String>> batchLoadProviders(List<User> users) {
        if (users.isEmpty()) return Collections.emptyMap();
        List<Long> userIds = users.stream().map(User::getId).toList();
        List<UserIdentity> identities = userIdentityMapper.selectList(
                new LambdaQueryWrapper<UserIdentity>().in(UserIdentity::getUserId, userIds));
        return identities.stream().collect(
                Collectors.groupingBy(
                        UserIdentity::getUserId,
                        Collectors.mapping(UserIdentity::getProvider, Collectors.toList())));
    }
}
