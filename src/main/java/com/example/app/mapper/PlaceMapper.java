package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.Place;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PlaceMapper extends BaseMapper<Place> {
}
