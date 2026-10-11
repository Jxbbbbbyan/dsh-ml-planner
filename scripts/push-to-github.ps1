<#
.SYNOPSIS
    Create the dsh-ml-planner repository on GitHub (optionally) and push this checkout to it.

.DESCRIPTION
    Target remote: https://github.com/<Owner>/<RepoName>  (defaults: Jxbbbbbyan/dsh-ml-planner)

    The script prefers a plain `git push`. On Windows, Git Credential Manager already holds a
    credential for https://github.com, so a push usually succeeds with no token at all. A token is
    only needed for the one step that git cannot do:

        * creating the remote repository through the GitHub REST API
        * setting the repository topics

    Therefore:

      * with $env:GH_TOKEN / $env:GITHUB_TOKEN / -Token
            GET  /user                     resolve the login
            POST /user/repos               create the repository if it is missing
            git push                       push the branch and all tags
            PUT  /repos/.../topics         set the topics
      * without a token
            git remote add/set-url origin  (plain HTTPS URL, no secret is ever stored in .git/config)
            git push                       credentials come from Git Credential Manager
            on failure: print the one-click "create repository" URL plus the exact command to
            re-run, instead of giving up

    The token is never written to disk, never stored in the git remote and never echoed. When a
    token is used for the push it is passed to git through a one-shot GIT_CONFIG_* environment
    header rather than the command line.

    Exit codes
      0  pushed successfully, or the guidance branch completed
      1  refusal (not a git repository, no commits) or a failed git push
      2  usage / missing prerequisite

.PARAMETER RepoRoot
    Repository to publish. Default: the repository that contains this script.

.PARAMETER Owner
    GitHub account or organization. Default: Jxbbbbbyan

.PARAMETER RepoName
    Repository name. Default: dsh-ml-planner

.PARAMETER Token
    GitHub token with "repo" scope. Default: $env:GH_TOKEN, then $env:GITHUB_TOKEN.

.PARAMETER Branch
    Remote branch to publish. Default: main

.PARAMETER Private
    Create the repository as private (default: public).

.PARAMETER SkipTopics
    Do not attempt to set the topics.

.PARAMETER SkipPush
    Only create/inspect the remote repository and print the plan; never run git push.

.EXAMPLE
    pwsh -File scripts/push-to-github.ps1
.EXAMPLE
    $env:GH_TOKEN = 'ghp_...' ; pwsh -File scripts/push-to-github.ps1
#>
[CmdletBinding()]
param(
    [string]   $RepoRoot = '',
    [string]   $Owner = 'Jxbbbbbyan',
    [string]   $RepoName = 'dsh-ml-planner',
    [string]   $Token = '',
    [string]   $Branch = 'main',
    [string]   $RemoteName = 'origin',
    [string]   $Description = 'Force an agent to write an ML contract before it writes a single line of training code. A DSH agent preset: ML planning skills, 94 machine-checkable discipline rules, and an anti-hallucination research workflow.',
    [string[]] $Topics = @(
        'dsh', 'llm-agent', 'ai-agent', 'agent-skills', 'machine-learning', 'mlops', 'planning',
        'prompt-engineering', 'data-leakage', 'reproducible-research', 'python', 'pytorch', 'scikit-learn'
    ),
    [switch]   $Private,
    [switch]   $SkipTopics,
    [switch]   $SkipPush
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([string[]] $Arguments, [string] $WorkingDirectory)
    $raw = & git -C $WorkingDirectory @Arguments 2>&1
    $code = $LASTEXITCODE
    return [pscustomobject]@{
        Exit   = [int]$code
        Output = @($raw | ForEach-Object { [string]$_ })
        Text   = (@($raw | ForEach-Object { [string]$_ }) -join "`n").Trim()
    }
}

function Invoke-GitHubApi {
    param(
        [string]   $Method,
        [string]   $Uri,
        [hashtable]$Headers,
        [string]   $BodyJson = ''
    )
    try {
        if ([string]::IsNullOrWhiteSpace($BodyJson)) {
            $response = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
        }
        else {
            $response = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers `
                -Body $BodyJson -ContentType 'application/json'
        }
        return [pscustomobject]@{ Ok = $true; Status = 200; Data = $response; Message = '' }
    }
    catch {
        $status = 0
        try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = 0 }
        return [pscustomobject]@{ Ok = $false; Status = $status; Data = $null; Message = $_.Exception.Message }
    }
}

try {
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        $RepoRoot = Split-Path -Parent $PSScriptRoot
    }
    $RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)

    $remoteUrl = "https://github.com/$Owner/$RepoName"
    $cloneUrl = "$remoteUrl.git"

    Write-Host 'dsh-ml-planner - publish to GitHub'
    Write-Host "  repository : $RepoRoot"
    Write-Host "  remote     : $cloneUrl"
    Write-Host ''

    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) {
        throw "not a git repository (no .git directory): $RepoRoot`nRun 'git init -b $Branch' and commit first."
    }

    $head = Invoke-Git -Arguments @('rev-parse', '--abbrev-ref', 'HEAD') -WorkingDirectory $RepoRoot
    if ($head.Exit -ne 0) { throw "cannot read HEAD: $($head.Text)" }
    $currentBranch = $head.Text

    $countResult = Invoke-Git -Arguments @('rev-list', '--count', 'HEAD') -WorkingDirectory $RepoRoot
    if ($countResult.Exit -ne 0 -or [int]$countResult.Text -lt 1) {
        throw "the repository has no commits yet - commit before publishing."
    }
    Write-Host "  branch     : $currentBranch (local) -> $Branch (remote), $($countResult.Text) commit(s)"

    $status = Invoke-Git -Arguments @('status', '--porcelain') -WorkingDirectory $RepoRoot
    if ($status.Exit -eq 0 -and -not [string]::IsNullOrWhiteSpace($status.Text)) {
        Write-Warning 'the working tree has uncommitted changes; they will NOT be published.'
    }

    $tags = Invoke-Git -Arguments @('tag', '--list') -WorkingDirectory $RepoRoot
    if ($tags.Exit -eq 0 -and -not [string]::IsNullOrWhiteSpace($tags.Text)) {
        Write-Host "  tags       : $(($tags.Text -split "`n") -join ', ')"
    }
    else {
        Write-Host '  tags       : (none - see CHANGELOG.md; tag with: git tag -a v0.1.0 -m "v0.1.0")'
    }
    Write-Host ''

    # ---- token -------------------------------------------------------------
    if ([string]::IsNullOrWhiteSpace($Token)) { $Token = [string]$env:GH_TOKEN }
    if ([string]::IsNullOrWhiteSpace($Token)) { $Token = [string]$env:GITHUB_TOKEN }
    $hasToken = -not [string]::IsNullOrWhiteSpace($Token)

    if ($hasToken) {
        Write-Host 'auth: token found (value is never printed or stored).'
    }
    else {
        Write-Host 'auth: no GH_TOKEN/GITHUB_TOKEN. git itself may still work through Git Credential'
        Write-Host '      Manager; only the "create repository" and "set topics" steps need a token.'
    }
    Write-Host ''

    $apiHeaders = @{}
    if ($hasToken) {
        $apiHeaders = @{
            Authorization          = "Bearer $Token"
            Accept                 = 'application/vnd.github+json'
            'X-GitHub-Api-Version' = '2022-11-28'
            'User-Agent'           = 'dsh-ml-planner-push-script'
        }
    }

    # ---- Step 1: does the remote repository exist? -------------------------
    $repoExists = $false
    if ($hasToken) {
        Write-Host '[1/4] checking the remote repository'
        $probe = Invoke-GitHubApi -Method 'GET' -Uri "https://api.github.com/repos/$Owner/$RepoName" -Headers $apiHeaders
        if ($probe.Ok) {
            $repoExists = $true
            Write-Host "      exists: $($probe.Data.full_name) (default branch: $($probe.Data.default_branch))"
        }
        elseif ($probe.Status -eq 404) {
            Write-Host '      not found - creating it'
            $body = @{
                name        = $RepoName
                description = $Description
                private     = [bool]$Private
                has_issues  = $true
                has_wiki    = $false
                has_projects= $false
                auto_init   = $false
            } | ConvertTo-Json -Compress
            $created = Invoke-GitHubApi -Method 'POST' -Uri 'https://api.github.com/user/repos' `
                -Headers $apiHeaders -BodyJson $body
            if ($created.Ok) {
                $repoExists = $true
                Write-Host "      created: $($created.Data.html_url)"
            }
            elseif ($created.Status -eq 422) {
                $repoExists = $true
                Write-Host '      already exists (422) - continuing'
            }
            else {
                throw "could not create the repository (HTTP $($created.Status)): $($created.Message)"
            }
        }
        else {
            Write-Warning "could not verify the repository (HTTP $($probe.Status)): $($probe.Message)"
        }
    }
    else {
        Write-Host '[1/4] remote repository: not checked (no token) - git push below reports the truth'
    }

    # ---- Step 2: remote ----------------------------------------------------
    Write-Host ''
    Write-Host '[2/4] git remote'
    $existing = Invoke-Git -Arguments @('remote', 'get-url', $RemoteName) -WorkingDirectory $RepoRoot
    if ($existing.Exit -eq 0 -and -not [string]::IsNullOrWhiteSpace($existing.Text)) {
        if ($existing.Text -ne $cloneUrl) {
            Write-Host "      $RemoteName was $($existing.Text) - updating to $cloneUrl"
            $set = Invoke-Git -Arguments @('remote', 'set-url', $RemoteName, $cloneUrl) -WorkingDirectory $RepoRoot
            if ($set.Exit -ne 0) { throw "git remote set-url failed: $($set.Text)" }
        }
        else {
            Write-Host "      $RemoteName -> $cloneUrl (unchanged)"
        }
    }
    else {
        $add = Invoke-Git -Arguments @('remote', 'add', $RemoteName, $cloneUrl) -WorkingDirectory $RepoRoot
        if ($add.Exit -ne 0) { throw "git remote add failed: $($add.Text)" }
        Write-Host "      $RemoteName -> $cloneUrl (added)"
    }
    Write-Host '      (the remote URL never contains a token, so .git/config holds no secret)'

    # ---- Step 3: push ------------------------------------------------------
    Write-Host ''
    Write-Host '[3/4] git push'
    if ($SkipPush) {
        Write-Host '      skipped (-SkipPush)'
    }
    else {
        $refspec = "$currentBranch`:refs/heads/$Branch"
        $pushArgs = @('push', $RemoteName, $refspec, '--tags')
        $pushHeaders = $null
        if ($hasToken) {
            $basic = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("x-access-token:$Token"))
            $env:GIT_CONFIG_COUNT = '1'
            $env:GIT_CONFIG_KEY_0 = 'http.extraheader'
            $env:GIT_CONFIG_VALUE_0 = "Authorization: Basic $basic"
            $pushHeaders = @('GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0')
            Write-Host '      using a one-shot Authorization header (not written to disk)'
        }
        $pushed = Invoke-Git -Arguments $pushArgs -WorkingDirectory $RepoRoot
        if ($pushHeaders) {
            foreach ($name in $pushHeaders) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
        }
        foreach ($line in $pushed.Output) { Write-Host "      $line" }
        if ($pushed.Exit -ne 0) {
            Write-Host ''
            Write-Host '      git push FAILED.' -ForegroundColor Red
            if (-not $hasToken) {
                Write-Host ''
                Write-Host '      If the failure is "Repository not found", the remote repository does not'
                Write-Host '      exist yet. Create it in one click, then re-run this script:'
                Write-Host ''
                $newUrl = 'https://github.com/new?name=' + [uri]::EscapeDataString($RepoName) +
                          '&owner=' + [uri]::EscapeDataString($Owner)
                Write-Host "          $newUrl"
                Write-Host ''
                Write-Host '      Leave "Initialize this repository" OFF (no README, no .gitignore, no licence)'
                Write-Host '      so the first push is not rejected as non-fast-forward, then:'
                Write-Host ''
                Write-Host "          pwsh -File scripts/push-to-github.ps1"
                Write-Host ''
                Write-Host '      Or provide a token and let this script create it:'
                Write-Host ''
                Write-Host '          $env:GH_TOKEN = "ghp_..."   # scope: repo'
                Write-Host '          pwsh -File scripts/push-to-github.ps1'
            }
            exit 1
        }
        Write-Host "      ok: $currentBranch -> $RemoteName/$Branch" -ForegroundColor Green
    }

    # ---- Step 4: topics ----------------------------------------------------
    Write-Host ''
    Write-Host '[4/4] repository topics'
    if ($SkipTopics) {
        Write-Host '      skipped (-SkipTopics)'
    }
    elseif (-not ($hasToken -and $repoExists)) {
        Write-Host '      skipped: setting topics needs a token (the API cannot do it anonymously).'
        Write-Host '      Set them in the GitHub UI (About -> gear -> Topics), or re-run with:'
        Write-Host "          $($Topics -join ', ')"
    }
    else {
        $topicsBody = @{ names = $Topics } | ConvertTo-Json -Compress
        $topicsResult = Invoke-GitHubApi -Method 'PUT' -Uri "https://api.github.com/repos/$Owner/$RepoName/topics" `
            -Headers $apiHeaders -BodyJson $topicsBody
        if ($topicsResult.Ok) {
            Write-Host "      set: $(($topicsResult.Data.names) -join ', ')"
        }
        else {
            Write-Warning "could not set the topics (HTTP $($topicsResult.Status)): $($topicsResult.Message)"
        }
    }

    Write-Host ''
    Write-Host '=' * 72
    Write-Host 'done'
    Write-Host "  repository : $remoteUrl"
    Write-Host "  clone      : $cloneUrl"
    Write-Host "  default branch: $Branch  (set it under Settings -> Branches if the remote disagrees)"
    exit 0
}
catch {
    Write-Host ''
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
