package com.example.app.common.context;

/**
 * ThreadLocal holder for the current request's neighborhood ID.
 * Populated by {@link com.example.app.common.interceptor.NeighborhoodInterceptor}
 * when the request carries a valid {@code X-NGB-ID} header.
 */
public final class NeighborhoodContext {

    private static final ThreadLocal<Long> HOLDER = new ThreadLocal<>();

    private NeighborhoodContext() {}

    /** Returns the neighborhood ID bound to the current thread, or {@code null}. */
    public static Long getCurrentId() {
        return HOLDER.get();
    }

    public static void setCurrentId(Long id) {
        HOLDER.set(id);
    }

    public static void clear() {
        HOLDER.remove();
    }
}
