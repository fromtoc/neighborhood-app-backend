package com.example.app.service;

import com.example.app.dto.category.CategoryTreeNode;

import java.util.List;

/**
 * 地點分類查詢 Service。
 */
public interface CategoryService {

    /** 取得頂層分類清單（不含子分類）*/
    List<CategoryTreeNode> listTopLevel();

    /** 取得指定父分類的子分類清單 */
    List<CategoryTreeNode> listChildren(Long parentId);

    /** 取得完整兩層分類樹（頂層 + 各自的子分類）*/
    List<CategoryTreeNode> getTree();
}
