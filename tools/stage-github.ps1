$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$target = Join-Path $projectRoot '.publish/github'
if (Test-Path -LiteralPath $target) { throw 'Le dossier de publication existe déjà.' }
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($directory in @('public','tools','tests','supabase','data','.github')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $directory) -Destination $target -Recurse
}
foreach ($name in @('README.md','VERIFICATION.md','package.json','.gitignore')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $target
}
Write-Output $target
