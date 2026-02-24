package com.example.app.common.interceptor;

import com.example.app.common.context.NeighborhoodContext;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.entity.Neighborhood;
import com.example.app.service.NeighborhoodQueryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Objects;

/**
 * Reads the {@code X-NGB-ID} header on every inbound request.
 * <ul>
 *   <li>Header absent or blank → skips validation, context remains {@code null}.</li>
 *   <li>Header present → validates that the neighborhood exists and is active (status=1).
 *       Sets {@link NeighborhoodContext} for the duration of the request.</li>
 *   <li>Header present but invalid → throws {@link BusinessException} (400).</li>
 * </ul>
 * Context is always cleared in {@code afterCompletion} to prevent ThreadLocal leaks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NeighborhoodInterceptor implements HandlerInterceptor {

    public static final String HEADER = "X-NGB-ID";

    private final NeighborhoodQueryService neighborhoodQueryService;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        String raw = request.getHeader(HEADER);
        if (!StringUtils.hasText(raw)) {
            return true;   // header absent — skip
        }

        long id;
        try {
            id = Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            throw new BusinessException(ResultCode.BAD_REQUEST,
                    "X-NGB-ID must be a numeric neighborhood ID");
        }

        Neighborhood nb = neighborhoodQueryService.getById(id);
        if (nb == null || !Objects.equals(nb.getStatus(), 1)) {
            throw new BusinessException(ResultCode.BAD_REQUEST,
                    "X-NGB-ID references a neighborhood that does not exist or is inactive");
        }

        NeighborhoodContext.setCurrentId(id);
        log.debug("NeighborhoodContext set to {}", id);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        NeighborhoodContext.clear();
    }
}
