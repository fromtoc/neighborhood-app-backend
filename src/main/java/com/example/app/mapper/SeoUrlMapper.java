package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.SeoUrl;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SeoUrlMapper extends BaseMapper<SeoUrl> {

    /** INSERT ... ON DUPLICATE KEY UPDATE（以 url 為唯一鍵）*/
    void batchUpsert(@Param("list") List<SeoUrl> list);
}
