package com.example.app.dto.category;

import com.example.app.entity.Category;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CategoryTreeNode {

    private Long id;
    private String name;
    private String slug;
    private String icon;
    private Long parentId;
    private Integer sortOrder;
    private List<CategoryTreeNode> children;

    public static CategoryTreeNode from(Category c) {
        return CategoryTreeNode.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .icon(c.getIcon())
                .parentId(c.getParentId())
                .sortOrder(c.getSortOrder())
                .children(List.of())
                .build();
    }

    public CategoryTreeNode withChildren(List<CategoryTreeNode> children) {
        return CategoryTreeNode.builder()
                .id(this.id)
                .name(this.name)
                .slug(this.slug)
                .icon(this.icon)
                .parentId(this.parentId)
                .sortOrder(this.sortOrder)
                .children(children)
                .build();
    }
}
