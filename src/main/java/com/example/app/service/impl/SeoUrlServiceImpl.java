package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Place;
import com.example.app.entity.Post;
import com.example.app.entity.SeoUrl;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.SeoUrlMapper;
import com.example.app.service.SeoUrlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeoUrlServiceImpl implements SeoUrlService {

    private static final int BATCH_SIZE = 500;

    private final SeoUrlMapper       seoUrlMapper;
    private final NeighborhoodMapper neighborhoodMapper;

    @Override
    @Async
    public void batchUpsertNeighborhoods(List<Neighborhood> neighborhoods) {
        if (neighborhoods.isEmpty()) return;
        List<SeoUrl> rows = neighborhoods.stream().map(this::toNeighborhoodUrl).toList();
        for (int i = 0; i < rows.size(); i += BATCH_SIZE) {
            seoUrlMapper.batchUpsert(rows.subList(i, Math.min(i + BATCH_SIZE, rows.size())));
        }
        log.info("[SeoUrl] upserted {} neighborhood urls", rows.size());
    }

    @Override
    @Async
    public void rebuildNeighborhoods() {
        List<Neighborhood> all = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>().eq(Neighborhood::getStatus, 1));
        batchUpsertNeighborhoods(all);
        log.info("[SeoUrl] rebuildNeighborhoods done: {} records", all.size());
    }

    @Override
    @Async
    public void upsertPost(Post post) {
        SeoUrl row = new SeoUrl();
        row.setUrl("/posts/" + post.getId());
        row.setType("post");
        row.setRefId(post.getId());
        row.setIsIndexable(1);
        row.setPriority(new BigDecimal("0.5"));
        row.setChangefreq("daily");
        seoUrlMapper.batchUpsert(List.of(row));
    }

    @Override
    @Async
    public void upsertPlace(Place place) {
        SeoUrl row = new SeoUrl();
        row.setUrl("/places/" + place.getId());
        row.setType("place");
        row.setRefId(place.getId());
        row.setIsIndexable(1);
        row.setPriority(new BigDecimal("0.6"));
        row.setChangefreq("weekly");
        seoUrlMapper.batchUpsert(List.of(row));
    }

    // ── helpers ───────────────────────────────────────────────────

    private SeoUrl toNeighborhoodUrl(Neighborhood nb) {
        String url = "/" + nb.getCity() + "/" + nb.getDistrict() + "/" + nb.getName();
        SeoUrl row = new SeoUrl();
        row.setUrl(url);
        row.setType("neighborhood");
        row.setRefId(nb.getId());
        row.setIsIndexable(nb.getStatus() != null && nb.getStatus() == 1 ? 1 : 0);
        row.setPriority(new BigDecimal("0.6"));
        row.setChangefreq("daily");
        return row;
    }
}
