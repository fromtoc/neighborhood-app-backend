# 巷口 GoLocal — 後端 API 對接文件

**Base URL** `https://api.room18.top`
**Content-Type** `application/json`

---

## 通用格式

### 請求 Header

| Header | 說明 |
|--------|------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <accessToken>`（需登入的 API 才帶） |

### 統一回應結構

```json
{
  "code": 200,
  "message": "OK",
  "data": {},
  "traceId": "a1b2c3d4"
}
```

| `code` | 說明 |
|--------|------|
| `200` | 成功 |
| `400` | 請求參數錯誤 |
| `401` | 未登入 / Token 無效 |
| `404` | 資源不存在 |
| `422` | 參數格式驗證失敗 |
| `429` | 請求過於頻繁 |
| `500` | 伺服器錯誤 |
| `503` | 功能未啟用 |

> ⚠️ HTTP status code 可能為 200，但 body 內的 `code` 代表實際業務結果，前端應以 `code` 判斷。

---

## 一、選擇里流程

### 1.1 取得縣市清單

```
GET /api/v1/neighborhoods/cities
```

**Request**：無參數

**Response**
```json
{
  "code": 200,
  "data": ["台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市", "..."]
}
```

---

### 1.2 取得行政區清單

```
GET /api/v1/neighborhoods/districts?city=桃園市
```

**Query Params**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `city` | String | ✅ | 縣市名稱（從 1.1 取得） |

**Response**
```json
{
  "code": 200,
  "data": ["中壢區", "桃園區", "龜山區", "八德區", "..."]
}
```

---

### 1.3 搜尋里列表

```
GET /api/v1/neighborhoods
```

**Query Params**

| 參數 | 型別 | 必填 | 說明 | 預設 |
|------|------|------|------|------|
| `city` | String | ✗ | 縣市（完整比對） | — |
| `district` | String | ✗ | 行政區（完整比對） | — |
| `keyword` | String | ✗ | 里名稱模糊搜尋 | — |
| `page` | Int | ✗ | 頁碼，從 1 開始 | `1` |
| `size` | Int | ✗ | 每頁筆數，最大 100 | `20` |

**Response**
```json
{
  "code": 200,
  "data": {
    "total": 42,
    "records": [
      {
        "id": 1234,
        "liCode": "68000010001",
        "name": "樂善里",
        "district": "龜山區",
        "city": "桃園市",
        "status": 1
      }
    ]
  }
}
```

**範例呼叫**
```
GET /api/v1/neighborhoods?city=桃園市&district=龜山區&page=1&size=20
GET /api/v1/neighborhoods?keyword=樂善&page=1&size=20
```

---

### 1.4 門牌地址查詢所在里

```
GET /api/v1/neighborhoods/locate?address=桃園市龜山區文古路138號
```

**Query Params**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `address` | String | ✅ | 完整門牌地址，最長 200 字元 |

**Response（成功）**
```json
{
  "code": 200,
  "data": {
    "id": 1234,
    "liCode": "68000010001",
    "name": "樂善里",
    "district": "龜山區",
    "city": "桃園市",
    "lat": 25.0356000,
    "lng": 121.3967000,
    "status": 1
  }
}
```

> `lat` / `lng` 為地址對應的實際座標（由 Geocoding API 取得）。

**錯誤情境**

| `code` | 原因 |
|--------|------|
| `404` | 地址查無座標，或座標不在任何里範圍內 |
| `503` | 伺服器尚未設定 Geocoding API Key |

---

### 1.5 GPS 定位所在里

```
GET /api/v1/neighborhoods/locate?lat=25.0356&lng=121.3967
```

**Query Params**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `lat` | Double | ✅* | 緯度 \[-90, 90\] |
| `lng` | Double | ✅* | 經度 \[-180, 180\] |

> *`lat`/`lng` 二擇一必填，兩者皆傳時優先使用 GPS。

**Response（成功）**
```json
{
  "code": 200,
  "data": {
    "id": 1234,
    "liCode": "68000010001",
    "name": "樂善里",
    "district": "龜山區",
    "city": "桃園市",
    "lat": 25.0356000,
    "lng": 121.3967000,
    "status": 1
  }
}
```

**Response（找不到所在里）**
```json
{ "code": 404, "message": "Neighborhood not found" }
```

---

### 1.6 依 GPS 推薦最近的里

```
GET /api/v1/neighborhoods/recommend?lat=25.0356&lng=121.3967
```

**Query Params**

| 參數 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `lat` | Double | ✅ | 緯度 \[-90, 90\] |
| `lng` | Double | ✅ | 經度 \[-180, 180\] |

**Response**（最多 5 筆，依距離升冪排序）
```json
{
  "code": 200,
  "data": [
    { "id": 1234, "fullName": "桃園市龜山區樂善里", "distanceMeter": 83 },
    { "id": 1235, "fullName": "桃園市龜山區文青里", "distanceMeter": 412 }
  ]
}
```

---

## 二、登入流程

> **所有登入 API 都必須帶入 `neighborhoodId`**（使用者在選里步驟選擇的里的 `id`）。

---

### 2.1 Google / Apple / Facebook 登入

前端使用 Firebase SDK 完成 OAuth 驗證，取得 Firebase ID Token 後呼叫：

```
POST /api/v1/auth/firebase
```

**Request Body**
```json
{
  "idToken": "<Firebase ID Token>",
  "neighborhoodId": 1234,
  "deviceId": "optional-device-id"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `idToken` | String | ✅ | Firebase 取得的 ID Token |
| `neighborhoodId` | Long | ✅ | 使用者選擇的里 ID |
| `deviceId` | String | ✗ | 裝置識別碼（用於限流） |

---

### 2.2 LINE 登入（兩步驟）

**Step 1** — 前端完成 LINE OAuth PKCE 流程，取得 `code` 後呼叫：

```
POST /api/v1/auth/line/custom-token
```

**Request Body**
```json
{
  "code": "<LINE authorization code>",
  "redirectUri": "https://your-app/line-callback",
  "codeVerifier": "<PKCE code_verifier>",
  "deviceId": "optional-device-id"
}
```

**Response**
```json
{
  "code": 200,
  "data": { "customToken": "<Firebase Custom Token>" }
}
```

**Step 2** — 前端用 `customToken` 呼叫 Firebase SDK `signInWithCustomToken(customToken)`，取得 Firebase ID Token 後呼叫 `POST /api/v1/auth/firebase`（同 2.1）。

---

### 2.3 手機號碼登入

前端使用 Firebase Phone Auth SDK 發送 OTP 並完成驗證，取得 Firebase ID Token 後呼叫：

```
POST /api/v1/auth/firebase
```

（格式與 2.1 完全相同，Firebase 會在 token 中自動標記 `provider = phone`）

---

### 2.4 訪客登入（暫不登入）

```
POST /api/v1/auth/guest
```

**Request Body**
```json
{
  "neighborhoodId": 1234,
  "deviceId": "optional-device-id"
}
```

---

### 登入成功 — 統一回應格式

以上所有登入 API 成功後均回傳：

```json
{
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "accessExpiresIn": 900,
    "user": {
      "id": 99,
      "isGuest": false,
      "defaultNeighborhoodId": 1234
    }
  }
}
```

| 欄位 | 說明 |
|------|------|
| `accessToken` | 存取 Token，有效期 **15 分鐘** |
| `refreshToken` | 更新 Token，有效期 **30 天** |
| `accessExpiresIn` | Access Token 剩餘秒數（`900` = 15 min） |
| `user.id` | 使用者 ID |
| `user.isGuest` | 是否為訪客 |
| `user.defaultNeighborhoodId` | 所在里 ID |

---

## 三、Token 管理

### 3.1 更新 Access Token

```
POST /api/v1/auth/refresh
```

**Request Body**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response** — 同登入成功格式

> 建議在 `accessToken` 過期前，或收到 `code: 401` 時呼叫。

---

### 3.2 登出

```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

**Request Body**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response**
```json
{ "code": 200, "data": null }
```

---

## 四、建議的前端流程

```
啟動 App
  ↓
取得縣市清單 GET /api/v1/neighborhoods/cities
  ↓
使用者選縣市 → 取得行政區 GET /api/v1/neighborhoods/districts?city=xxx
  ↓
使用者選行政區 → 搜尋里列表 GET /api/v1/neighborhoods?city=&district=
  （或）輸入地址    GET /api/v1/neighborhoods/locate?address=xxx
  （或）GPS 定位    GET /api/v1/neighborhoods/locate?lat=&lng=
  （或）推薦最近    GET /api/v1/neighborhoods/recommend?lat=&lng=
  ↓
使用者確認所在里（記下 neighborhoodId）
  ↓
選擇登入方式
  ├─ LINE     → POST /auth/line/custom-token
  │              → Firebase signInWithCustomToken
  │              → POST /auth/firebase
  ├─ Google   → Firebase signInWithGoogle   → POST /auth/firebase
  ├─ Apple    → Firebase signInWithApple    → POST /auth/firebase
  ├─ Facebook → Firebase signInWithFacebook → POST /auth/firebase
  ├─ 手機     → Firebase Phone Auth OTP     → POST /auth/firebase
  └─ 訪客    → POST /auth/guest
  ↓
儲存 accessToken + refreshToken
  ↓
進入主頁
```

---

## 五、登入後 API 呼叫

所有需要登入的 API 都在 Header 帶上 Access Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**Access Token 過期處理流程：**

1. API 回傳 `code: 401`
2. 呼叫 `POST /api/v1/auth/refresh` 換新 token
3. 更新本地儲存的 token
4. 重試原本的請求
5. 若 refresh 也失敗（`code: 401`）→ 導向登入頁

---

## 六、速率限制

登入相關 API（`/auth/guest`、`/auth/firebase`）有速率限制：

- 同一 IP：**10 次 / 60 秒**
- 同一 deviceId：**10 次 / 60 秒**

超過限制回傳：
```json
{ "code": 429, "message": "Too Many Requests" }
```

建議前端在收到 429 時顯示提示並禁止重試一段時間。
