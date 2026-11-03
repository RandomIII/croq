$ErrorActionPreference = 'Stop'
foreach ($category in @('enCeMoment','finger-food','frites','desserts','boissons-froides','salades')) {
  try {
    $html = (Invoke-WebRequest "https://www.quick.fr/produits/$category" -TimeoutSec 20).Content
    Set-Content -LiteralPath "$PSScriptRoot/../research/quick-$category.html" -Value $html -Encoding utf8
    Write-Output "$category : $($html.Length) caractères"
  } catch { Write-Output "$category : source indisponible" }
}
