#!/bin/bash
# Script para configurar os secrets do GitHub Actions
# Execute: bash scripts/setup-github-secrets.sh
# Pré-requisito: ter o GitHub CLI instalado (https://cli.github.com)
# e estar autenticado com: gh auth login

REPO="PedroBorelaManzi/Represente-Me-"

echo "🔐 Configurando secrets do GitHub Actions para $REPO"
echo ""
echo "Você precisará informar os valores do seu arquivo .env local"
echo ""

read -p "VITE_SUPABASE_URL: " SUPABASE_URL
gh secret set VITE_SUPABASE_URL --body "$SUPABASE_URL" --repo "$REPO"

read -p "VITE_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
gh secret set VITE_SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY" --repo "$REPO"

read -p "VITE_GEMINI_API_KEY: " GEMINI_KEY
gh secret set VITE_GEMINI_API_KEY --body "$GEMINI_KEY" --repo "$REPO"

read -p "VITE_OPENAI_API_KEY (pressione Enter para pular): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
  gh secret set VITE_OPENAI_API_KEY --body "$OPENAI_KEY" --repo "$REPO"
fi

echo ""
echo "✅ Secrets configurados com sucesso!"
echo "Agora faça push e o CI vai funcionar."
