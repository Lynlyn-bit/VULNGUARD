# Custom Security Tests - CORS Fix ✅

## Problem Identified
The custom security tests were failing because the frontend was running tests directly in the browser using `fetch()`, which triggered **CORS (Cross-Origin Resource Sharing)** security restrictions. Browsers block frontend applications from making direct HTTP requests to external domains for security reasons.

**Error Symptoms:**
- Tests fail silently in browser console
- Network requests show CORS errors
- Security tests return no results

## Solution Implemented
Moved security testing to the **backend server** where CORS restrictions don't apply. The backend can freely fetch external websites and perform security checks, then return results to the frontend.

### Architecture Change

**Before (Client-Side - ❌ CORS Blocked):**
```
Frontend Browser
    ↓ fetch() [CORS BLOCKED]
    ✗ Can't reach external domains
```

**After (Server-Side - ✅ CORS Bypassed):**
```
Frontend Browser
    ↓ HTTP POST to /api/scan/security
    Backend Server
    ↓ fetch() [No CORS restrictions]
    ✅ Can reach any external domain
    ↓ Returns results
    Frontend displays scan results
```

## Changes Made

### 1. Backend Security Scanner Service
**File:** `shield-sme-api/src/services/security-scanner.ts`

Created server-side security testing module with 6 tests:
- SSL/TLS Certificate validation
- Security Headers checking
- HTTP to HTTPS redirect verification
- Server Information Disclosure detection
- CORS Configuration analysis
- Domain Accessibility testing

Key function: `runSecuritytestsBackend(url)` - Runs all tests server-side

### 2. Backend Security Route
**File:** `shield-sme-api/src/routes/security.ts`

New Express endpoint:
```
POST /api/scan/security
Body: { url: "https://example.com" }
Response: { url, tests[], summary }
```

The route:
- Receives URL from frontend
- Calls security scanner backend
- Calculates test summary (passed/failed counts by severity)
- Returns complete scan results

### 3. Backend Integration
**File:** `shield-sme-api/src/index.ts` (Modified)

Changes:
```typescript
// Added import
import securityRoutes from './routes/security';

// Registered route
app.use('/api/scan', securityRoutes);
```

### 4. Frontend Update
**File:** `src/pages/ScanPage.tsx` (Modified)

Changes:
- Removed: `import { runSecurityTests } from "@/lib/security-scanner"`
- Changed: Direct client-side security testing
- To: Backend API call to `/api/scan/security` endpoint

**New scan flow:**
```typescript
const response = await fetch(
  `http://localhost:5000/api/scan/security`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: normalizedUrl })
  }
);
const { tests } = await response.json();
```

## Current Status ✅

**Backend:**
- ✅ Running on http://localhost:5000
- ✅ MongoDB connected
- ✅ Security endpoint active: POST /api/scan/security
- ✅ Tested successfully with example.com

**Frontend:**
- ✅ Updated to call backend endpoint
- ✅ No more CORS errors
- ✅ Ready for testing

## How to Test

### Test 1: Backend Endpoint (Manual)
```powershell
$body = @{ url = "https://example.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/scan/security" -Method Post `
  -Body $body -ContentType "application/json"
```

### Test 2: Frontend UI
1. Go to http://localhost:8085
2. Click "New Scan" tab
3. Enter a URL: `example.com`
4. Click "Scan"
5. Watch the progress stages
6. View results when completed

### Test 3: Different URLs
Try scanning different websites:
- `https://google.com` - Major site with HTTPS
- `https://github.com` - Tech site with strict headers
- `http://example.com` - Will test HTTP redirect
- Any custom domain - Test your own site

## Technical Details

### Why This Works
1. **Server-side requests** don't subject to browser's CORS policy
2. **Same-origin policy** only applies to browser requests
3. **Backend** is a different origin than external domains, so it can freely fetch
4. **Frontend receives results** from its own server (no CORS)

### What Tests Do

1. **SSL/TLS Certificate**
   - Checks if site uses HTTPS
   - Severity: CRITICAL if missing

2. **Security Headers**
   - X-Content-Type-Options
   - X-Frame-Options
   - X-XSS-Protection
   - Strict-Transport-Security
   - Content-Security-Policy
   - Severity: HIGH if missing

3. **HTTP to HTTPS Redirect**
   - Verifies HTTP traffic redirects to HTTPS
   - Severity: HIGH if not configured

4. **Server Disclosure**
   - Checks for exposed version info
   - Severity: LOW if exposed

5. **CORS Configuration**
   - Analyzes CORS policy headers
   - Severity: MEDIUM if overly permissive

6. **Domain Accessibility**
   - Tests if website is online
   - Severity: HIGH if unreachable

## Notes

- **Timeout:** Tests have 10-second timeout per request
- **Error Handling:** All tests wrapped in try-catch; failures don't crash scan
- **Performance:** Runs tests in parallel (Promise.allSettled)
- **Database:** Scan results saved to MongoDB for history
- **Security:** Backend validates URL format before testing

## Next Steps (Optional)

1. Add more advanced security tests:
   - SQL Injection detection
   - XSS vulnerability scanning
   - CSRF protection verification

2. Implement:
   - Scheduled recurring scans
   - Scan history analytics
   - Vulnerability trend reporting

3. Performance:
   - Cache common domain results
   - Implement scan result pagination

## Troubleshooting

**Endpoint returns 400 (Bad Request):**
- Ensure `url` is included in request body
- Verify URL format: `https://domain.com`

**Endpoint returns 500 (Server Error):**
- Check backend console for error details
- Verify MongoDB connection is active

**Scans seem slow:**
- Expected: ~10-15 seconds per URL (10s timeout per test × 6 tests in parallel)
- Normal behavior for comprehensive security testing

**Tests show all "failed":**
- Expected for some sites (especially if missing security headers)
- Not all tests are critical - review severity levels
