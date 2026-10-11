<#
.SYNOPSIS
    Install the dsh-ml-planner preset into a DSH agent-presets directory.

.DESCRIPTION
    Copies preset/ from this repository into <Target>. The default target is the location DSH
    discovers automatically:

        $env:USERPROFILE\.dsh\.agent-presets\ml-planner

    An existing installation is NEVER overwritten by default: the script reports what is already
    there and exits 0 without writing anything. Pass -Force to replace it; the previous directory
    is first kept as a timestamped sibling (<Target>.bak-<UTC>) so a bad upgrade can be rolled back.

    Exit codes
      0  installed, or an existing installation was reported and left untouched
      1  error (preset source missing, nothing to copy, copy failed)

.PARAMETER Target
    Destination directory. Default: $env:USERPROFILE\.dsh\.agent-presets\ml-planner

.PARAMETER Source
    Directory to install from. Default: the preset/ directory of this repository.

.PARAMETER Force
    Replace an existing installation (a timestamped backup is kept first).

.EXAMPLE
    pwsh -File scripts/install.ps1

.EXAMPLE
    pwsh -File scripts/install.ps1 -Target "$env:TEMP\try\ml-planner" -Force
#>
[CmdletBinding()]
param(
    [string] $Target = (Join-Path $env:USERPROFILE '.dsh\.agent-presets\ml-planner'),
    [string] $Source = '',
    [switch] $Force
)

$ErrorActionPreference = 'Stop'

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($Source)) { $Source = Join-Path $repoRoot 'preset' }
    $Source = [System.IO.Path]::GetFullPath($Source)
    $Target = [System.IO.Path]::GetFullPath($Target)

    Write-Host 'dsh-ml-planner - preset installer'
    Write-Host "  source : $Source"
    Write-Host "  target : $Target"
    Write-Host ''

    if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
        throw "preset source directory not found: $Source"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Source 'agent.cordis.yml') -PathType Leaf)) {
        throw "not a preset directory (agent.cordis.yml is missing): $Source"
    }

    $sourceFiles = @(Get-ChildItem -LiteralPath $Source -Recurse -File)
    if ($sourceFiles.Count -eq 0) { throw "preset source is empty: $Source" }

    $targetExists = Test-Path -LiteralPath $Target -PathType Container
    $existingCount = 0
    if ($targetExists) {
        $existingCount = @(Get-ChildItem -LiteralPath $Target -Recurse -File -ErrorAction SilentlyContinue).Count
    }
    $installed = $targetExists -and ($existingCount -gt 0)

    if ($installed -and -not $Force) {
        Write-Host 'SKIP: an installation already exists - nothing was written.' -ForegroundColor Yellow
        Write-Host "  $existingCount file(s) at $Target"
        Write-Host ''
        Write-Host '  To replace it, re-run with -Force (the current directory is moved to a'
        Write-Host '  timestamped .bak-<UTC> sibling first):'
        Write-Host "      pwsh -File scripts/install.ps1 -Force"
        Write-Host ''
        Write-Host '  To check the existing installation instead:'
        Write-Host "      pwsh -File scripts/verify.ps1 -Preset `"$Target`""
        exit 0
    }

    if ($installed) {
        $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
        $backup = "$Target.bak-$stamp"
        $n = 1
        while (Test-Path -LiteralPath $backup) { $backup = "$Target.bak-$stamp-$n"; $n++ }
        Write-Host "backing up the existing installation -> $backup"
        Move-Item -LiteralPath $Target -Destination $backup
    }

    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    foreach ($file in $sourceFiles) {
        $relative = $file.FullName.Substring($Source.Length).TrimStart('\', '/')
        $destination = Join-Path $Target $relative
        $parent = Split-Path -Parent $destination
        if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    }

    $copied = @(Get-ChildItem -LiteralPath $Target -Recurse -File)
    if ($copied.Count -ne $sourceFiles.Count) {
        throw "copy mismatch: expected $($sourceFiles.Count) file(s), found $($copied.Count)"
    }

    Write-Host ''
    Write-Host "OK: installed $($copied.Count) file(s) into $Target" -ForegroundColor Green
    Write-Host ''
    Write-Host 'Next steps'
    Write-Host "  1. self-check this installation:"
    Write-Host "         pwsh -File scripts/verify.ps1 -Preset `"$Target`""
    Write-Host "  2. restart DSH and pick the preset in the session picker."
    Write-Host "     (.mjs files are loaded through Node's ESM cache, so an already-running"
    Write-Host "      host keeps the old module in memory until it is restarted.)"
    exit 0
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
