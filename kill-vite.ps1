# Script para parar todos os processos Node relacionados ao Vite
Write-Host "Parando processos Node..." -ForegroundColor Yellow

# Encontra processos Node que podem ser do Vite
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*nodejs*" -or $_.CommandLine -like "*vite*"
}

if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        Write-Host "Parando processo Node (PID: $($_.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Processos Node parados!" -ForegroundColor Green
} else {
    Write-Host "Nenhum processo Node encontrado." -ForegroundColor Green
}

# Limpa caches
Write-Host "`nLimpando caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue

Write-Host "`nPronto! Agora execute: npm run dev" -ForegroundColor Green

