package com.example.app.common.cache;

public final class CacheKeys {

    private CacheKeys() {}

    public static String neighborhoodDetail(Long id) {
        return "neighborhood:detail:" + id;
    }

    public static String neighborhoodList(String city, String district, String keyword,
                                          int page, int size) {
        return String.format("neighborhood:list:%s:%s:%s:%d:%d",
                nvl(city), nvl(district), nvl(keyword), page, size);
    }

    public static String neighborhoodCities() {
        return "neighborhood:cities";
    }

    public static String neighborhoodDistricts(String city) {
        return "neighborhood:districts:" + city;
    }

    public static String jwtBlacklist(String jti) {
        return "auth:blacklist:jti:" + jti;
    }

    private static String nvl(String s) {
        return s != null ? s : "_";
    }
}
