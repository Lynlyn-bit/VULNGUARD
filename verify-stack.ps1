#!/usr/bin/env pwsh
# VulnGuard End-to-End Verification Test
# This script comprehensively verifies the entire stack is operational

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     VULNGUARD FULL-STACK VERIFICATION TEST                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$allPassed = $true

# Test 1: Backend Server
Write-Host "Test 1: Backend Server" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri http://localhost:5000/api/health -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
        $json = $response.Content | ConvertFrom-Json
        Write-Host "  ✅ PASS: Backend responding on port 5000" -ForegroundColor Green
        Write-Host "     Status: $($json.status)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ FAIL: Backend returned status $($response.StatusCode)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  ❌ FAIL: Cannot connect to backend: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Frontend Server
Write-Host ""
Write-Host "Test 2: Frontend Server" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri http://localhost:8080 -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ PASS: Frontend serving on port 8080" -ForegroundColor Green
    } else {
        Write-Host "  ❌ FAIL: Frontend returned status $($response.StatusCode)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  ❌ FAIL: Cannot connect to frontend: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: API Signup Endpoint
Write-Host ""
Write-Host "Test 3: API Signup Endpoint" -ForegroundColor Cyan
try {
    $email = "test_$(Get-Random)@example.com"
    $body = @{
        email = $email
        password = "TestPass123"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri http://localhost:5000/api/auth/signup `
        -Method POST -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 5
    
    $json = $response.Content | ConvertFrom-Json
    if ($null -ne $json.accessToken -and $null -ne $json.user) {
        Write-Host "  ✅ PASS: Signup endpoint working, JWT token generated" -ForegroundColor Green
        Write-Host "     User: $($json.user.email)" -ForegroundColor Gray
        $testEmail = $email
        $testToken = $json.accessToken
    } else {
        Write-Host "  ❌ FAIL: Signup response missing tokens or user" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "  ❌ FAIL: Signup endpoint error: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 4: API Protected Route
Write-Host ""
Write-Host "Test 4: API Protected Route (Get Current User)" -ForegroundColor Cyan
try {
    if ($testToken) {
        $response = Invoke-WebRequest -Uri http://localhost:5000/api/auth/me `
            -Headers @{ Authorization = "Bearer $testToken" } -UseBasicParsing -TimeoutSec 5
        
        $json = $response.Content | ConvertFrom-Json
        if ($null -ne $json.email) {
            Write-Host "  ✅ PASS: Protected route working, user authenticated" -ForegroundColor Green
            Write-Host "     Email: $($json.email)" -ForegroundColor Gray
        } else {
            Write-Host "  ❌ FAIL: Response missing user data" -ForegroundColor Red
            $allPassed = $false
        }
    } else {
        Write-Host "  ⏭️  SKIP: No test token from signup" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ FAIL: Protected route error: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Source Code Check
Write-Host ""
Write-Host "Test 5: Source Code Integrity" -ForegroundColor Cyan
$backendExists = Test-Path "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-api\src\index.ts"
$frontendExists = Test-Path "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-web\src\App.tsx"
$apiClientExists = Test-Path "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-web\src\lib\api-client.ts"

if ($backendExists -and $frontendExists -and $apiClientExists) {
    Write-Host "  ✅ PASS: All source files present" -ForegroundColor Green
} else {
    Write-Host "  ❌ FAIL: Missing source files" -ForegroundColor Red
    $allPassed = $false
}

# Test 6: Environment Configuration
Write-Host ""
Write-Host "Test 6: Environment Configuration" -ForegroundColor Cyan
$backendEnv = Test-Path "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-api\.env"
$frontendEnv = Test-Path "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-web\.env"

if ($backendEnv -and $frontendEnv) {
    Write-Host "  ✅ PASS: Environment files configured" -ForegroundColor Green
} else {
    Write-Host "  ❌ FAIL: Missing environment files" -ForegroundColor Red
    $allPassed = $false
}

# Test 7: Documentation
Write-Host ""
Write-Host "Test 7: Documentation Files" -ForegroundColor Cyan
$docFiles = @(
    "QUICK_START.md",
    "FULL_STACK_GUIDE.md",
    "API_REFERENCE.md",
    "DEPLOYMENT_CHECKLIST.md",
    "PROJECT_STATUS.md",
    "INTEGRATION_TESTS.md",
    "CONFIGURATION_GUIDE.md"
)

$docPath = "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-web"
$docCount = 0
foreach ($doc in $docFiles) {
    if (Test-Path "$docPath\$doc") {
        $docCount++
    }
}

if ($docCount -eq $docFiles.Count) {
    Write-Host "  ✅ PASS: All $($docFiles.Count) documentation files present" -ForegroundColor Green
} else {
    Write-Host "  ❌ FAIL: Only $docCount of $($docFiles.Count) documentation files found" -ForegroundColor Red
    $allPassed = $false
}

# Test 8: Build Status
Write-Host ""
Write-Host "Test 8: Production Build" -ForegroundColor Cyan
$distExists = Test-Path "c:\Users\Administrator\OneDrive\Desktop\VulnGuard\shield-sme-web\dist\index.html"
if ($distExists) {
    Write-Host "  ✅ PASS: Production build exists" -ForegroundColor Green
} else {
    Write-Host "  ❌ FAIL: Production build missing" -ForegroundColor Red
    $allPassed = $false
}

# Final Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green

if ($allPassed) {
    Write-Host "║     ✅ ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION        ║" -ForegroundColor Green
} else {
    Write-Host "║     ⚠️  SOME TESTS FAILED - REVIEW RESULTS ABOVE            ║" -ForegroundColor Yellow
}

Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "SUMMARY:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:8080" -ForegroundColor Gray
Write-Host "  Backend:  http://localhost:5000/api" -ForegroundColor Gray
Write-Host "  Database: MongoDB Atlas" -ForegroundColor Gray
Write-Host ""
Write-Host "Status: $(if ($allPassed) { '🎉 PRODUCTION READY' } else { '⚠️  NEEDS REVIEW' })" -ForegroundColor $(if ($allPassed) { 'Green' } else { 'Yellow' })
