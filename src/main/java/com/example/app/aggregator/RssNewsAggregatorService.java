package com.example.app.aggregator;

import com.example.app.entity.Post;
import com.example.app.mapper.PostMapper;
import com.example.app.service.NotificationService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.util.*;

/**
 * RSS 新聞爬蟲。
 * 比對優先度（由精到粗）：
 *   1. 里名  → 只發給該里
 *   2. 區/鄉鎮名 → 發給該區的代表里（district_info，該區訂閱者可見）
 *   3. 縣市名 → 發給該縣市每個區的代表里（全市訂閱者可見）
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.rss-news.enabled", havingValue = "true", matchIfMissing = false)
public class RssNewsAggregatorService {

    private static final String SOURCE = "rss_news";


    @Value("${aggregator.rss-news.feeds:" +
           "https://news.ltn.com.tw/rss/society.xml," +
           "https://feeds.feedburner.com/rsscna/social," +
           "https://feeds.feedburner.com/ettoday/realtime," +
           "https://news.pts.org.tw/xml/newsfeed.xml}")
    private String feedsConfig;

    private final RestTemplate      restTemplate;
    private final AggregatorSupport support;
    private final PostMapper        postMapper;

    @Autowired(required = false)
    private NotificationService notificationService;

    private Long systemUserId;
    private AggregatorSupport.NeighborhoodMaps maps;

    @PostConstruct
    public void init() {
        systemUserId = support.loadSystemUserId();
        maps = support.loadMaps();
    }

    @Scheduled(fixedDelayString   = "${aggregator.rss-news.interval-ms:1800000}",
               initialDelayString = "${aggregator.rss-news.initial-delay-ms:180000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("RssNews: system user not found"); return; }
        }
        int created = 0;
        for (String feedUrl : feedsConfig.split(",")) {
            feedUrl = feedUrl.trim();
            if (feedUrl.isBlank()) continue;
            try {
                created += processFeed(feedUrl);
            } catch (Exception e) {
                log.warn("RssNews: feed failed {}: {}", feedUrl, e.getMessage());
            }
        }
        log.info("RssNews crawl done: {} new posts", created);
    }

    private int processFeed(String feedUrl) throws Exception {
        byte[] bytes = restTemplate.getForObject(feedUrl, byte[].class);
        if (bytes == null || bytes.length == 0) {
            log.warn("RssNews: empty response from {}", feedUrl);
            return 0;
        }

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(bytes));

        // 支援 RSS 2.0（item）與 Atom（entry）
        boolean isAtom = doc.getElementsByTagName("entry").getLength() > 0
                      && doc.getElementsByTagName("item").getLength() == 0;
        NodeList items = isAtom
                ? doc.getElementsByTagName("entry")
                : doc.getElementsByTagName("item");
        int total = items.getLength();
        int created = 0, skippedCrawled = 0, skippedNoTarget = 0;
        for (int i = 0; i < total; i++) {
            Element item  = (Element) items.item(i);
            String title  = text(item, "title");
            // Atom: <summary> 或 <content>；RSS: <description>
            String desc   = isAtom
                    ? (text(item, "summary").isBlank() ? text(item, "content") : text(item, "summary"))
                    : text(item, "description");
            // Atom: <link href="...">；RSS: <link> 文字內容
            String link   = isAtom ? atomLink(item) : text(item, "link");
            // Atom: <id>；RSS: <guid>
            String guid   = isAtom ? text(item, "id") : text(item, "guid");
            // Atom: <published> 或 <updated>；RSS: <pubDate>
            String pubDate = isAtom
                    ? (text(item, "published").isBlank() ? text(item, "updated") : text(item, "published"))
                    : text(item, "pubDate");
            if (title.isBlank()) continue;

            String dedup = guid.isBlank() ? link : guid;
            if (dedup.isBlank()) dedup = title;
            String key = AggregatorSupport.sha256(SOURCE + "::" + dedup);
            if (support.isAlreadyCrawled(SOURCE, key)) { skippedCrawled++; continue; }

            // 抽取第一張圖片 URL（來自 <img src="..."> 或 <enclosure url="...">）
            String imageUrl = extractFirstImageUrl(item, desc);
            String cleanDesc = desc.replaceAll("<[^>]+>", "").trim();
            String body = cleanDesc.length() > 300 ? cleanDesc.substring(0, 300) + "…" : cleanDesc;
            String fullText = title + " " + body;

            // 解析出要發佈的目標 nhId 集合（精確到區）
            Set<Long> targets = support.resolveTargets(fullText, maps);

            if (targets.isEmpty()) {
                log.debug("RssNews: no geo match → {}", title);
                support.markCrawled(SOURCE, key);
                skippedNoTarget++;
                continue;
            }

            String src        = resolveFeedSource(feedUrl);
            String postTitle  = "【" + src + "】" + title;
            String postContent = buildContent(body, link, src, pubDate);

            for (Long nhId : targets) {
                Post post = support.buildPost(nhId, systemUserId, "district_info", postTitle, postContent, "normal");
                if (imageUrl != null) post.setImagesJson("[\"" + imageUrl + "\"]");
                postMapper.insert(post);
                created++;
                if (notificationService != null) {
                    String nb = body.length() > 80 ? body.substring(0, 80) + "…" : body;
                    notificationService.onNewInfo(nhId, "district_info", post.getId(), postTitle, nb);
                }
            }
            support.markCrawled(SOURCE, key);
        }
        log.info("RssNews [{}]: {} items, {} already crawled, {} no geo match, {} new posts",
                resolveFeedSource(feedUrl), total, skippedCrawled, skippedNoTarget, created);
        return created;
    }

    private static String resolveFeedSource(String url) {
        if (url.contains("ltn.com.tw"))   return "自由時報";
        if (url.contains("rsscna"))       return "中央社";
        if (url.contains("cna.com.tw"))   return "中央社";
        if (url.contains("ettoday"))      return "ETtoday";
        if (url.contains("pts.org.tw"))   return "公視新聞";
        if (url.contains("setn.com"))     return "三立新聞";
        if (url.contains("udn.com"))      return "聯合新聞網";
        if (url.contains("chinatimes"))   return "中時新聞網";
        if (url.contains("tvbs.com.tw"))  return "TVBS";
        if (url.contains("yahoo.com"))    return "Yahoo新聞";
        return "新聞";
    }

    private static String buildContent(String summary, String link, String source, String pubDate) {
        StringBuilder sb = new StringBuilder();
        if (!summary.isBlank()) sb.append(summary).append("\n\n");
        if (!link.isBlank())    sb.append("📰 閱讀全文：").append(link).append("\n");
        sb.append("來源：").append(source);
        if (!pubDate.isBlank()) sb.append("・").append(formatPubDate(pubDate));
        return sb.toString().trim();
    }

    private static String formatPubDate(String s) {
        if (s.isBlank()) return s;
        // 嘗試 RFC 1123（RSS）
        try {
            java.time.ZonedDateTime zdt = java.time.ZonedDateTime.parse(
                    s.trim(), java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME);
            return zdt.getMonthValue() + "/" + zdt.getDayOfMonth() + " " +
                    String.format("%02d:%02d", zdt.getHour(), zdt.getMinute());
        } catch (Exception ignored) {}
        // 嘗試 ISO 8601（Atom）
        try {
            java.time.ZonedDateTime zdt = java.time.ZonedDateTime.parse(s.trim());
            return zdt.getMonthValue() + "/" + zdt.getDayOfMonth() + " " +
                    String.format("%02d:%02d", zdt.getHour(), zdt.getMinute());
        } catch (Exception ignored) {}
        return s;
    }

    /** Atom <link href="..." rel="alternate"> 取 href 屬性 */
    private static String atomLink(Element entry) {
        NodeList links = entry.getElementsByTagName("link");
        for (int i = 0; i < links.getLength(); i++) {
            Element el = (Element) links.item(i);
            String rel  = el.getAttribute("rel");
            String href = el.getAttribute("href");
            if (!href.isBlank() && (rel.isBlank() || "alternate".equals(rel))) return href;
        }
        return "";
    }

    /** 從 RSS item 抽取第一張圖片 URL：<enclosure> → <media:content> → desc 中的 <img src> */
    private static String extractFirstImageUrl(Element item, String descHtml) {
        // 1. <enclosure url="..." type="image/...">
        NodeList enc = item.getElementsByTagName("enclosure");
        for (int i = 0; i < enc.getLength(); i++) {
            Element e = (Element) enc.item(i);
            String type = e.getAttribute("type");
            if (type.startsWith("image")) {
                String url = e.getAttribute("url");
                if (!url.isBlank()) return url;
            }
        }
        // 2. <media:content url="..."> or <media:thumbnail url="...">
        for (String tag : new String[]{"media:content", "media:thumbnail", "content", "thumbnail"}) {
            NodeList nl = item.getElementsByTagName(tag);
            if (nl.getLength() > 0) {
                String url = ((Element) nl.item(0)).getAttribute("url");
                if (!url.isBlank()) return url;
            }
        }
        // 3. <img src="..."> in description HTML
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("<img[^>]+src=[\"']([^\"']+)[\"']", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(descHtml);
        if (m.find()) return m.group(1);
        return null;
    }

    private static String text(Element parent, String tag) {
        NodeList nl = parent.getElementsByTagName(tag);
        if (nl.getLength() == 0) return "";
        return nl.item(0).getTextContent().trim();
    }
}
