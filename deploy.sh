#!/bin/bash
# Rode isso DEPOIS de já ter atualizado o código em /opt/prumo (o projeto
# não é um repo git — copie os arquivos novos, ex. via scp/tar, antes).
set -e

cd /opt/prumo

echo "[deploy] Rebuilding containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api web

# api/web recriados = IPs novos na prumo-net. O Nginx compartilhado (do
# quitei, que faz proxy pra cá) resolve o hostname uma vez e cacheia —
# sem reiniciar ele, fica devolvendo 502 pros IPs antigos até cair um TTL.
echo "[deploy] Reiniciando nginx compartilhado (resolve IPs novos)..."
(cd /opt/quitei && docker compose -f docker-compose.prod.yml --env-file .env.prod restart nginx)

echo "[deploy] Verificando saúde..."
sleep 8
STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://prumo.debai.site/api/health)
if [ "$STATUS" = "200" ]; then
  echo "[deploy] OK — app respondendo (HTTP $STATUS)"
else
  echo "[deploy] ATENÇÃO — app retornou HTTP $STATUS"
  exit 1
fi
