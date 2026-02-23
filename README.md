# app — Spring Boot 3.x Skeleton

Java 17 · Spring Boot 3.2.x · MyBatis-Plus · MySQL 8 · Redis 7 · RabbitMQ 3

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
```

Wait for all services to be healthy:

```bash
docker compose ps          # check STATUS = healthy
```

Services exposed:

| Service      | URL / Port                            |
|--------------|---------------------------------------|
| MySQL        | `localhost:3306`  db=`appdb`          |
| Redis        | `localhost:6379`                      |
| RabbitMQ     | `localhost:5672`  (AMQP)             |
| RabbitMQ UI  | http://localhost:15672  guest/guest   |

---

## 2. Run the application (dev profile)

```bash
mvn spring-boot:run
```

- Swagger UI → http://localhost:8080/swagger-ui.html
- OpenAPI JSON → http://localhost:8080/v3/api-docs

---

## 3. Run tests

Unit / context-load tests use H2 in-memory — **no Docker required**.

```bash
mvn test
```

Integration tests (if any) require the Docker services to be up first.

---

## 4. Build fat JAR

```bash
mvn package -DskipTests
java -jar target/app-0.0.1-SNAPSHOT.jar
```

## 5. Production profile

```bash
java -jar target/app-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --DB_HOST=<host> \
  --DB_USERNAME=<user> \
  --DB_PASSWORD=<pass> \
  --REDIS_HOST=<host> \
  --REDIS_PASSWORD=<pass> \
  --RABBITMQ_HOST=<host> \
  --RABBITMQ_USERNAME=<user> \
  --RABBITMQ_PASSWORD=<pass>
```

---

## Project structure

```
src/
├── main/
│   ├── java/com/example/app/
│   │   ├── Application.java          # Entry point + @MapperScan
│   │   ├── config/                   # SecurityConfig, etc.
│   │   ├── controller/               # REST controllers
│   │   ├── service/                  # Service interfaces
│   │   │   └── impl/                 # Service implementations
│   │   ├── mapper/                   # MyBatis-Plus mappers
│   │   ├── entity/                   # JPA / MyBatis entities
│   │   ├── dto/                      # Request / Response DTOs
│   │   └── common/                   # Shared utilities, enums, constants
│   └── resources/
│       ├── application.yml           # Common + dev config
│       ├── application-prod.yml      # Production overrides
│       └── db/migration/             # Flyway SQL migrations
└── test/
    ├── java/com/example/app/
    │   └── ApplicationTests.java
    └── resources/
        └── application.yml           # H2 in-memory, no external services
```
