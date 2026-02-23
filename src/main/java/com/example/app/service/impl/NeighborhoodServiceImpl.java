package com.example.app.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.NeighborhoodService;
import org.springframework.stereotype.Service;

@Service
public class NeighborhoodServiceImpl extends ServiceImpl<NeighborhoodMapper, Neighborhood>
        implements NeighborhoodService {
}
