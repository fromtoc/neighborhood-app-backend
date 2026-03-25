package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("neighborhood_demographics")
public class NeighborhoodDemographics {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long neighborhoodId;
    private String period;
    private Integer householdCount;
    private Integer populationTotal;
    private Integer populationMale;
    private Integer populationFemale;
    private Integer birthTotal;
    private Integer birthMale;
    private Integer birthFemale;
    private Integer deathTotal;
    private Integer deathMale;
    private Integer deathFemale;
    private Integer marryCount;
    private Integer divorceCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
