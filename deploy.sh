#!/bin/bash
# Puxa a última versão da branch main do GitHub e reconstrói os containers.
# /opt/invexa é um checkout git (remote via deploy key, só leitura) — não
# rode isto de dentro de outro diretório nem espere código copiado à mão.
set -e

cd /opt/invexa

echo "[deploy] Atualizando código a partir do GitHub..."
git fetch origin
git reset --hard origin/main

echo "[deploy] Rebuilding containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api web

# api/web recriados = IPs novos na invexa-net. O Nginx compartilhado (do
# quitei, que faz proxy pra cá) resolve o hostname uma vez e cacheia —
# sem reiniciar ele, fica devolvendo 502 pros IPs antigos até cair um TTL.
echo "[deploy] Reiniciando nginx compartilhado (resolve IPs novos)..."
(cd /opt/quitei && docker compose -f docker-compose.prod.yml --env-file .env.prod restart nginx)

echo "[deploy] Verificando saúde..."
sleep 8
STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://invexa.debai.site/api/health)
if [ "$STATUS" = "200" ]; then
  echo "[deploy] OK — app respondendo (HTTP $STATUS)"
else
  echo "[deploy] ATENÇÃO — app retornou HTTP $STATUS"
  exit 1
fi
