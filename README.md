# neighborhood-app-backend

Java 17 · Spring Boot 3.2 · MyBatis-Plus · MySQL 8 · Redis 7 · RabbitMQ 3

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.8+ |
| Docker + Docker Compose | 24+ |

---

## 1. Start infrastructure

```bash
docker compose up -d
docker compose ps          # wait until STATUS = healthy
```

| Service | Port | Note |
|---------|------|------|
| MySQL | 3306 | db=`appdb` |
| Redis | 6379 | |
| RabbitMQ AMQP | 5672 | |
| RabbitMQ UI | 15672 | guest / guest |

---

## 2. Firebase service account (optional)

Social login (`POST /api/v1/auth/firebase`) requires a Firebase Admin SDK service account JSON.

```bash
export FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccount.json
```

Then uncomment the `app.firebase` block in `application.yml`:

```yaml
app:
  firebase:
    credentials-path: ${FIREBASE_CREDENTIALS_PATH}
```

If the environment variable is absent the Firebase bean is not created and the endpoint returns HTTP 500.

---

## 3. Run locally

```bash
mvn spring-boot:run
```

- Swagger UI → http://localhost:8080/swagger-ui.html
- OpenAPI JSON → http://localhost:8080/v3/api-docs

---

## 4. curl examples

> Replace `<token>` with the `accessToken` from a login response.
> Replace `<refresh>` with `refreshToken`.

### Neighborhood

```bash
# List (paginated, optional filters)
curl "http://localhost:8080/api/v1/neighborhoods?keyword=信義&cityCode=台北市&page=1&size=10"

# Detail by ID
curl "http://localhost:8080/api/v1/neighborhoods/1"

# Recommend nearest 5 by coordinate
curl "http://localhost:8080/api/v1/neighborhoods/recommend?lat=25.033&lng=121.565"
```

### Auth

```bash
# Guest login
curl -X POST http://localhost:8080/api/v1/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"neighborhoodId": 1, "deviceId": "dev-001"}'

# Firebase (social) login
curl -X POST http://localhost:8080/api/v1/auth/firebase \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<firebase-id-token>", "neighborhoodId": 1, "deviceId": "dev-001"}'

# Refresh token
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh>"}'

# Logout
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh>"}'
```

### Admin

```bash
# Import neighborhoods from CSV (requires ADMIN JWT)
curl -X POST http://localhost:8080/api/v1/admin/neighborhood/import \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@neighborhoods.csv"
```

CSV format (`city_code,district_code,li_code,name,full_name,lat,lng,status`):

```
台北市,信義區,A001,信義里,台北市信義區信義里,25.0330,121.5654,1
```

---

## 5. Run tests

No Docker needed — tests use H2 in-memory.

```bash
mvn test
```

---

## 6. Build

```bash
mvn package -DskipTests
java -jar target/app-0.0.1-SNAPSHOT.jar
```

---

## Redis key design

| Key pattern | TTL | Purpose |
|-------------|-----|---------|
| `neighborhood:detail:{id}` | 30 min | Single neighborhood cache |
| `neighborhood:list:{city}:{district}:{keyword}:{page}:{size}` | 20 min | List query cache |
| `auth:blacklist:jti:{jti}` | access token expiry | Revoked JWT blacklist |
| `rate:auth:ip:{ip}` | 60 s | Login rate limit per IP (max 10/min) |
| `rate:auth:device:{deviceId}` | 60 s | Login rate limit per device (max 10/min) |

Cache is invalidated (`SCAN` + `DEL`) after a successful CSV import.

---

## RabbitMQ events

Exchange: `xk.user.events` (topic, durable)
Queue: `xk.user.events.q` (durable)

| Routing key | Trigger |
|-------------|---------|
| `user.guest.created` | New guest login (first time) |
| `user.login` | Existing user (social) logs in |
| `user.registered` | New social account registered |

Payload fields: `eventType`, `userId`, `provider`, `isGuest`, `deviceId`, `ip`, `traceId`, `occurredAt`.
Events are published after DB transaction commit (`TransactionSynchronizationManager.afterCommit`).

---

## Project structure

```
src/main/java/com/example/app/
├── config/           # Security, Redis, RabbitMQ, RateLimiter, Firebase
├── controller/       # AuthController, NeighborhoodController, AdminNeighborhoodController
├── service/          # Interfaces + impl/
├── mapper/           # MyBatis-Plus mappers (+ resources/mapper/*.xml)
├── entity/           # Neighborhood, User, UserIdentity, AuthSession, UserLoginLog
├── dto/              # auth/, neighborhood/, admin/, firebase/
├── common/
│   ├── aspect/       # AuthRateLimitAspect
│   ├── filter/       # JwtAuthenticationFilter, TraceIdFilter
│   ├── interceptor/  # NeighborhoodInterceptor (X-NGB-ID)
│   ├── ratelimit/    # RateLimiter, RedisRateLimiter, NoOpRateLimiter
│   ├── exception/    # BusinessException, RateLimitException, GlobalExceptionHandler
│   ├── result/       # ApiResponse, ResultCode, PageResult
│   └── cache/        # CacheKeys
└── messaging/        # UserEventProducer, UserEventConsumer
```
