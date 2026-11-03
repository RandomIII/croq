$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path "$PSScriptRoot/../research" | Out-Null
foreach ($brand in @('quick','mcdonalds','burgerking','kfc')) {
  $url = @{quick='https://www.quick.fr/produits';mcdonalds='https://www.mcdonalds.fr/nos-produits';burgerking='https://www.burgerking.fr/carte';kfc='https://www.kfc.fr/notre-carte'}[$brand]
  try {
    $html = (Invoke-WebRequest $url -TimeoutSec 20).Content
    Set-Content -LiteralPath "$PSScriptRoot/../research/$brand.html" -Value $html -Encoding utf8
    Write-Output "$brand : $($html.Length) caractères"
  } catch { Write-Output "$brand : source indisponible" }
}
