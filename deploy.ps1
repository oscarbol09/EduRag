# deploy.ps1 — aplica migraciones Supabase + commit y push a GitHub
# Ejecutar desde PowerShell en la raíz del proyecto:
# cd "C:\Users\dario\OneDrive\Escritorio\EduRAG-Platform\EduRAG-Platform"
# .\deploy.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\dario\OneDrive\Escritorio\EduRAG-Platform\EduRAG-Platform"
Set-Location $projectRoot

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " EduRAG — Deploy Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Supabase: verificar login ──────────────────────────────────────────────
Write-Host "[1/4] Verificando sesión Supabase..." -ForegroundColor Yellow
supabase projects list
if ($LASTEXITCODE -ne 0) {
Write-Host "ERROR: No hay sesión activa. Ejecuta: supabase login" -ForegroundColor Red
exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# ── 2. Supabase: listar migraciones pendientes ────────────────────────────────
Write-Host "[2/4] Migraciones pendientes:" -ForegroundColor Yellow
supabase migration list
Write-Host ""

# ── 3. Supabase: aplicar migraciones al remoto ────────────────────────────────
Write-Host "[3/4] Aplicando migraciones a producción..." -ForegroundColor Yellow
supabase db push
if ($LASTEXITCODE -ne 0) {
Write-Host "ERROR: supabase db push falló. Revisa los logs." -ForegroundColor Red
exit 1
}
Write-Host "Migraciones aplicadas OK" -ForegroundColor Green
Write-Host ""

# ── 4. Git: commit y push ─────────────────────────────────────────────────────
Write-Host "[4/4] Commit y push a GitHub..." -ForegroundColor Yellow

git -C $projectRoot add -A

$status = git -C $projectRoot status --porcelain
if (-not $status) {
Write-Host "Nada que commitear — working tree limpio." -ForegroundColor Gray
} else {
Write-Host "Archivos modificados:" -ForegroundColor Gray
git -C $projectRoot status --short

$msg = @(
"fix: aplicar correcciones de auditoria tecnica (sesiones 2-5)",
"",
"- backend: cerrar migracion legacy institution (map_user_response)",
"- backend: ALLOWED_MIME_TYPES incluye pdf y docx",
"- backend: CORS_ORIGINS incluye Railway en .env y .env.example",
"- backend: imports al top de test_main.py (sin imports en funciones)",
"- frontend: CSP connect-src incluye URL de Railway en vercel.json",
"- supabase: migraciones para indices, tabla messages y DROP COLUMN legacy",
"- tests: 6 tests de chat y 7 tests de admin anadidos"
)
$commitMessage = $msg -join [System.Environment]::NewLine

git -C $projectRoot commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
Write-Host "ERROR: git commit falló." -ForegroundColor Red
exit 1
}

git -C $projectRoot push
if ($LASTEXITCODE -ne 0) {
Write-Host "ERROR: git push falló. Verifica credenciales." -ForegroundColor Red
exit 1
}
Write-Host "Push OK" -ForegroundColor Green
Write-Host ""
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Todo listo." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""