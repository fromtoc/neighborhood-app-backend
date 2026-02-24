package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.Neighborhood;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NeighborhoodMapper extends BaseMapper<Neighborhood> {

    int batchUpsert(@Param("list") List<Neighborhood> list);
}
