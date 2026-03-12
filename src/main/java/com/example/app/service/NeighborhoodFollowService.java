package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.follow.FollowListResponse;
import com.example.app.dto.follow.FollowResponse;
import com.example.app.entity.FollowCooldown;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.UserNeighborhoodFollow;
import com.example.app.mapper.FollowCooldownMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserNeighborhoodFollowMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NeighborhoodFollowService {

    private final UserNeighborhoodFollowMapper followMapper;
    private final NeighborhoodMapper           neighborhoodMapper;
    private final FollowCooldownMapper         cooldownMapper;

    private static final int MAX_FOLLOWS = 3;
    private static final int COOLDOWN_DAYS = 7;

    public FollowListResponse getFollowing(Long userId) {
        List<UserNeighborhoodFollow> follows = followMapper.selectList(
                new LambdaQueryWrapper<UserNeighborhoodFollow>()
                        .eq(UserNeighborhoodFollow::getUserId, userId)
                        .orderByDesc(UserNeighborhoodFollow::getIsDefault)
                        .orderByAsc(UserNeighborhoodFollow::getCreatedAt));

        LocalDateTime now = LocalDateTime.now();
        int cooldownSlots = cooldownMapper.countActiveByUserId(userId, now);
        LocalDateTime cooldownExpiredAt = cooldownMapper.findLatestExpiredAt(userId, now);

        if (follows.isEmpty()) {
            return FollowListResponse.builder()
                    .follows(List.of())
                    .cooldownSlots(cooldownSlots)
                    .cooldownExpiredAt(cooldownExpiredAt)
                    .build();
        }

        List<Long> nhIds = follows.stream().map(UserNeighborhoodFollow::getNeighborhoodId).toList();
        Map<Long, Neighborhood> nhMap = neighborhoodMapper.selectBatchIds(nhIds).stream()
                .collect(Collectors.toMap(Neighborhood::getId, Function.identity()));

        List<FollowResponse> list = follows.stream()
                .filter(f -> nhMap.containsKey(f.getNeighborhoodId()))
                .map(f -> FollowResponse.from(nhMap.get(f.getNeighborhoodId()), f))
                .toList();

        return FollowListResponse.builder()
                .follows(list)
                .cooldownSlots(cooldownSlots)
                .cooldownExpiredAt(cooldownExpiredAt)
                .build();
    }

    public void follow(Long userId, Long neighborhoodId) {
        if (followMapper.existsFollow(userId, neighborhoodId) > 0) return;

        LocalDateTime now = LocalDateTime.now();
        int count = followMapper.countByUserId(userId);
        int cooldownSlots = cooldownMapper.countActiveByUserId(userId, now);
        if (count + cooldownSlots >= MAX_FOLLOWS) {
            throw new BusinessException(ResultCode.FORBIDDEN, "已達關注上限（含冷卻中的名額）");
        }

        Neighborhood nh = neighborhoodMapper.selectById(neighborhoodId);
        if (nh == null) throw new BusinessException(ResultCode.NOT_FOUND, "里不存在");

        UserNeighborhoodFollow follow = new UserNeighborhoodFollow();
        follow.setUserId(userId);
        follow.setNeighborhoodId(neighborhoodId);
        follow.setIsDefault(count == 0 ? 1 : 0);
        followMapper.insert(follow);
    }

    @Transactional
    public void unfollow(Long userId, Long neighborhoodId) {
        UserNeighborhoodFollow follow = followMapper.selectOne(
                new LambdaQueryWrapper<UserNeighborhoodFollow>()
                        .eq(UserNeighborhoodFollow::getUserId, userId)
                        .eq(UserNeighborhoodFollow::getNeighborhoodId, neighborhoodId));

        if (follow == null) return;

        int count = followMapper.countByUserId(userId);
        if (count <= 1) {
            throw new BusinessException(ResultCode.FORBIDDEN, "至少需保留 1 個關注里");
        }
        if (follow.getIsDefault() != null && follow.getIsDefault() == 1) {
            throw new BusinessException(ResultCode.FORBIDDEN, "無法刪除預設里，請先將其他里設為預設");
        }

        followMapper.deleteById(follow.getId());

        FollowCooldown cooldown = new FollowCooldown();
        cooldown.setUserId(userId);
        cooldown.setExpiredAt(LocalDateTime.now().plusDays(COOLDOWN_DAYS));
        cooldownMapper.insert(cooldown);
    }

    @Transactional
    public void setDefault(Long userId, Long neighborhoodId) {
        UserNeighborhoodFollow target = followMapper.selectOne(
                new LambdaQueryWrapper<UserNeighborhoodFollow>()
                        .eq(UserNeighborhoodFollow::getUserId, userId)
                        .eq(UserNeighborhoodFollow::getNeighborhoodId, neighborhoodId));
        if (target == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "未關注此里");
        }

        // 清除舊 default
        followMapper.update(null, new LambdaUpdateWrapper<UserNeighborhoodFollow>()
                .eq(UserNeighborhoodFollow::getUserId, userId)
                .set(UserNeighborhoodFollow::getIsDefault, 0));

        // 設新 default
        target.setIsDefault(1);
        followMapper.updateById(target);
    }

    public void updateAlias(Long userId, Long neighborhoodId, String alias) {
        UserNeighborhoodFollow follow = followMapper.selectOne(
                new LambdaQueryWrapper<UserNeighborhoodFollow>()
                        .eq(UserNeighborhoodFollow::getUserId, userId)
                        .eq(UserNeighborhoodFollow::getNeighborhoodId, neighborhoodId));
        if (follow == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "未關注此里");
        }

        String trimmed = alias != null ? alias.trim() : null;
        follow.setAlias(trimmed != null && !trimmed.isEmpty() ? trimmed : null);
        followMapper.updateById(follow);
    }
}
