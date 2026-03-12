package com.example.app.dto.follow;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAliasRequest {
    @Size(max = 30, message = "別名最多 30 個字")
    private String alias;
}
