# Prumo — inventário no prumo

Sistema de controle de estoque e inventário. Especificação completa em
[ROADMAP-PRUMO.md](ROADMAP-PRUMO.md). Esta implementação cobre o roadmap
**completo, Fases 0 a 7**: fundação, catálogo, núcleo de estoque, escopo de
inventário, efetivação, dashboard, exportação e acabamento.

## Stack

- **API:** Node + NestJS + Prisma + PostgreSQL (`apps/api`)
- **Web:** React + Vite + TypeScript + Tailwind CSS v4 (`apps/web`), PWA leve
  (service worker + manifest) para uso offline da contagem

## Como rodar localmente

```bash
npm install                  # instala api + web (workspaces)
cp .env.example apps/api/.env
docker compose up -d         # Postgres em localhost:5434
npm run prisma:migrate -w apps/api -- --name init
npm run seed -w apps/api     # depósito Principal, usuários e produtos de exemplo
npm run dev:api              # http://localhost:3400
npm run dev:web              # http://localhost:5173 (proxy /api -> :3400)
```

Usuários de teste (senha `prumo123`): `admin@prumo.local`,
`supervisor@prumo.local`, `contador@prumo.local`.

Se as portas 5432/3000 já estiverem em uso por outro projeto na máquina, o
Postgres do Prumo sobe em `5434` (ver `docker-compose.yml`) e a API em
`3400` (ver `.env.example`) — ajuste se precisar.

## O que foi implementado

- **Fase 0:** login/JWT, papéis (contador/supervisor/admin), auditoria,
  layout com a paleta da marca.
- **Fase 1:** categorias, produtos (SKU/código de barras únicos, saldo
  sempre nasce em 0), busca/filtro/paginação, import CSV com prévia.
- **Fase 2:** `movimento_estoque` append-only como único caminho de escrita
  de saldo, posição de estoque, kardex, movimento manual com motivo
  obrigatório, job diário de conferência de cache.
- **Fase 3:** escopo de inventário com os 6 critérios de seleção,
  congelamento de saldo na abertura, máquina de estados validada no
  backend, contagem otimizada para leitor de código de barras, recontagem
  com histórico de sequência, cancelamento em 3 níveis, adicionar/remover
  itens do escopo.
- **Fase 4:** conferência com divergências ordenadas por impacto em R$,
  aviso de saldo alterado desde a abertura, política de pendentes
  (ignorar/zerar), efetivação transacional e idempotente, comprovante em
  PDF e XLSX.
- **Fase 5 — Dashboard:** os 3 blocos do roadmap (saúde do estoque —
  valor total, curva ABC, top 10 imobilizado; qualidade do inventário —
  acuracidade por item e por valor, divergência por categoria/responsável,
  reincidência, evolução temporal; operação — cobertura, produtividade,
  tempo médio de efetivação), filtros globais, drill-down nos indicadores
  e cache invalidado automaticamente a cada efetivação.
- **Fase 6 — Exportação:** CSV (BOM + `;` + decimal vírgula), XLSX
  multi-aba, JSON aninhado e XML com `.xsd` documentado
  (`apps/api/src/exportacao/xsd`), para catálogo, posição de estoque,
  kardex, escopo, contagens, movimentos e indicadores do dashboard.
  Datasets grandes (>20 mil linhas) processam em segundo plano com
  acompanhamento de status; toda exportação fica auditada.
- **Fase 7 — Acabamento:** layout responsivo (sidebar vira gaveta no
  celular), contagem offline com fila em IndexedDB e sincronização
  automática ao reconectar, atalhos de teclado (Esc cancela a contagem em
  andamento), impressão de etiquetas Code128, sino de notificação para
  escopos perto do prazo.

## Decisões de simplificação (documentadas, não esquecidas)

- Exportação assíncrona roda em processo (não usa fila externa tipo
  Redis/BullMQ) — adequado ao porte do app; ver `exportacao.service.ts`.
- Notificação de prazo é in-app (sino), sem e-mail/push — não havia infra
  de envio pedida no roadmap.
- O `.xsd` documenta a forma genérica do envelope XML (`<exportacao
  tipo="..."><linha>...</linha></exportacao>`), não um schema por tipo.
