$ErrorActionPreference = 'Stop'
$d = Join-Path $PSScriptRoot '..\marketing\instagram' | Resolve-Path
$z = Join-Path $d 'zips'
Remove-Item $z -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $z | Out-Null
$tmp = Join-Path $z '_tmp'

$html = Get-Content (Join-Path $d 'index.html') -Raw -Encoding UTF8
$caps = [regex]::Matches($html, '<pre id="cap-(\d+)">([\s\S]*?)</pre>')
$files = Get-ChildItem $d -File | Where-Object { $_.Name -match '^\d\d-.+\.png$' } | Sort-Object Name
if ($files.Count -ne 12 -or $caps.Count -ne 12) { throw "Expected 12 posts and 12 captions, got $($files.Count) / $($caps.Count)" }

$all = Join-Path $tmp 'all'
New-Item -ItemType Directory $all -Force | Out-Null
foreach ($f in $files) {
  $i = [int]$f.Name.Substring(0, 2) - 1
  $base = $f.BaseName
  $one = Join-Path $tmp $base
  New-Item -ItemType Directory $one -Force | Out-Null
  Copy-Item $f.FullName $one
  $caption = [System.Net.WebUtility]::HtmlDecode($caps[$i].Groups[2].Value)
  [IO.File]::WriteAllText((Join-Path $one "$base-caption.txt"), $caption, [Text.UTF8Encoding]::new($false))
  Compress-Archive -Path (Join-Path $one '*') -DestinationPath (Join-Path $z "$base.zip") -Force
  Copy-Item (Join-Path $one '*') $all
}
Compress-Archive -Path (Join-Path $all '*') -DestinationPath (Join-Path $z 'wherediditgo-instagram-all-12.zip') -Force
Remove-Item $tmp -Recurse -Force
Get-ChildItem $z | Select-Object Name, @{ n = 'KB'; e = { [math]::Round($_.Length / 1KB) } } | Format-Table -AutoSize
