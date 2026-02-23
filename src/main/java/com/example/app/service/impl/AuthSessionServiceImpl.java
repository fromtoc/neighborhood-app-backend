package com.example.app.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.app.entity.AuthSession;
import com.example.app.mapper.AuthSessionMapper;
import com.example.app.service.AuthSessionService;
import org.springframework.stereotype.Service;

@Service
public class AuthSessionServiceImpl extends ServiceImpl<AuthSessionMapper, AuthSession>
        implements AuthSessionService {
}
