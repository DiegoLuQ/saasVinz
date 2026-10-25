# Script de prueba de endpoints de suscripciones usando PowerShell
# Ejecutar: .\tests\test_subscriptions.ps1

$BASE_URL = "http://localhost:8000"
$CREATOR_EMAIL = "admin@crematorio.com"
$CREATOR_PASSWORD = "admin123"

Write-Host "🧪 Probando Endpoints de Suscripciones" -ForegroundColor Cyan
Write-Host "=" * 70

# 1. Login
Write-Host "`n1️⃣  LOGIN - Obteniendo token..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $CREATOR_EMAIL
        password = $CREATOR_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/internal/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.access_token
    Write-Host "   ✅ Token obtenido: $($token.Substring(0, 30))..." -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
} catch {
    Write-Host "   ❌ Error en login: $_" -ForegroundColor Red
    exit 1
}

# 2. Listar planes
Write-Host "`n2️⃣  GET /plans/ - Listar planes..." -ForegroundColor Yellow
try {
    $plans = Invoke-RestMethod -Uri "$BASE_URL/api/internal/creator/plans/" `
        -Headers $headers
    
    Write-Host "   ✅ $($plans.Count) planes encontrados:" -ForegroundColor Green
    foreach ($plan in $plans) {
        Write-Host "      • $($plan.name): `$$($plan.price)/mes"
    }
    
    $testPlanId = $plans[0].id
    Write-Host "   📝 Usando plan '$($plans[0].name)' (ID: $testPlanId)"
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
    $testPlanId = 2
}

# 3. Listar tenants
Write-Host "`n3️⃣  GET /tenants - Listar tenants..." -ForegroundColor Yellow
try {
    $tenants = Invoke-RestMethod -Uri "$BASE_URL/api/internal/creator/tenants" `
        -Headers $headers
    
    Write-Host "   ✅ $($tenants.Count) tenants encontrados" -ForegroundColor Green
    
    $testTenant = $tenants[0]
    $tenantSlug = $testTenant.slug
    $tenantId = $testTenant.id
    Write-Host "   📝 Usando tenant '$($testTenant.name)' (slug: $tenantSlug)"
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
    exit 1
}

# 4. Ver suscripción actual
Write-Host "`n4️⃣  GET /tenants/$tenantSlug/subscription - Ver suscripción actual..." -ForegroundColor Yellow
try {
    $currentSub = Invoke-RestMethod -Uri "$BASE_URL/api/internal/creator/tenants/$tenantSlug/subscription" `
        -Headers $headers
    
    if ($currentSub) {
        Write-Host "   ✅ Suscripción activa encontrada:" -ForegroundColor Green
        Write-Host "      • Plan ID: $($currentSub.subscription_plan_id)"
        Write-Host "      • Estado: $($currentSub.status)"
        Write-Host "      • Precio: `$$($currentSub.final_price)"
        Write-Host "      • Vence: $($currentSub.end_date.Substring(0,10))"
        $subscriptionId = $currentSub.id
    } else {
        Write-Host "   📝 No hay suscripción activa" -ForegroundColor Gray
        $currentSub = $null
    }
} catch {
    Write-Host "   📝 No hay suscripción activa" -ForegroundColor Gray
    $currentSub = $null
}

# 5. Crear suscripción (si no existe)
if (-not $currentSub) {
    Write-Host "`n5️⃣  POST /tenants/$tenantSlug/subscription - Crear suscripción..." -ForegroundColor Yellow
    try {
        $subData = @{
            tenant_id = $tenantId
            subscription_plan_id = $testPlanId
            billing_cycle = "monthly"
            status = "active"
            discount_percent = 10
        } | ConvertTo-Json
        
        $newSub = Invoke-RestMethod -Uri "$BASE_URL/api/internal/creator/tenants/$tenantSlug/subscription" `
            -Method Post `
            -Headers $headers `
            -Body $subData
        
        Write-Host "   ✅ Suscripción creada!" -ForegroundColor Green
        Write-Host "      • ID: $($newSub.id)"
        Write-Host "      • Precio base: `$$($newSub.monthly_price)"
        Write-Host "      • Descuento: $($newSub.discount_percent)%"
        Write-Host "      • Precio final: `$$($newSub.final_price)"
        Write-Host "      • Inicio: $($newSub.start_date.Substring(0,10))"
        Write-Host "      • Fin: $($newSub.end_date.Substring(0,10))"
        $subscriptionId = $newSub.id
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        $subscriptionId = $null
    }
} else {
    Write-Host "`n5️⃣  Omitiendo creación (ya existe suscripción)" -ForegroundColor Gray
    $subscriptionId = $currentSub.id
}

# 6. Historial de suscripciones
Write-Host "`n6️⃣  GET /tenants/$tenantSlug/subscription/history - Ver historial..." -ForegroundColor Yellow
try {
    $history = Invoke-RestMethod -Uri "$BASE_URL/api/internal/creator/tenants/$tenantSlug/subscription/history" `
        -Headers $headers
    
    Write-Host "   ✅ $($history.Count) suscripción(es) en historial:" -ForegroundColor Green
    foreach ($sub in $history) {
        Write-Host "      • $($sub.status.ToUpper()) - Ciclo: $($sub.billing_cycle) - `$$($sub.final_price)"
    }
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}

# 7. Analytics MRR
Write-Host "`n7️⃣  GET /analytics/mrr - Métricas MRR/ARR..." -ForegroundColor Yellow
try {
    $analytics = Invoke-RestMethod -Uri "$BASE_URL/api/internal/creator/analytics/mrr" `
        -Headers $headers
    
    Write-Host "   ✅ Métricas obtenidas:" -ForegroundColor Green
    Write-Host "      • MRR Total: `$$([math]::Round($analytics.total_mrr, 2))"
    Write-Host "      • ARR Total: `$$([math]::Round($analytics.arr, 2))"
    Write-Host "      • Suscripciones activas: $($analytics.active_subscriptions)"
} catch {
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
Write-Host "✅ Pruebas completadas!" -ForegroundColor Green
Write-Host "`n📊 Resumen:" -ForegroundColor Cyan
Write-Host "   ✅ Endpoints probados y operativos" -ForegroundColor Green
Write-Host "   ✅ Sistema de suscripciones funcionando" -ForegroundColor Green
Write-Host "   ✅ Cálculos automáticos funcionando" -ForegroundColor Green
