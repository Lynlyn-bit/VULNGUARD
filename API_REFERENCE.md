# API Quick Reference

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: (same as signup)
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Logout successful"
}
```

---

## Scan Endpoints

### List User Scans
```http
GET /scans?page=1&limit=10
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "scans": [
    {
      "id": "507f1f77bcf86cd799439011",
      "url": "https://example.com",
      "status": "completed",
      "duration": 45,
      "summary": {
        "total": 15,
        "critical": 2,
        "high": 5,
        "medium": 6,
        "low": 2
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1
}
```

### Create Scan
```http
POST /scans
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "url": "https://example.com",
  "vulnerabilities": [
    {
      "type": "SQL Injection",
      "severity": "critical",
      "description": "Database query injection point found",
      "recommendation": "Use parameterized queries",
      "location": "/api/users",
      "cvss": 9.8
    }
  ]
}

Response:
{
  "id": "507f1f77bcf86cd799439012",
  "url": "https://example.com",
  "status": "completed",
  "vulnerabilities": [...],
  "summary": {...},
  "createdAt": "2024-01-15T10:31:00Z"
}
```

### Get Scan Details
```http
GET /scans/:id
Authorization: Bearer <JWT_TOKEN>

Response: (full scan object with all vulnerabilities)
```

### Update Scan
```http
PUT /scans/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "status": "in-progress",
  "vulnerabilities": [...]
}

Response: (updated scan object)
```

### Delete Scan
```http
DELETE /scans/:id
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Scan deleted"
}
```

---

## User Endpoints

### Get User Profile
```http
GET /users/profile
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "organization": "ACME Inc",
  "role": "user"
}
```

### Update User Profile
```http
PUT /users/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "organization": "Tech Corp"
}

Response: (updated user object)
```

### Get User Settings
```http
GET /users/settings
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "userId": "507f1f77bcf86cd799439011",
  "notifications": {
    "email": true,
    "scanComplete": true,
    "vulnerabilityFound": true
  },
  "theme": "dark",
  "language": "en",
  "defaultScanInterval": 24
}
```

### Update User Settings
```http
PUT /users/settings
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "notifications": {
    "email": false,
    "scanComplete": true,
    "vulnerabilityFound": true
  },
  "theme": "light",
  "language": "en"
}

Response: (updated settings object)
```

---

## Schedule Endpoints

### List User Schedules
```http
GET /schedules
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "schedules": [
    {
      "id": "507f1f77bcf86cd799439013",
      "targetUrl": "https://example.com",
      "cronExpression": "0 0 * * *",
      "isActive": true,
      "description": "Daily vulnerability scan",
      "nextRun": "2024-01-16T00:00:00Z"
    }
  ]
}
```

### Create Schedule
```http
POST /schedules
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "targetUrl": "https://example.com",
  "cronExpression": "0 0 * * *",
  "description": "Daily vulnerability scan"
}

Response:
{
  "id": "507f1f77bcf86cd799439013",
  "targetUrl": "https://example.com",
  "cronExpression": "0 0 * * *",
  "isActive": true,
  "description": "Daily vulnerability scan",
  "createdAt": "2024-01-15T10:32:00Z"
}
```

### Update Schedule
```http
PUT /schedules/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "cronExpression": "0 12 * * *",
  "isActive": false
}

Response: (updated schedule)
```

### Delete Schedule
```http
DELETE /schedules/:id
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "message": "Schedule deleted"
}
```

---

## Admin Endpoints

### List All Users (Admin Only)
```http
GET /admin/users
Authorization: Bearer <ADMIN_JWT_TOKEN>

Response:
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "role": "user",
      "isActive": true
    }
  ],
  "total": 1
}
```

### List All Scans (Admin Only)
```http
GET /admin/scans
Authorization: Bearer <ADMIN_JWT_TOKEN>

Response:
{
  "scans": [
    {
      "id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "url": "https://example.com",
      "status": "completed",
      "summary": {...}
    }
  ],
  "total": 1
}
```

### Get System Stats (Admin Only)
```http
GET /admin/stats
Authorization: Bearer <ADMIN_JWT_TOKEN>

Response:
{
  "totalUsers": 5,
  "totalScans": 42,
  "criticalVulnerabilities": 3,
  "averageScanTime": 52,
  "activeSchedules": 8
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "error": "Invalid email format"
}
```

### 401 - Unauthorized
```json
{
  "error": "Unauthorized: JWT token expired or invalid"
}
```

### 403 - Forbidden
```json
{
  "error": "Forbidden: Admin access required"
}
```

### 404 - Not Found
```json
{
  "error": "Scan not found"
}
```

### 500 - Server Error
```json
{
  "error": "Internal server error"
}
```

---

## JWT Token Structure

Each JWT token contains:
```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    userId: "507f1f77bcf86cd799439011",
    email: "user@example.com",
    role: "user",
    iat: 1705318200,
    exp: 1705319100  // 15 minutes from issue
  },
  signature: "..."
}
```

---

## Cron Expression Examples

```
0 0 * * *           → Every day at midnight
0 12 * * *          → Every day at noon
0 0 * * 0           → Every Sunday at midnight
0 0 1 * *           → Every month on day 1
*/15 * * * *        → Every 15 minutes
0 9-17 * * 1-5      → Every hour 9-5 on weekdays
```

---

## Testing with cURL

### Login and get JWT
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get current user (replace TOKEN with actual JWT)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Create a scan
```bash
curl -X POST http://localhost:5000/api/scans \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "vulnerabilities":[
      {
        "type":"XSS",
        "severity":"high",
        "description":"Cross-site scripting found",
        "recommendation":"Sanitize inputs",
        "location":"/search",
        "cvss":7.5
      }
    ]
  }'
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding:
- 5 requests per second per IP
- 100 scans per day per user
- Auth endpoints: 10 attempts per 5 minutes

