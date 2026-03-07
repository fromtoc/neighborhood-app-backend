package com.example.app.controller;

import com.example.app.common.result.ApiResponse;
import com.example.app.dto.category.CategoryTreeNode;
import com.example.app.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Category", description = "地點分類 API")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "取得完整分類樹", description = "回傳兩層分類樹（頂層 + 子分類）")
    public ApiResponse<List<CategoryTreeNode>> tree() {
        return ApiResponse.success(categoryService.getTree());
    }

    @GetMapping("/top")
    @Operation(summary = "取得頂層分類", description = "不含子分類")
    public ApiResponse<List<CategoryTreeNode>> top() {
        return ApiResponse.success(categoryService.listTopLevel());
    }

    @GetMapping("/{parentId}/children")
    @Operation(summary = "取得子分類", description = "依父分類 ID 查詢子分類清單")
    public ApiResponse<List<CategoryTreeNode>> children(
            @Parameter(description = "父分類 ID", required = true, in = ParameterIn.PATH)
            @PathVariable Long parentId
    ) {
        return ApiResponse.success(categoryService.listChildren(parentId));
    }
}
