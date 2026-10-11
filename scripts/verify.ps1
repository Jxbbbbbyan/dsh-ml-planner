<#
.SYNOPSIS
    One-shot self-check for a dsh-ml-planner installation.

.DESCRIPTION
    Runs the three preset validators against an installed preset (or this repository's preset/
    directory) and prints each one's REAL exit code. The overall exit code is non-zero if any
    validator failed.

      1. validate_preset.py    structural check (skills, references, state helper, composition)
      2. selftest.mjs          Node self-test of the router modules and the review-subagent tool
      3. verify_integrity.py   manifest fingerprint + copy fidelity against the manifest

    verify_integrity.py runs in portable mode by default. The upstream base preset is not part of
    this repository, so its L1 level prints "SKIP (no upstream baseline)" and does NOT affect the
    exit code; a level that is merely not applicable is never reported as a pass. Pass
    -BasePreset <dir> to compare against a real upstream preset, and -Strict to make a missing
    baseline a hard failure.

    PYTHONIOENCODING / PYTHONUTF8 are forced to UTF-8 for the child interpreter. The manifest and
    the composition file carry CJK text and arrows such as U+21D2; on a GBK console a run would
    otherwise die with UnicodeEncodeError instead of reporting its real verdict.

.PARAMETER Preset
    Preset directory to check. Default: $env:USERPROFILE\.dsh\.agent-presets\ml-planner

.PARAMETER Python
    Python interpreter to use. Default: auto-detected (see the script body). On this kind of
    machine the "python" found on PATH is often a Microsoft Store stub, which is skipped on
    purpose; pass -Python explicitly if auto-detection cannot find a real interpreter.

.PARAMETER Node
    Node.js executable to use. Default: node on PATH.

.PARAMETER BasePreset
    Optional upstream preset directory (for example a router-planner install) used as the L1
    baseline for verify_integrity.py.

.PARAMETER Strict
    Make a missing upstream baseline a hard failure instead of a SKIP.

.EXAMPLE
    pwsh -File scripts/verify.ps1

.EXAMPLE
    pwsh -File scripts/verify.ps1 -Preset ./preset -Python /usr/bin/python3
#>
[CmdletBinding()]
param(
    [string] $Preset = (Join-Path $env:USERPROFILE '.dsh\.agent-presets\ml-planner'),
    [string] $Python = '',
    [string] $Node = '',
    [string] $BasePreset = '',
    [switch] $Strict
)

$ErrorActionPreference = 'Stop'

# The verifier prints CJK text and arrows; never let the child interpreter die on its console codec.
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'

function Test-PythonExe {
    param([string] $Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    # Skip the Microsoft Store shim: it is not an interpreter and running it pops the Store.
    if ($Path -match '\\WindowsApps\\') { return $false }
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    try {
        $out = & $Path -c 'print(7*6)' 2>$null
        return ($LASTEXITCODE -eq 0 -and (@($out) -contains '42'))
    }
    catch { return $false }
}

function Resolve-PythonExe {
    param([string] $Explicit)

    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        if (Test-PythonExe -Path $Explicit) { return $Explicit }
        if (Test-Path -LiteralPath $Explicit -PathType Leaf) { return $Explicit }  # let it fail loudly later
        throw "the -Python interpreter does not exist: $Explicit"
    }

    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($envName in @('ML_PLANNER_PYTHON', 'PYTHON')) {
        $value = [System.Environment]::GetEnvironmentVariable($envName)
        if (-not [string]::IsNullOrWhiteSpace($value)) { $candidates.Add($value) }
    }

    foreach ($name in @('python3', 'python')) {
        foreach ($cmd in @(Get-Command $name -All -ErrorAction SilentlyContinue)) {
            if ($cmd.Source -and $cmd.Source -notmatch '\\WindowsApps\\') { $candidates.Add($cmd.Source) }
        }
    }

    # An activated virtualenv names its own interpreter.
    foreach ($virtualEnv in @($env:VIRTUAL_ENV)) {
        if (-not [string]::IsNullOrWhiteSpace($virtualEnv)) {
            $candidates.Add((Join-Path $virtualEnv 'python.exe'))
            $candidates.Add((Join-Path $virtualEnv 'bin/python'))
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:CONDA_EXE)) {
        # <prefix>\Scripts\conda.exe (or ...\condabin\conda.bat) -> <prefix>\python.exe
        $condaRoot = Split-Path -Parent (Split-Path -Parent $env:CONDA_EXE)
        if (-not [string]::IsNullOrWhiteSpace($condaRoot)) {
            $candidates.Add((Join-Path $condaRoot 'python.exe'))
        }
    }

    # Conda / mamba style prefixes, derived from the environment and standard locations only.
    $prefixes = @(
        $env:CONDA_PREFIX,
        $env:MAMBA_ROOT_PREFIX,
        (Join-Path $env:USERPROFILE 'miniconda3'),
        (Join-Path $env:USERPROFILE 'anaconda3'),
        (Join-Path $env:USERPROFILE 'miniforge3'),
        (Join-Path $env:LOCALAPPDATA 'miniconda3'),
        (Join-Path $env:LOCALAPPDATA 'Continuum\anaconda3'),
        (Join-Path $env:ProgramData 'miniconda3'),
        (Join-Path $env:ProgramData 'anaconda3')
    )
    foreach ($prefix in $prefixes) {
        if (-not [string]::IsNullOrWhiteSpace($prefix)) {
            $candidates.Add((Join-Path $prefix 'python.exe'))
        }
    }

    foreach ($candidate in $candidates) {
        if (Test-PythonExe -Path $candidate) { return $candidate }
    }

    # The Windows py launcher can name a real interpreter for us.
    $launcher = Get-Command 'py' -ErrorAction SilentlyContinue
    if ($launcher) {
        try {
            $resolved = & $launcher.Source -3 -c 'import sys;print(sys.executable)' 2>$null
            foreach ($line in @($resolved)) {
                if (Test-PythonExe -Path ([string]$line)) { return [string]$line }
            }
        }
        catch { }
    }

    throw @'
no usable Python interpreter found (searched -Python, $env:ML_PLANNER_PYTHON, $env:PYTHON,
python3/python on PATH, conda prefixes and the py launcher).
Pass one explicitly, for example:
    pwsh -File scripts/verify.ps1 -Python "C:\path\to\python.exe"
'@
}

function Resolve-NodeExe {
    param([string] $Explicit)

    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        if (Test-Path -LiteralPath $Explicit -PathType Leaf) { return $Explicit }
        throw "the -Node executable does not exist: $Explicit"
    }
    $value = [System.Environment]::GetEnvironmentVariable('ML_PLANNER_NODE')
    if (-not [string]::IsNullOrWhiteSpace($value) -and (Test-Path -LiteralPath $value -PathType Leaf)) {
        return $value
    }
    foreach ($name in @('node', 'node.exe')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source) { return $cmd.Source }
    }
    throw @'
no Node.js executable found on PATH. Install Node.js (the preset's .mjs modules and its self-test
need it) or pass -Node "C:\path\to\node.exe".
'@
}

function Invoke-Validator {
    param(
        [string]   $Name,
        [string]   $Exe,
        [string[]] $Arguments,
        [string]   $WorkingDirectory
    )

    Write-Host ''
    Write-Host ('=' * 72)
    Write-Host "== $Name"
    Write-Host "   $Exe $($Arguments -join ' ')"
    Write-Host ('=' * 72)

    $code = -1
    $raw = @()
    Push-Location -LiteralPath $WorkingDirectory
    try {
        $raw = & $Exe @Arguments 2>&1
        $code = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    $lines = @($raw | ForEach-Object { [string]$_ })
    foreach ($line in $lines) { Write-Host "   $line" }
    Write-Host "   -> exit code: $code"

    return [pscustomobject]@{
        Name   = $Name
        Exit   = [int]$code
        Lines  = $lines
    }
}

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $Preset = [System.IO.Path]::GetFullPath($Preset)

    Write-Host 'dsh-ml-planner - self-check'
    Write-Host "  preset : $Preset"
    Write-Host "  repo   : $repoRoot"

    if (-not (Test-Path -LiteralPath $Preset -PathType Container)) {
        throw @"
preset directory not found: $Preset
Install it first:
    pwsh -File scripts/install.ps1
or point at a checkout:
    pwsh -File scripts/verify.ps1 -Preset "$repoRoot\preset"
"@
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Preset 'agent.cordis.yml') -PathType Leaf)) {
        throw "not a preset directory (agent.cordis.yml is missing): $Preset"
    }

    $pythonExe = Resolve-PythonExe -Explicit $Python
    $nodeExe = Resolve-NodeExe -Explicit $Node
    Write-Host "  python : $pythonExe"
    Write-Host "  node   : $nodeExe"

    $validator = Join-Path $Preset 'scripts\validate_preset.py'
    $selftest = Join-Path $Preset 'scripts\selftest.mjs'
    $integrity = Join-Path $Preset 'scripts\verify_integrity.py'
    foreach ($required in @($validator, $selftest, $integrity)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "missing validator in the preset: $required"
        }
    }

    $results = New-Object System.Collections.Generic.List[object]

    $r1 = Invoke-Validator -Name 'validate_preset.py' -Exe $pythonExe `
        -Arguments @($validator) -WorkingDirectory $Preset
    $results.Add($r1)

    $r2 = Invoke-Validator -Name 'selftest.mjs' -Exe $nodeExe `
        -Arguments @($selftest) -WorkingDirectory $Preset
    $results.Add($r2)

    $integrityArgs = @($integrity, '--preset', $Preset)
    if (-not [string]::IsNullOrWhiteSpace($BasePreset)) {
        $BasePreset = [System.IO.Path]::GetFullPath($BasePreset)
        $integrityArgs += @('--source', $BasePreset)
        if ($Strict) { $integrityArgs += '--strict' }
    }
    elseif ($Strict) {
        $integrityArgs += '--strict'
    }
    $r3 = Invoke-Validator -Name 'verify_integrity.py' -Exe $pythonExe `
        -Arguments $integrityArgs -WorkingDirectory $Preset
    $results.Add($r3)

    # ---- summary -----------------------------------------------------------
    $passCount = @($r2.Lines | Where-Object { $_ -match '^\s*PASS\s' }).Count
    $failCount = @($r2.Lines | Where-Object { $_ -match '^\s*FAIL\s' }).Count
    # Only the verifier's own summary line counts levels, not the section headings that mention SKIP.
    $skipCount = 0
    $skipSummary = @($r3.Lines | Where-Object { $_ -match '^SKIPPED \((\d+)\)' })
    if ($skipSummary.Count -gt 0) {
        $skipCount = [int]([regex]::Match($skipSummary[0], '^SKIPPED \((\d+)\)').Groups[1].Value)
    }

    Write-Host ''
    Write-Host ('=' * 72)
    Write-Host 'summary'
    Write-Host ('=' * 72)

    # The "portable mode" label must describe the verifier that is actually present in the target
    # preset, not the arguments we passed: a preset installed from an older source still ships the
    # pre-portable verify_integrity.py, which hard-codes an upstream baseline path.
    $legacyVerifier = -not (Select-String -LiteralPath $integrity -Pattern 'no upstream baseline' -Quiet)

    Write-Host ('{0,-24} {1,6}   {2}' -f 'validator', 'exit', 'result')
    foreach ($r in $results) {
        $verdict = if ($r.Exit -eq 0) { 'PASS' } else { 'FAIL' }
        $detail = ''
        if ($r.Name -eq 'selftest.mjs') { $detail = " ($passCount PASS / $failCount FAIL)" }
        if ($r.Name -eq 'verify_integrity.py') {
            $detail = if (-not [string]::IsNullOrWhiteSpace($BasePreset)) { ' (L1 baseline supplied)' }
                      elseif ($legacyVerifier) { ' (legacy verifier in this preset)' }
                      else { ' (portable mode, L1 not applicable)' }
        }
        Write-Host ('{0,-24} {1,6}   {2}{3}' -f $r.Name, $r.Exit, $verdict, $detail)
    }

    if ($legacyVerifier) {
        Write-Host ''
        Write-Host '  note: the verify_integrity.py in this preset is the legacy version. It hard-codes the'
        Write-Host '        upstream baseline path, so it fails whenever that upstream preset is missing or'
        Write-Host '        has moved on. Install the preset from this repository to get the portable'
        Write-Host '        verifier (which reports SKIP instead of failing when no baseline is shipped):'
        Write-Host '            pwsh -File scripts/install.ps1 -Force'
    }
    elseif ([string]::IsNullOrWhiteSpace($BasePreset)) {
        Write-Host ''
        Write-Host '  tip: the upstream preset is not part of this repository, so the L1 baseline'
        Write-Host '       comparison was skipped. If you also have the upstream preset installed:'
        Write-Host '           pwsh -File scripts/verify.ps1 -BasePreset "$env:USERPROFILE\.dsh\.agent-presets\router-planner"'
    }

    $failed = @($results | Where-Object { $_.Exit -ne 0 })
    Write-Host ''
    if ($failed.Count -gt 0) {
        Write-Host "OVERALL: FAIL ($($failed.Count) of $($results.Count) validator(s) returned a non-zero exit code)" -ForegroundColor Red
        exit 1
    }
    Write-Host "OVERALL: PASS ($($results.Count) validator(s), all exit codes 0; $skipCount SKIP line(s) reported by the integrity verifier)" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
