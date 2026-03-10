package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.UserNeighborhoodFollow;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserNeighborhoodFollowMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NeighborhoodFollowService {

    private final UserNeighborhoodFollowMapper followMapper;
    private final NeighborhoodMapper           neighborhoodMapper;

    public List<Neighborhood> getFollowing(Long userId) {
        List<Long> ids = followMapper.findNeighborhoodIdsByUserId(userId);
        if (ids.isEmpty()) return List.of();
        return neighborhoodMapper.selectBatchIds(ids);
    }

    public void follow(Long userId, Long neighborhoodId) {
        if (followMapper.existsFollow(userId, neighborhoodId) > 0) return; // 已關注，冪等
        int count = followMapper.countByUserId(userId);
        if (count >= 3) throw new BusinessException(ResultCode.FORBIDDEN, "最多只能關注 3 個里");
        Neighborhood nh = neighborhoodMapper.selectById(neighborhoodId);
        if (nh == null) throw new BusinessException(ResultCode.NOT_FOUND, "里不存在");
        UserNeighborhoodFollow follow = new UserNeighborhoodFollow();
        follow.setUserId(userId);
        follow.setNeighborhoodId(neighborhoodId);
        followMapper.insert(follow);
    }

    public void unfollow(Long userId, Long neighborhoodId) {
        followMapper.delete(new LambdaQueryWrapper<UserNeighborhoodFollow>()
                .eq(UserNeighborhoodFollow::getUserId, userId)
                .eq(UserNeighborhoodFollow::getNeighborhoodId, neighborhoodId));
    }
}
