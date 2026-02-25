# API Reference

Base URL: `http://localhost:8080`
All responses: `{"code": int, "message": string, "data": T, "traceId": string}`

---

## Auth

### POST /api/v1/auth/guest
Guest login. Rate-limited: 10 req/min per IP and per deviceId.

**Body**
```json
{ "neighborhoodId": 1, "deviceId": "optional-string" }
```
**Response 200** → `AuthResponse { accessToken, refreshToken, expiresIn }`

---

### POST /api/v1/auth/firebase
Social login (Google / Apple / LINE). Requires Firebase Admin SDK configured.
Rate-limited: 10 req/min per IP and per deviceId.

**Body**
```json
{ "idToken": "...", "neighborhoodId": 1, "deviceId": "optional" }
```
**Response 200** → `AuthResponse`
**Response 400** — unknown provider or neighborhood inactive

---

### POST /api/v1/auth/refresh
**Body** `{ "refreshToken": "..." }`
**Response 200** → `AuthResponse`

---

### POST /api/v1/auth/logout
**Header** `Authorization: Bearer <accessToken>` (optional)
**Body** `{ "refreshToken": "..." }` (optional)
**Response 200** → `data: null`

---

## Neighborhood

All endpoints are public (no auth required).

### GET /api/v1/neighborhoods
| Param | Type | Default | Note |
|-------|------|---------|------|
| keyword | string | — | fuzzy match on name |
| cityCode | string | — | exact match |
| districtCode | string | — | exact match |
| page | int | 1 | min 1 |
| size | int | 20 | min 1, max 100 |

**Response 200** → `PageResult<NeighborhoodResponse>`
**Response 422** — page/size out of range

---

### GET /api/v1/neighborhoods/{id}
**Response 200, code=200** → `NeighborhoodResponse`
**Response 200, code=404** — not found

---

### GET /api/v1/neighborhoods/recommend
Returns the 5 nearest neighborhoods (status=1 with coordinates), sorted by distance.

| Param | Type | Constraint |
|-------|------|------------|
| lat | double | required, [-90, 90] |
| lng | double | required, [-180, 180] |

**Response 200** → `List<NeighborhoodRecommendResponse { id, fullName, distanceMeter }>`
**Response 422** — missing or out-of-range param

---

## Admin

Requires JWT with `ROLE_ADMIN`.

### POST /api/v1/admin/neighborhood/import
Bulk upsert neighborhoods from CSV (`ON DUPLICATE KEY UPDATE` on `li_code`).

**Request** `multipart/form-data`, field `file`

CSV headers: `city_code, district_code, li_code, name, full_name, lat, lng, status`

**Response 200** →
```json
{
  "successCount": 150,
  "failureCount": 2,
  "errors": [
    { "row": 3, "message": "li_code is required" }
  ]
}
```
**Response 400** — empty file
**Response 401** — missing token
**Response 403** — not ADMIN

---

## Error codes

| code | HTTP | Meaning |
|------|------|---------|
| 200 | 200 | Success |
| 400 | 200 | Bad request (body code) |
| 401 | 401 | Unauthenticated |
| 403 | 403 | Forbidden |
| 404 | 200 | Not found (body code) |
| 422 | 422 | Validation failed |
| 429 | 429 | Rate limit exceeded |
| 500 | 500 | Internal error |
