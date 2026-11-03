$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archivePath = Join-Path $projectRoot '..\croq-github.zip'
if (Test-Path -LiteralPath $archivePath) { throw 'Une archive existe déjà. Choisis un autre nom avant de recommencer.' }
Add-Type -AssemblyName System.IO.Compression
$stream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
  $files = @()
  foreach ($directory in @('public','tools','tests','supabase','data','.github')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -File -Force
  }
  foreach ($name in @('README.md','VERIFICATION.md','package.json','.gitignore')) {
    $files += Get-Item -LiteralPath (Join-Path $projectRoot $name) -Force
  }
  foreach ($file in $files) {
    $entryName = [IO.Path]::GetRelativePath($projectRoot,$file.FullName).Replace('\','/')
    $entry = $archive.CreateEntry($entryName,[IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    try {
      if ($entryName -eq 'public/config.js') {
        # L'archive ne contient que la configuration vide, même après un test local.
        $bytes = [Text.Encoding]::UTF8.GetBytes("window.CROQ_CONFIG = {supabaseUrl:'',supabaseAnonKey:''};`n")
        $entryStream.Write($bytes,0,$bytes.Length)
      } else {
        $inputStream = [IO.File]::OpenRead($file.FullName)
        try { $inputStream.CopyTo($entryStream) } finally { $inputStream.Dispose() }
      }
    } finally { $entryStream.Dispose() }
  }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Output "Archive créée : $archivePath"
