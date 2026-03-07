package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.category.CategoryTreeNode;
import com.example.app.entity.Category;
import com.example.app.mapper.CategoryMapper;
import com.example.app.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryMapper categoryMapper;

    @Override
    public List<CategoryTreeNode> listTopLevel() {
        return categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .isNull(Category::getParentId)
                        .eq(Category::getStatus, 1)
                        .orderByAsc(Category::getSortOrder)
        ).stream().map(CategoryTreeNode::from).toList();
    }

    @Override
    public List<CategoryTreeNode> listChildren(Long parentId) {
        return categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .eq(Category::getParentId, parentId)
                        .eq(Category::getStatus, 1)
                        .orderByAsc(Category::getSortOrder)
        ).stream().map(CategoryTreeNode::from).toList();
    }

    @Override
    public List<CategoryTreeNode> getTree() {
        List<Category> all = categoryMapper.selectList(
                new LambdaQueryWrapper<Category>()
                        .eq(Category::getStatus, 1)
                        .orderByAsc(Category::getSortOrder)
        );

        // group children by parentId
        Map<Long, List<CategoryTreeNode>> childrenMap = all.stream()
                .filter(c -> c.getParentId() != null)
                .map(CategoryTreeNode::from)
                .collect(Collectors.groupingBy(CategoryTreeNode::getParentId));

        // build top-level nodes with children attached
        return all.stream()
                .filter(c -> c.getParentId() == null)
                .map(c -> CategoryTreeNode.from(c)
                        .withChildren(childrenMap.getOrDefault(c.getId(), List.of())))
                .toList();
    }
}
