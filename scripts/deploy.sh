#!/usr/bin/env bash
# Publica a versão atual no GitHub Pages (branch gh-pages).
# Uso: npm run deploy
set -euo pipefail

REPO_URL="https://github.com/anasofiaagr/itinerario_rio_interativo.git"
BASE="/itinerario_rio_interativo/"

echo "→ Build (base=$BASE)"
VITE_BASE="$BASE" npm run build

echo "→ Publicando dist/ na branch gh-pages"
cd dist
touch .nojekyll
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Deploy site ($(date +%Y-%m-%d\ %H:%M))"
git push -f "$REPO_URL" gh-pages

echo "✓ Publicado: https://anasofiaagr.github.io/itinerario_rio_interativo/"
echo "  (o Pages leva ~1 min para atualizar)"
