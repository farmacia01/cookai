#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

printf "[1/3] Backend/Supabase checks...\n"
rg -n "s6x-create-payment|s6x-webhook|upsert_subscription|verify_jwt" "$ROOT_DIR/supabase" >/dev/null

printf "[2/3] Frontend/UI checks...\n"
rg -n "GenerateRecipes|Pricing|Admin|useRecipes" "$ROOT_DIR/src" >/dev/null

printf "[3/3] Build and lint...\n"
npm run -C "$ROOT_DIR" lint || true
npm run -C "$ROOT_DIR" build

printf "Orquestração concluída.\n"
