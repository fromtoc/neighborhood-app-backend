package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.category.CategoryTreeNode;
import com.example.app.entity.Category;
import com.example.app.mapper.CategoryMapper;
import com.example.app.service.impl.CategoryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock CategoryMapper categoryMapper;

    @InjectMocks CategoryServiceImpl service;

    // ── listTopLevel ──────────────────────────────────────────

    @Test
    void listTopLevel_returnsOnlyRootCategories() {
        when(categoryMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(List.of(cat(1L, "餐飲", "food", null, 1)));

        List<CategoryTreeNode> result = service.listTopLevel();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("餐飲");
        assertThat(result.get(0).getParentId()).isNull();
    }

    @Test
    void listTopLevel_returnsEmptyWhenNone() {
        when(categoryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertThat(service.listTopLevel()).isEmpty();
    }

    // ── listChildren ─────────────────────────────────────────

    @Test
    void listChildren_returnsChildrenForParent() {
        when(categoryMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(List.of(
                        cat(101L, "早餐店", "breakfast", 1L, 1),
                        cat(102L, "便當店", "bento",     1L, 2)
                ));

        List<CategoryTreeNode> result = service.listChildren(1L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(CategoryTreeNode::getSlug)
                .containsExactly("breakfast", "bento");
    }

    @Test
    void listChildren_returnsEmptyForLeafNode() {
        when(categoryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertThat(service.listChildren(101L)).isEmpty();
    }

    // ── getTree ───────────────────────────────────────────────

    @Test
    void getTree_buildsCorrectTwoLevelTree() {
        Category root1 = cat(1L, "餐飲", "food",      null, 1);
        Category root2 = cat(2L, "購物", "shopping",  null, 2);
        Category child = cat(101L, "早餐店", "breakfast", 1L, 1);

        when(categoryMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(List.of(root1, root2, child));

        List<CategoryTreeNode> tree = service.getTree();

        // two top-level nodes
        assertThat(tree).hasSize(2);

        // first node has one child
        CategoryTreeNode foodNode = tree.get(0);
        assertThat(foodNode.getSlug()).isEqualTo("food");
        assertThat(foodNode.getChildren()).hasSize(1);
        assertThat(foodNode.getChildren().get(0).getSlug()).isEqualTo("breakfast");

        // second node has no children
        assertThat(tree.get(1).getChildren()).isEmpty();
    }

    @Test
    void getTree_emptyDb_returnsEmptyList() {
        when(categoryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertThat(service.getTree()).isEmpty();
    }

    // ── helper ────────────────────────────────────────────────

    private Category cat(Long id, String name, String slug, Long parentId, int sort) {
        Category c = new Category();
        c.setId(id);
        c.setName(name);
        c.setSlug(slug);
        c.setParentId(parentId);
        c.setSortOrder(sort);
        c.setStatus(1);
        return c;
    }
}
