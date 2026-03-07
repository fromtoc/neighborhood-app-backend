package com.example.app.common.filter;

import com.example.app.config.AdminProperties;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminTokenFilterTest {

    @Mock FilterChain chain;

    AdminProperties props = new AdminProperties();
    AdminTokenFilter filter;

    @BeforeEach
    void setUp() {
        filter = new AdminTokenFilter(props);
    }

    // ── shouldNotFilter ──────────────────────────────────────

    @Test
    void shouldNotFilter_nonAdminPath_returnsTrue() throws Exception {
        MockHttpServletRequest req = request("GET", "/api/v1/neighborhoods/cities");
        assertThat(filter.shouldNotFilter(req)).isTrue();
    }

    @Test
    void shouldNotFilter_adminPath_returnsFalse() throws Exception {
        MockHttpServletRequest req = request("POST", "/api/v1/admin/neighborhood/import");
        assertThat(filter.shouldNotFilter(req)).isFalse();
    }

    // ── dev mode（token 未設定）──────────────────────────────

    @Test
    void devMode_noTokenConfigured_allowsAllAdminRequests() throws Exception {
        props.setToken("");   // 未設定
        MockHttpServletRequest req  = request("POST", "/api/v1/admin/neighborhood/import");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        filter.doFilterInternal(req, resp, chain);

        verify(chain).doFilter(req, resp);
        assertThat(resp.getStatus()).isEqualTo(200); // filter 不攔截
    }

    // ── token 驗證正確 ────────────────────────────────────────

    @Test
    void correctToken_allowsRequest() throws Exception {
        props.setToken("secret-token");
        MockHttpServletRequest req  = request("POST", "/api/v1/admin/neighborhood/import");
        req.addHeader("X-Admin-Token", "secret-token");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        filter.doFilterInternal(req, resp, chain);

        verify(chain).doFilter(req, resp);
        assertThat(resp.getStatus()).isEqualTo(200);
    }

    // ── token 錯誤或缺失 ─────────────────────────────────────

    @Test
    void wrongToken_returns401() throws Exception {
        props.setToken("correct-token");
        MockHttpServletRequest req  = request("POST", "/api/v1/admin/neighborhood/import");
        req.addHeader("X-Admin-Token", "wrong-token");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        filter.doFilterInternal(req, resp, chain);

        verifyNoInteractions(chain);
        assertThat(resp.getStatus()).isEqualTo(401);
    }

    @Test
    void missingHeader_returns401() throws Exception {
        props.setToken("correct-token");
        MockHttpServletRequest req  = request("POST", "/api/v1/admin/neighborhood/import");
        // 未加 X-Admin-Token header
        MockHttpServletResponse resp = new MockHttpServletResponse();

        filter.doFilterInternal(req, resp, chain);

        verifyNoInteractions(chain);
        assertThat(resp.getStatus()).isEqualTo(401);
    }

    @Test
    void emptyHeader_returns401() throws Exception {
        props.setToken("correct-token");
        MockHttpServletRequest req  = request("POST", "/api/v1/admin/neighborhood/import");
        req.addHeader("X-Admin-Token", "");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        filter.doFilterInternal(req, resp, chain);

        verifyNoInteractions(chain);
        assertThat(resp.getStatus()).isEqualTo(401);
    }

    // ── timing-safe（長短不同的 token 同樣拒絕）──────────────

    @Test
    void tokenLengthMismatch_returns401() throws Exception {
        props.setToken("short");
        MockHttpServletRequest req  = request("POST", "/api/v1/admin/neighborhood/import");
        req.addHeader("X-Admin-Token", "a-much-longer-token-that-does-not-match");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        filter.doFilterInternal(req, resp, chain);

        verifyNoInteractions(chain);
        assertThat(resp.getStatus()).isEqualTo(401);
    }

    // ── helper ──────────────────────────────────────────────

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setMethod(method);
        req.setRequestURI(uri);
        return req;
    }
}
