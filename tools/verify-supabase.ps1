$ErrorActionPreference = 'Stop'
$configText = Get-Content -LiteralPath "$PSScriptRoot/../public/config.js" -Raw
$projectUrl = [regex]::Match($configText, '["'']?supabaseUrl["'']?\s*:\s*["'']([^"'']+)["'']').Groups[1].Value
$publicKey = [regex]::Match($configText, '["'']?supabaseAnonKey["'']?\s*:\s*["'']([^"'']+)["'']').Groups[1].Value
if (-not $projectUrl -or -not $publicKey.StartsWith('sb_publishable_')) { throw 'Configuration publique Supabase attendue.' }
$headers = @{ apikey=$publicKey; Prefer='count=exact' }
foreach ($endpoint in @('products','public_reviews','product_ratings')) {
  $response = Invoke-WebRequest -Uri "$projectUrl/rest/v1/${endpoint}?select=*&limit=1" -Headers $headers -TimeoutSec 20
  Write-Output "$endpoint : HTTP $($response.StatusCode), plage $($response.Headers['Content-Range'])"
}
$settings = Invoke-RestMethod -Uri "$projectUrl/auth/v1/settings" -Headers @{ apikey=$publicKey } -TimeoutSec 20
Write-Output "Connexion Discord activée : $($settings.external.discord)"
