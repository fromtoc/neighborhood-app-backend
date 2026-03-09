package com.example.app.service;

import com.example.app.entity.Neighborhood;
import com.example.app.entity.Place;
import com.example.app.entity.Post;

import java.util.List;

public interface SeoUrlService {

    /** 根據 Neighborhood 清單批次寫入 seo_url */
    void batchUpsertNeighborhoods(List<Neighborhood> neighborhoods);

    /** 查詢所有 status=1 的 neighborhood 並全量重建 seo_url */
    void rebuildNeighborhoods();

    /** 寫入（或更新）一筆 Post 的 seo_url */
    void upsertPost(Post post);

    /** 寫入（或更新）一筆 Place 的 seo_url */
    void upsertPlace(Place place);
}
