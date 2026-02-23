package com.example.app.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.app.entity.UserIdentity;
import com.example.app.mapper.UserIdentityMapper;
import com.example.app.service.UserIdentityService;
import org.springframework.stereotype.Service;

@Service
public class UserIdentityServiceImpl extends ServiceImpl<UserIdentityMapper, UserIdentity>
        implements UserIdentityService {
}
