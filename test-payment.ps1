$supabaseUrl = "https://enfkbhqiryqwqlcsjwnl.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZmtiaHFpcnlxd3FsY3Nqd25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NDkxMTQsImV4cCI6MjA4MTUyNTExNH0.nmczRhmoZ8DDu9_4CwT9NeRO3q9NtgXatTXRZQw6FmY"
$testEmail = "ryanasafedesouza@gmail.com"
$userId = "3dc8dd7d-fd9c-4edd-8cb6-85e3041a3e52"

# Simular webhook Cakto - Plano Trimestral
$orderId = "CAKTO-" + (Get-Date -Format "yyyyMMddHHmmss")

Write-Host "=== Simulando Pagamento Cakto ===" -ForegroundColor Cyan
Write-Host "Email: $testEmail"
Write-Host "User ID: $userId"
Write-Host "Order ID: $orderId"
Write-Host "Plano: Trimestral (90 creditos, 3 meses)"

$webhookBody = @{
    event = "purchase_approved"
    data = @{
        id = $orderId
        checkoutUrl = "https://pay.cakto.com.br/mabpy8g"
        refId = "mabpy8g"
        customer = @{
            email = $testEmail
            name = "Ryan Safe de Souza"
        }
        metadata = @{
            userId = $userId
            planId = "quarterly"
            email = $testEmail
        }
        paidAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        offer = @{
            id = "mabpy8g"
            name = "Trimestral"
        }
        amount = 8970
        currency = "BRL"
        status = "paid"
    }
} | ConvertTo-Json -Depth 5

$webhookHeaders = @{
    "Content-Type" = "application/json"
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "User-Agent" = "Cakto-Webhook/1.0"
}

Write-Host "`nEnviando webhook..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/cakto-webhook" -Method POST -Headers $webhookHeaders -Body $webhookBody -ErrorAction Stop
    Write-Host "Webhook processado com sucesso!" -ForegroundColor Green
    Write-Host "Resposta: $($response | ConvertTo-Json)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    Write-Host "Erro (Status $statusCode): $errorBody" -ForegroundColor Red
}

# Verificar assinatura
Write-Host "`n=== Verificando Assinatura ===" -ForegroundColor Cyan

$loginBody = @{ email = $testEmail; password = "admin@Safe8878" } | ConvertTo-Json
$loginHeaders = @{ "Content-Type" = "application/json"; "apikey" = $anonKey }
$loginResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Method POST -Headers $loginHeaders -Body $loginBody
$accessToken = $loginResponse.access_token

$queryHeaders = @{ "apikey" = $anonKey; "Authorization" = "Bearer $accessToken" }
try {
    $subs = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/subscriptions?user_id=eq.$userId&order=created_at.desc&limit=1" -Method GET -Headers $queryHeaders -ErrorAction Stop
    if ($subs -and $subs.Count -gt 0) {
        $sub = $subs[0]
        Write-Host "ASSINATURA ATIVA!" -ForegroundColor Green
        Write-Host "  Plano: $($sub.product_name) ($($sub.product_id))" -ForegroundColor White
        Write-Host "  Status: $($sub.status)" -ForegroundColor White
        Write-Host "  Creditos: $($sub.credits)" -ForegroundColor White
        Write-Host "  Order ID: $($sub.cakto_order_id)" -ForegroundColor White
        Write-Host "  Inicio: $($sub.current_period_start)" -ForegroundColor White
        Write-Host "  Validade: $($sub.current_period_end)" -ForegroundColor White
    } else {
        Write-Host "Nenhuma assinatura encontrada." -ForegroundColor Red
    }
} catch {
    Write-Host "Erro: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== Acesse o app para verificar! ===" -ForegroundColor Magenta
Write-Host "URL: http://localhost:5174/perfil"
