# Quick Start Guide

## 🚀 Get Running in 30 Seconds

### 1. Start Backend (Terminal 1)
```bash
cd c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-api
npm run dev
```

Wait for:
```
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5000
```

### 2. Start Frontend (Terminal 2)
```bash
cd c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-web
npm run dev
```

Wait for:
```
➜  Local:   http://localhost:8080/
```

### 3. Open Browser
Visit: **http://localhost:8080**

---

## 🎯 Test the Full Workflow

### Step 1: Create Account
- Click "Create Account"
- Email: `test@example.com`
- Password: `Password123!`
- Click "Create Account"

### Step 2: Run a Scan
- Click "Start Scan"
- Enter URL: `https://example.com`
- Click "Scan"
- Watch progress bar (simulates 45-60 second scan)

### Step 3: View Results
- Click "Scan Results" in sidebar
- See your scan in the table
- Click on it to view detailed vulnerabilities

### Step 4: Update Settings
- Click "Settings" in sidebar
- Update name
- Toggle notifications
- Click "Save"

### Step 5: Logout
- Click avatar → "Logout"
- Login again with same credentials

---

## 📊 Check Your Data

### In MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Login with your account
3. Click "Cluster0"
4. Click "Collections"
5. Browse:
   - `users` → Your account
   - `scans` → Your scan data
   - `usersettings` → Your preferences

### Via API (Using VS Code REST Client or Postman)

**Get JWT Token:**
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!"
}
```

**List Your Scans:**
```http
GET http://localhost:5000/api/scans
Authorization: Bearer <TOKEN_FROM_ABOVE>
```

---

## ❌ Troubleshooting

### "Cannot connect to API"
```bash
# Check backend is running:
curl http://localhost:5000/api/health

# If error, restart:
# Terminal 1: Ctrl+C (stop backend)
cd c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-api
npm run dev
```

### "MongoDB connection failed"
- Check MongoDB URI in `.env`: `MONGODB_URI=mongodb+srv://katungwalinet_db_user:yzLs9JiPYuaAToky@cluster0.xswv4v5.mongodb.net/?appName=Cluster0`
- Check MongoDB Atlas IP whitelist allows your IP
- Check internet connection

### "Login fails but account exists"
- Check browser console (F12) for error message
- Check backend terminal for error logs
- Try clearing localStorage: F12 → Application → localStorage → Clear All

### "Scans not saving"
- Check backend console - look for MongoDB errors
- Verify you're logged in (JWT token in localStorage)
- Check network tab in browser for API errors

---

## 🔧 Useful Commands

### Backend
```bash
npm run dev          # Development with auto-reload
npm run build        # Compile TypeScript
node dist/index.js   # Run compiled code
npm test             # Run tests
npm run lint         # Check for errors
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Check for errors
npm test             # Run tests
```

---

## 📝 Important Files

### Backend
- `shield-sme-api/.env` → MongoDB URI, JWT secrets
- `shield-sme-api/src/index.ts` → Main server file
- `shield-sme-api/src/routes/` → API endpoints

### Frontend
- `shield-sme-web/.env` → API base URL
- `shield-sme-web/src/lib/api-client.ts` → API communication
- `shield-sme-web/src/contexts/AuthContext.tsx` → Authentication

---

## 🔐 Default Admin User

Email: `admin@vulnguard.com`
Password: `AdminPassword123!`

To create, manually insert in MongoDB:
```javascript
db.users.insertOne({
  email: "admin@vulnguard.com",
  password: "$2a$10$...", // bcrypt hash
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  isActive: true
})
```

---

## 📱 Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:8080 |
| Backend API | 5000 | http://localhost:5000 |
| Database | Cloud | MongoDB Atlas |

---

## ✅ Health Checks

Test each service is working:

```bash
# Frontend
curl http://localhost:8080

# Backend
curl http://localhost:5000/api/health

# MongoDB (from backend logs)
# Should see: ✅ MongoDB connected successfully
```

---

## 🎓 Architecture Quick Reference

```
User visits Frontend (React)
         ↓
 User clicks "Login"
         ↓
 Frontend calls POST /api/auth/login (axios)
         ↓
 Backend validates password in MongoDB
         ↓
 Backend returns JWT tokens
         ↓
 Frontend stores JWT in localStorage
         ↓
 Frontend makes API calls with Authorization header
         ↓
 Backend middleware verifies JWT
         ↓
 Backend returns data from MongoDB
         ↓
 Frontend displays data to user
```

---

## 📚 Documentation

- [Full Stack Guide](./FULL_STACK_GUIDE.md) - Complete architecture & setup
- [API Reference](./API_REFERENCE.md) - All endpoints with examples
- [README](./README.md) - Project info

---

## 🚀 Next Steps

1. ✅ Run the app (you're here!)
2. Test the full workflow (signup → scan → results)
3. Try the API endpoints with Postman/cURL
4. Check MongoDB Atlas dashboard
5. Add real vulnerability scanner (integrate OWASP ZAP)
6. Deploy backend to production
7. Add more features (notifications, scheduling, teams)

---

## 💡 Pro Tips

**During Development:**
- Use `npm run dev` in both directories for auto-reload
- Check browser console (F12) for frontend errors
- Check terminal for backend errors
- Use VS Code REST Client extension (`rest.http` files)
- Use MongoDB Atlas UI to browse data

**Performance:**
- Frontend builds in ~18s
- API responds in <100ms locally
- Scan simulation takes 45-60s

**Security in Production:**
- Use HTTPS only
- Use strong JWT secrets (32+ characters)
- Enable MongoDB IP whitelist
- Set up rate limiting
- Use environment variables for secrets
- Enable CORS only for your domain

---

## 🆘 Still Having Issues?

1. Check error messages in browser console (F12)
2. Check error messages in terminal
3. Verify MongoDB connection (check backend logs)
4. Restart both servers
5. Check .env files have correct values
6. Clear browser cache and localStorage
7. Try a fresh account (new email)

