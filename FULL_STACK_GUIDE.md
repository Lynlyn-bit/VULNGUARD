# VulnGuard: Full Stack Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (React + Vite)                                          │
│ http://localhost:8080                                           │
│                                                                  │
│ Components:                                                     │
│ - LoginPage / SignupPage (JWT auth)                            │
│ - Dashboard (fetch scans)                                      │
│ - ScanPage (create scan)                                       │
│ - ResultsPage / ScanDetail (view scans)                        │
│ - SettingsPage (user preferences)                              │
└─────────────────┬──────────────────────────────────────────────┘
                  │ axios + JWT Bearer Token
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ Express API (Node.js + TypeScript)                              │
│ http://localhost:5000/api                                       │
│                                                                  │
│ Endpoints:                                                      │
│ POST   /auth/signup           (create user account)            │
│ POST   /auth/login            (authenticate)                   │
│ POST   /auth/refresh          (refresh JWT)                    │
│ POST   /auth/logout           (logout user)                    │
│ GET    /auth/me               (current user)                   │
│                                                                 │
│ GET    /scans                 (list user scans)                │
│ POST   /scans                 (create scan)                    │
│ GET    /scans/:id             (fetch scan details)             │
│ PUT    /scans/:id             (update scan)                    │
│ DELETE /scans/:id             (delete scan)                    │
│                                                                 │
│ GET    /users/profile         (user profile)                   │
│ PUT    /users/profile         (update profile)                 │
│ GET    /users/settings        (user preferences)               │
│ PUT    /users/settings        (update preferences)             │
│                                                                 │
│ GET    /schedules             (list schedules)                 │
│ POST   /schedules             (create schedule)                │
│ PUT    /schedules/:id         (update schedule)                │
│ DELETE /schedules/:id         (delete schedule)                │
│                                                                 │
│ GET    /admin/users           (all users - admin only)         │
│ GET    /admin/scans           (all scans - admin only)         │
│ GET    /admin/stats           (system stats - admin only)      │
└─────────────────┬──────────────────────────────────────────────┘
                  │ Mongoose ODM
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ MongoDB Atlas                                                    │
│                                                                  │
│ Collections:                                                    │
│ - users          (email, passwordHash, firstName, lastName)    │
│ - scans          (userId, url, vulnerabilities, summary)       │
│ - usersettings   (userId, notifications, theme, language)      │
│ - scanschedules  (userId, targetUrl, cronExpression)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Running the Application

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (already set up)
- Two terminals open

### Terminal 1: Start Backend API

```bash
cd shield-sme-api
npm run dev
# OR
node dist/index.js
```

**Expected Output:**
```
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5000
📊 API Base: http://localhost:5000/api
```

### Terminal 2: Start Frontend Dev Server

```bash
cd shield-sme-web
npm run dev
```

**Expected Output:**
```
VITE v5.4.19 ready in 4497 ms

➜  Local:   http://localhost:8080/
```

### Access Application
- **Frontend**: http://localhost:8080/
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

---

## User Workflows

### 1. Create Account (Signup)

1. Navigate to http://localhost:8080/signup
2. Enter email and password (min 6 characters)
3. Click "Create Account"
4. API calls: `POST /api/auth/signup`
5. JWT tokens stored in localStorage
6. Redirects to Dashboard

**Behind the Scenes:**
- Backend hashes password with bcryptjs
- Creates user in MongoDB
- Returns JWT access token + refresh token
- Frontend stores tokens and sets auth state

### 2. Login

1. Navigate to http://localhost:8080/login
2. Enter email and password
3. Click "Sign In"
4. API calls: `POST /api/auth/login`
5. JWT tokens stored in localStorage
6. Redirects to Dashboard

### 3. Run a Vulnerability Scan

1. From Dashboard, click "Start Scan"
2. Enter website URL (e.g., example.com)
3. Click "Scan"
4. Simulation runs with progress stages
5. API calls: `POST /api/scans` with vulnerabilities
6. Scan saved to MongoDB
7. Redirect to Results page

**Behind the Scenes:**
- Frontend simulates scan (not real security testing)
- Generates mock vulnerabilities with severity levels
- POST to backend with URL + vulnerability data
- Backend saves to MongoDB with userId
- Returns scan ID and details

### 4. View Scan Results

1. Navigate to "Scan Results" in sidebar
2. See all past scans in a table
3. Click a row to view detailed report
4. API calls: `GET /api/scans` and `GET /api/scans/:id`

**Data Shown:**
- URL, scan date, total vulnerabilities
- Breakdown by severity (Critical, High, Medium, Low)
- Detailed list of each vulnerability with:
  - Type (SQL Injection, XSS, etc.)
  - Severity level
  - Location in code
  - Description and recommendations

### 5. Update User Settings

1. Navigate to "Settings" in sidebar
2. Update first/last name and click "Save Profile"
3. Toggle notification preferences
4. API calls: `PUT /api/users/profile` and `PUT /api/users/settings`

---

## Authentication Flow

### JWT Token Management

```
User logs in
    ↓
Backend validates credentials
    ↓
Backend generates JWT:
- Payload: { userId, email, role }
- Expires in 15 minutes
    ↓
Backend also generates Refresh Token:
- Expires in 7 days
    ↓
Frontend stores both in localStorage
    ↓
Frontend includes JWT in every API call:
Authorization: Bearer <jwt_token>
    ↓
API middleware verifies token
    ↓
If expired, frontend auto-refresh:
POST /auth/refresh with refreshToken
    ↓
Get new JWT automatically
    ↓
Retry failed request
```

### Key Security Features

✅ **Password Hashing**: bcryptjs with salt rounds  
✅ **JWT Signing**: HS256 algorithm with secret key  
✅ **Token Refresh**: Auto-refresh expired tokens  
✅ **Protected Routes**: AuthMiddleware on API endpoints  
✅ **CORS Configuration**: Whitelist frontend origin  
✅ **Environment Variables**: Secrets never in code  

---

## File Structure

### Backend (shield-sme-api/)

```
src/
├── index.ts                    # Express server setup
├── config/
│   └── database.ts            # MongoDB connection
├── middleware/
│   └── auth.ts                # JWT verification middleware
├── models/
│   ├── User.ts                # User schema + password hashing
│   ├── Scan.ts                # Scan + Vulnerability schemas
│   ├── UserSettings.ts        # User preferences schema
│   └── ScanSchedule.ts        # Scheduled scans schema
├── routes/
│   ├── auth.ts                # Sign up/in/out endpoints
│   ├── scans.ts               # Scan CRUD endpoints
│   ├── users.ts               # Profile & settings endpoints
│   ├── schedules.ts           # Schedule management endpoints
│   └── admin.ts               # Admin dashboard endpoints
└── utils/
    └── jwt.ts                 # Token generation & verification
.env                           # MongoDB URI, JWT secrets
package.json                   # Dependencies & scripts
tsconfig.json                  # TypeScript config
```

### Frontend (shield-sme-web/)

```
src/
├── lib/
│   ├── api-client.ts          # NEW: Axios wrapper for API
│   ├── scanner.ts             # Mock vulnerability generator
│   └── utils.ts               # Utility functions
├── contexts/
│   └── AuthContext.tsx        # UPDATED: JWT auth provider
├── pages/
│   ├── LoginPage.tsx          # UPDATED: JWT login form
│   ├── SignupPage.tsx         # UPDATED: JWT signup form
│   ├── Dashboard.tsx          # UPDATED: Fetch scans from API
│   ├── ScanPage.tsx           # UPDATED: Save scans to API
│   ├── ResultsPage.tsx        # UPDATED: List scans from API
│   ├── ScanDetail.tsx         # UPDATED: Fetch scan details
│   └── SettingsPage.tsx       # UPDATED: User settings form
├── components/
│   ├── AppLayout.tsx
│   ├── ProtectedRoute.tsx     # No changes needed
│   └── ui/                    # shadcn/ui components
.env                           # VITE_API_URL
package.json                   # Dependencies & scripts
vite.config.ts                 # Vite config
```

---

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: "user@example.com",      // unique
  password: "$2a$10$...",          // bcrypt hash
  firstName: "John",
  lastName: "Doe",
  organization: "ACME Inc",
  role: "user" | "admin",
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

### Scans Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,               // reference to User
  url: "https://example.com",
  status: "pending" | "in-progress" | "completed" | "failed",
  duration: 45,                   // seconds
  vulnerabilities: [
    {
      id: "vuln-1",
      type: "SQL Injection",
      severity: "critical",
      description: "...",
      recommendation: "...",
      location: "/api/users",
      cvss: 9.8
    }
  ],
  summary: {
    total: 15,
    critical: 3,
    high: 5,
    medium: 5,
    low: 2
  },
  createdAt: Date,
  updatedAt: Date
}
```

### UserSettings Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,               // unique reference to User
  notifications: {
    email: true,
    scanComplete: true,
    vulnerabilityFound: true
  },
  theme: "light" | "dark",
  language: "en",
  defaultScanInterval: 24,        // hours
  createdAt: Date,
  updatedAt: Date
}
```

### ScanSchedules Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,               // reference to User
  targetUrl: "https://example.com",
  cronExpression: "0 0 * * *",   // daily at midnight
  isActive: true,
  lastRun: Date,
  nextRun: Date,
  description: "Weekly scan",
  createdAt: Date,
  updatedAt: Date
}
```

---

## Environment Variables

### Backend (.env) - shield-sme-api/
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://katungwalinet_db_user:yzLs9JiPYuaAToky@cluster0.xswv4v5.mongodb.net/?appName=Cluster0
JWT_SECRET=your_super_secret_jwt_key_must_be_at_least_32_chars_long_vulnguard_2024
JWT_REFRESH_SECRET=your_super_secret_refresh_key_must_be_at_least_32_chars_long_vulnguard_refresh
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@vulnguard.com
```

### Frontend (.env) - shield-sme-web/
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Troubleshooting

### Frontend can't connect to backend
- Check if backend is running: `http://localhost:5000/api/health`
- Check VITE_API_URL in .env matches backend address
- Check browser console for CORS errors
- Verify CORS_ORIGIN in backend .env

### Login/Signup fails
- Check MongoDB connection: Look for "✅ MongoDB connected" in backend logs
- Check credentials are correct (email not already used)
- Look at browser Network tab for API errors
- Check backend console for validation errors

### Scans not saving
- Verify user is logged in (JWT token in localStorage)
- Check backend logs for MongoDB save errors
- Verify scan data is being sent correctly

### Tokens expiring too quickly
- JWT expires in 15 minutes (configurable in jwt.ts)
- Refresh token expires in 7 days
- Frontend automatically refreshes - watch Network tab

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production` on backend
- [ ] Use strong JWT secrets (32+ random characters)
- [ ] Configure MongoDB IP whitelist
- [ ] Setup reverse proxy (nginx/Apache) with SSL
- [ ] Enable HTTPS only
- [ ] Set CORS_ORIGIN to production frontend URL
- [ ] Use environment variables for all secrets
- [ ] Setup automated database backups
- [ ] Configure error logging & monitoring
- [ ] Setup rate limiting on auth endpoints
- [ ] Run security audit: `npm audit fix`

---

## Next Steps

1. **Test the full workflow** (signup → scan → view results)
2. **Add real vulnerability scanning** (integrate OWASP ZAP or Burp Suite API)
3. **Setup email notifications** (for scan completion, vulnerabilities)
4. **Add user organization/team management**
5. **Implement scan scheduling** (cron jobs for automated scans)
6. **Create admin dashboard** (user management, stats, reporting)
7. **Deploy to production** (choose hosting platform)

---

## Support

For issues or questions:
1. Check backend logs: `http://localhost:5000/api/health`
2. Check browser console (F12)
3. Check MongoDB Atlas dashboard for data
4. Review API response errors in Network tab

