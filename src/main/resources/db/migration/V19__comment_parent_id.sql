ALTER TABLE post_comment
    ADD COLUMN parent_id BIGINT NULL DEFAULT NULL AFTER post_id,
    ADD INDEX  idx_pc_parent      (parent_id),
    ADD INDEX  idx_pc_post_parent (post_id, parent_id);
