# Script para limpar cache do Vite e reiniciar servidor
Write-Host "Limpando cache do Vite..." -ForegroundColor Yellow

# Remove caches
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".vite" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue

Write-Host "Cache limpo! Agora reinicie o servidor com: npm run dev" -ForegroundColor Green

