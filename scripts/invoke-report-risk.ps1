$ErrorActionPreference = 'Stop'
$secret = Read-Host 'Paste RISK_WORKER_SECRET (input is masked)' -AsSecureString
if ($secret.Length -lt 32) {
    $secret.Dispose()
    throw 'Use the saved worker secret, at least 32 characters. Do not paste it in chat.'
}
$pointer = [IntPtr]::Zero
$headers = @{}
try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $headers.Authorization = 'Bearer ' + [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $result = Invoke-RestMethod -Uri 'https://ivzofixdjcgkwalfzmmy.supabase.co/functions/v1/report-risk' -Method Post -Headers $headers -ContentType 'application/json' -Body '{}' -TimeoutSec 140
    if ($null -eq $result.completed -or $null -eq $result.deferred) {
        throw 'The worker response did not contain review counts.'
    }
    Write-Host "Worker result: completed=$($result.completed), deferred=$($result.deferred)"
} catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'connection or response error' }
    Write-Host "Worker invocation failed: $status. Share this status, not the secret."
    try {
        $failure = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($failure.stage -in @('setup','claim','context','finish')) { Write-Host "Worker stage: $($failure.stage)" }
    } catch { }
    exit 1
} finally {
    $headers.Clear()
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $secret.Dispose()
}
