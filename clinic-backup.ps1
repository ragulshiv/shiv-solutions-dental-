# Nightly backup of the clinic stack (docker-compose.clinic.yml) — Windows version of scripts/backup.sh.
#   powershell -ExecutionPolicy Bypass -File C:\clinic\dental-erp\clinic-backup.ps1
# Writes C:\clinic\backups\<stamp>\ (database.sql.gz, uploads.tar.gz, manifest, checksums),
# then copies it to Google Drive: G:\My Drive\Clinic HQ\09 DentalERP Backups\<stamp>\.
# Keeps the newest 14 locally and 60 on Drive. Log: C:\clinic\backups\backup.log
$ErrorActionPreference = 'Stop'
$Repo      = 'C:\clinic\dental-erp'
$LocalRoot = 'C:\clinic\backups'
$DriveRoot = 'G:\My Drive\Clinic HQ\09 DentalERP Backups'
$Stamp     = Get-Date -Format 'yyyy-MM-dd_HHmm'
$Dest      = Join-Path $LocalRoot $Stamp
$Log       = Join-Path $LocalRoot 'backup.log'
New-Item -ItemType Directory -Force $Dest | Out-Null

function Log($msg) { "$(Get-Date -Format s)  $msg" | Tee-Object -FilePath $Log -Append }

function Compress-File($src, $dst) {
    $in = [IO.File]::OpenRead($src); $out = [IO.File]::Create($dst)
    $gz = New-Object IO.Compression.GZipStream($out, [IO.Compression.CompressionMode]::Compress)
    $in.CopyTo($gz); $gz.Dispose(); $out.Dispose(); $in.Dispose()
}

try {
    Set-Location $Repo
    $mysql = docker compose --env-file .env.clinic -f docker-compose.yml -f docker-compose.clinic.yml ps -q mysql
    if (-not $mysql) { throw 'mysql container is not running - start the stack first (clinic-start.cmd)' }

    # Database: dump inside the container (the root password never leaves it), then copy out.
    # --single-transaction = consistent snapshot without locking, so the clinic keeps working.
    docker exec $mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --user=root --single-transaction --routines --triggers --default-character-set=utf8mb4 "$MYSQL_DATABASE" > /tmp/backup.sql'
    if ($LASTEXITCODE -ne 0) { throw 'mysqldump failed' }
    docker cp "${mysql}:/tmp/backup.sql" "$Dest\database.sql" | Out-Null
    docker exec $mysql rm -f /tmp/backup.sql
    if (-not (Select-String -Path "$Dest\database.sql" -Pattern 'MySQL dump' -Quiet)) { throw 'dump looks empty or truncated' }
    Compress-File "$Dest\database.sql" "$Dest\database.sql.gz"
    Remove-Item "$Dest\database.sql"

    # Uploads volume (x-rays, documents), read-only mount.
    docker run --rm -v dental-erp_uploads:/src:ro -v "${Dest}:/out" alpine:3 tar czf /out/uploads.tar.gz -C /src .
    if ($LASTEXITCODE -ne 0) { throw 'uploads archive failed' }

    "created: $Stamp`ndatabase: dental_erp`nstorage_driver: local" | Set-Content "$Dest\manifest.txt"
    Get-ChildItem $Dest -File | Where-Object Name -ne 'checksums.txt' |
        ForEach-Object { "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower())  $($_.Name)" } |
        Set-Content "$Dest\checksums.txt"

    # Off-machine copy (Google Drive for Desktop syncs G:\ to the cloud).
    if (Test-Path 'G:\My Drive\Clinic HQ') {
        New-Item -ItemType Directory -Force $DriveRoot | Out-Null
        Copy-Item $Dest -Destination $DriveRoot -Recurse -Force
        Get-ChildItem $DriveRoot -Directory | Sort-Object Name -Descending | Select-Object -Skip 60 | Remove-Item -Recurse -Force
    } else { Log 'WARNING: G:\My Drive\Clinic HQ not found - Drive copy skipped (is Google Drive running?)' }

    Get-ChildItem $LocalRoot -Directory | Sort-Object Name -Descending | Select-Object -Skip 14 | Remove-Item -Recurse -Force
    $size = '{0:N1} MB' -f ((Get-ChildItem $Dest -File | Measure-Object Length -Sum).Sum / 1MB)
    Log "OK  $Stamp  ($size)"
} catch {
    Log "FAILED  $Stamp  $_"
    exit 1
}
