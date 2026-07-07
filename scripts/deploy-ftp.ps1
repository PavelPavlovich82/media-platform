# deploy-ftp.ps1
# REG.RU FTP deploy for factory.all-all.ru
# Compatible with Windows PowerShell 5.1
# Uploads contents of frontend/dist to /www/factory.all-all.ru
# Does not upload .htaccess

$ErrorActionPreference = "Stop"

$FtpHost = "vip296.hosting.reg.ru"
$FtpUser = "u2639947"
$CandidateRemoteRoots = @(
    "/www/factory.all-all.ru",
    "/var/www/u2639947/data/www/factory.all-all.ru"
)

function Write-Step($Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function To-PlainText([Security.SecureString]$SecureString) {
    $Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)
    }
}

function Join-FtpPath($A, $B) {
    $left = $A.TrimEnd("/")
    $right = $B.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($right)) { return $left }
    return "$left/$right"
}

function New-FtpRequest($Uri, $Method, $Credential) {
    $Request = [System.Net.FtpWebRequest]::Create($Uri)
    $Request.Method = $Method
    $Request.Credentials = $Credential
    $Request.UseBinary = $true
    $Request.UsePassive = $true
    $Request.KeepAlive = $false
    $Request.Timeout = 60000
    $Request.ReadWriteTimeout = 60000
    return $Request
}

function Test-FtpDirectory($RemotePath, $Credential) {
    try {
        $Uri = "ftp://$FtpHost$RemotePath/"
        $Request = New-FtpRequest $Uri ([System.Net.WebRequestMethods+Ftp]::ListDirectory) $Credential
        $Response = $Request.GetResponse()
        $Response.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Ensure-FtpDirectory($RemotePath, $Credential) {
    $parts = $RemotePath.Trim("/").Split("/") | Where-Object { $_ -ne "" }
    $current = ""
    foreach ($part in $parts) {
        $current = "$current/$part"
        if (-not (Test-FtpDirectory $current $Credential)) {
            try {
                $Uri = "ftp://$FtpHost$current"
                $Request = New-FtpRequest $Uri ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) $Credential
                $Response = $Request.GetResponse()
                $Response.Close()
                Write-Host "MKDIR  $current" -ForegroundColor DarkCyan
            }
            catch {
                # Directory may already exist or parent listing may be restricted.
            }
        }
    }
}

function Get-RelativePathCompat($BasePath, $FullPath) {
    $baseFull = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
    $fileFull = [System.IO.Path]::GetFullPath($FullPath)
    if (-not $fileFull.StartsWith($baseFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "File is not inside base path: $fileFull"
    }
    return $fileFull.Substring($baseFull.Length).Replace('\', '/')
}

function ConvertTo-PlainTextValue($Value) {
    if ($null -eq $Value) {
        return ''
    }

    if ($Value -is [System.Array]) {
        return (($Value | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                $_.Exception.Message
            }
            else {
                "$_"
            }
        }) -join "`n")
    }

    if ($Value -is [System.Management.Automation.ErrorRecord]) {
        return $Value.Exception.Message
    }

    return "$Value"
}

function Get-RegexCapture($Text, $Pattern, $GroupIndex = 1) {
    $plainText = ConvertTo-PlainTextValue $Text
    if ([string]::IsNullOrWhiteSpace($plainText)) {
        return $null
    }

    $match = [regex]::Match($plainText, $Pattern)
    if (-not $match.Success) {
        return $null
    }

    return $match.Groups[$GroupIndex].Value
}

function Upload-FtpFile($LocalFile, $RemoteFile, $Credential, $PlainPassword) {
    $attempt = 0
    $maxAttempts = 3
    $localSize = (Get-Item -LiteralPath $LocalFile).Length
    $uri = "ftp://$FtpHost$RemoteFile"

    while ($attempt -lt $maxAttempts) {
        $attempt++

        try {
            & curl.exe `
                -T $LocalFile `
                $uri `
                --user "$($Credential.UserName):$PlainPassword" `
                --ftp-create-dirs `
                --connect-timeout 60 `
                --max-time 600 `
                -sS `
                -f | Out-Null

            if ($LASTEXITCODE -ne 0) {
                throw "curl upload failed with exit code $LASTEXITCODE"
            }

            if (-not (Test-CriticalDeployAsset $RemoteFile)) {
                Write-Host "  OK uploaded" -ForegroundColor DarkGreen
                return
            }

            $remoteSize = Get-FtpFileSize $RemoteFile $Credential $PlainPassword
            if ($remoteSize -lt 0) {
                throw "Could not verify remote file size for $RemoteFile"
            }
            if ($remoteSize -ne $localSize) {
                throw "SIZE MISMATCH: local=$localSize remote=$remoteSize"
            }

            Write-Host "  OK size=$localSize" -ForegroundColor DarkGreen
            return
        }
        catch {
            if ($attempt -ge $maxAttempts) {
                throw "UPLOAD FAILED after $maxAttempts attempts: $RemoteFile | $($_.Exception.Message)"
            }

            Write-Host "RETRY  $RemoteFile ($attempt/$maxAttempts)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

function Test-DeployedAssets($DistRoot) {
    $siteUrl = "https://factory.all-all.ru"
    $indexPath = Join-Path $DistRoot "index.html"
    $html = Get-Content -LiteralPath $indexPath -Raw

    $jsName = Get-RegexCapture $html 'src="/assets/([^"]+\.js)"'
    if ([string]::IsNullOrWhiteSpace($jsName)) {
        throw "Could not find JS asset path in dist/index.html"
    }
    $localJs = Join-Path $DistRoot "assets\$jsName"
    if (-not (Test-Path $localJs)) {
        throw "Local JS asset not found: $localJs"
    }
    $localJsSize = (Get-Item -LiteralPath $localJs).Length

    $jsHeaders = & curl.exe -I -s "$siteUrl/assets/$jsName"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not fetch remote JS headers: /assets/$jsName"
    }
    $remoteJsSizeText = Get-RegexCapture $jsHeaders 'Content-Length:\s*(\d+)'
    if ([string]::IsNullOrWhiteSpace($remoteJsSizeText)) {
        throw "Could not parse Content-Length for /assets/$jsName"
    }
    $remoteJsSize = [int]$remoteJsSizeText
    if ($remoteJsSize -ne $localJsSize) {
        throw "WHITE SCREEN RISK: JS size mismatch local=$localJsSize remote=$remoteJsSize"
    }

    $cssName = Get-RegexCapture $html 'href="/assets/([^"]+\.css)"'
    if (-not [string]::IsNullOrWhiteSpace($cssName)) {
        $localCss = Join-Path $DistRoot "assets\$cssName"
        $localCssSize = (Get-Item -LiteralPath $localCss).Length
        $cssHeaders = & curl.exe -I -s "$siteUrl/assets/$cssName"
        $remoteCssSizeText = Get-RegexCapture $cssHeaders 'Content-Length:\s*(\d+)'
        if (-not [string]::IsNullOrWhiteSpace($remoteCssSizeText)) {
            $remoteCssSize = [int]$remoteCssSizeText
            if ($remoteCssSize -ne $localCssSize) {
                throw "CSS size mismatch local=$localCssSize remote=$remoteCssSize"
            }
        }
    }

    $dashboardHeaders = & curl.exe -I -s "$siteUrl/dashboard/"
    $dashboardStatus = Get-RegexCapture $dashboardHeaders 'HTTP/\S+\s+(\d+)'
    if ($dashboardStatus -ne '200') {
        throw "Dashboard route is not HTTP 200"
    }

    Write-Host "VERIFY OK JS=$jsName ($remoteJsSize bytes), dashboard=200" -ForegroundColor Green
}

function Test-CriticalDeployAsset($RemoteFile) {
    return $RemoteFile -match '/assets/index-[^/]+\.(js|css)$'
}

function Get-FtpFileSize($RemoteFile, $Credential, $PlainPassword) {
    $uri = "ftp://$FtpHost$RemoteFile"
    $auth = "$($Credential.UserName):$PlainPassword"

    $headers = & curl.exe `
        -sI `
        --user $auth `
        $uri `
        --connect-timeout 30 `
        --max-time 60 2>&1

    $lengthValue = Get-RegexCapture $headers '(?i)Content-Length:\s*(\d+)'
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($lengthValue)) {
        return [int]$lengthValue
    }

    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        & curl.exe `
            -sS `
            -o $tempFile `
            --user $auth `
            $uri `
            --connect-timeout 30 `
            --max-time 600 | Out-Null

        if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $tempFile)) {
            return (Get-Item -LiteralPath $tempFile).Length
        }
    }
    finally {
        if (Test-Path -LiteralPath $tempFile) {
            Remove-Item -LiteralPath $tempFile -Force
        }
    }

    try {
        $Request = New-FtpRequest $uri ([System.Net.WebRequestMethods+Ftp]::GetFileSize) $Credential
        $Response = $Request.GetResponse()
        $size = $Response.ContentLength
        $Response.Close()
        if ($size -ge 0) {
            return $size
        }
    }
    catch {
        # REG.RU often rejects .NET FTP SIZE; curl paths above are preferred.
    }

    return -1
}

function Remove-DirectoryIfExists($Path) {
    if (Test-Path $Path) {
        Write-Host "Remove old local dist: $Path" -ForegroundColor DarkYellow
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrontendRoot = Join-Path $ProjectRoot "frontend"
$DistRoot = Join-Path $FrontendRoot "dist"

Write-Step "Build project"
Write-Host "Project root:  $ProjectRoot"
Write-Host "Frontend root: $FrontendRoot"

if (-not (Test-Path $FrontendRoot)) {
    throw "Frontend folder not found: $FrontendRoot"
}

# Important: remove old local dist before build to avoid uploading old hashed assets.
Remove-DirectoryIfExists $DistRoot

Push-Location $FrontendRoot
try {
    npm run build
}
finally {
    Pop-Location
}

Write-Step "Validate dist"
if (-not (Test-Path $DistRoot)) {
    throw "Dist folder not found after build: $DistRoot"
}
if (-not (Test-Path (Join-Path $DistRoot "index.html"))) {
    throw "index.html not found in dist: $DistRoot"
}
Write-Host "Dist OK: $DistRoot" -ForegroundColor Green

Write-Step "Prepare FTP credentials"
$SecurePassword = Read-Host "Enter FTP password for $FtpUser" -AsSecureString
$Password = To-PlainText $SecurePassword
$Credential = New-Object System.Net.NetworkCredential($FtpUser, $Password)

Write-Step "Find working REG.RU FTP path"
$RemoteRoot = $null
foreach ($candidate in $CandidateRemoteRoots) {
    Write-Host "Testing: $candidate"
    if (Test-FtpDirectory $candidate $Credential) {
        $RemoteRoot = $candidate
        break
    }
}

if ($null -eq $RemoteRoot) {
    throw "No working FTP path found. Check FileZilla remote path and FTP user permissions."
}

Write-Host "Using remote path: $RemoteRoot" -ForegroundColor Green

Write-Step "Upload dist contents to REG.RU"

$files = Get-ChildItem -LiteralPath $DistRoot -Recurse -File | Sort-Object FullName

foreach ($file in $files) {
    $relative = Get-RelativePathCompat $DistRoot $file.FullName

    if ($relative -eq ".htaccess" -or $relative.EndsWith("/.htaccess")) {
        Write-Host "SKIP   $relative" -ForegroundColor Yellow
        continue
    }

    $remoteFile = Join-FtpPath $RemoteRoot $relative
    $remoteDir = Split-Path $remoteFile -Parent
    $remoteDir = $remoteDir.Replace('\', '/')

    Ensure-FtpDirectory $remoteDir $Credential

    Write-Host "UPLOAD $relative"
    Upload-FtpFile $file.FullName $remoteFile $Credential $Password
}

Write-Step "Verify deployed assets over HTTPS"
Test-DeployedAssets $DistRoot

Write-Step "Done"
Write-Host "Uploaded dist contents to: $RemoteRoot" -ForegroundColor Green
Write-Host "Check: https://factory.all-all.ru" -ForegroundColor Green
Write-Host "Check: https://factory.all-all.ru/dashboard/" -ForegroundColor Green
