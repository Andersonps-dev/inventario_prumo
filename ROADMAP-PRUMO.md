# Prumo — Roadmap do Sistema de Inventário

> **Prumo** é o instrumento que diz a verdade sobre o que está reto. É isso que um inventário faz: confronta o que o sistema *acha* que existe com o que existe de fato na prateleira.
> Assinatura: **inventário no prumo**.

---

## 1. Identidade

| Item | Definição |
|---|---|
| Nome | **Prumo** |
| Assinatura | Inventário no prumo |
| Voz | Direta, operacional, sem jargão. Botão diz o que acontece: "Efetivar inventário", não "Confirmar". |
| Ícone | Peso de prumo facetado pendurado numa linha — as facetas também leem como caixa empilhada. |

### Paleta

| Papel | Hex | Uso |
|---|---|---|
| Aço profundo | `#12283F` | Fundo da marca, cabeçalhos, sidebar |
| Latão | `#E0A94A` | Ação primária, destaque, o peso do prumo |
| Latão escuro | `#B9832F` | Estados hover/pressed |
| Névoa | `#8FA6B8` | Texto secundário, linhas, ícones inativos |
| Concreto | `#F4F5F3` | Fundo das telas |
| Conforme | `#1F6F5C` | Contagem sem divergência |
| Divergente | `#B3402F` | Falta / sobra |

### Arquivos da marca
- `prumo-icone.svg` — ícone quadrado (app, favicon, avatar)
- `prumo-logo.svg` — lockup horizontal com wordmark

---

## 2. O problema que o Prumo resolve

Estoque errado custa dinheiro de duas formas: você compra o que já tem, ou vende o que não tem. O Prumo existe para que a diferença entre sistema e prateleira seja **medida, explicada e corrigida de forma rastreável** — nunca corrigida no escuro.

**Fora de escopo (por decisão, não por esquecimento):** venda, compra, financeiro, emissão fiscal. O Prumo é controle de estoque e inventário. Integrações vêm depois.

---

## 3. Princípios inegociáveis

Estes princípios definem a arquitetura. Quebrar qualquer um deles quebra o produto.

1. **Saldo é consequência, nunca um campo.** O saldo de um produto é a soma dos seus movimentos. Pode ser guardado em cache por desempenho, mas precisa ser recalculável a partir do histórico, sempre.
2. **Ninguém edita quantidade direto.** Não existe tela onde alguém digita "agora são 47". Todo ajuste nasce de um inventário efetivado ou de um movimento com motivo obrigatório.
3. **Efetivação é irreversível.** Um escopo efetivado vira registro histórico imutável. Errou? Abre um novo inventário. Isso é o que torna o histórico confiável.
4. **Toda contagem sabe quem, quando e quanto.** Sem autoria, o número não vale nada numa auditoria.
5. **O estoque nasce zerado.** Nenhum saldo inicial é digitado no cadastro. O primeiro inventário efetivado é o que popula o estoque — o mesmo caminho de todos os ajustes futuros. Um único fluxo, sem exceção.

---

## 4. Glossário

| Termo | Significado no Prumo |
|---|---|
| **Produto** | Item do catálogo, identificado por SKU |
| **Saldo** | Quantidade atual de um produto num depósito |
| **Movimento** | Registro imutável que altera o saldo (entrada, saída, ajuste, transferência) |
| **Escopo de inventário** | Solicitação que agrupa os produtos a contar, com prazo, responsável e status |
| **Item do escopo** | Um produto dentro de um escopo, com o saldo congelado no momento da abertura |
| **Contagem** | Quantidade física registrada para um item do escopo. Um item pode ter várias |
| **Saldo congelado** | Foto do saldo no instante da abertura do escopo — a base da comparação |
| **Divergência** | `quantidade contada − saldo congelado`. Positiva = sobra, negativa = falta |
| **Efetivar** | Transformar as divergências do escopo em movimentos de ajuste reais |
| **Acuracidade** | % de itens contados sem divergência |

---

## 5. Modelo de dados

SQL em dialeto genérico. Ajuste tipos conforme o banco escolhido.

```sql
-- ─────────────── Catálogo ───────────────
CREATE TABLE categoria (
  id           INTEGER PRIMARY KEY,
  nome         TEXT NOT NULL UNIQUE,
  ativo        BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE produto (
  id             INTEGER PRIMARY KEY,
  sku            TEXT NOT NULL UNIQUE,
  codigo_barras  TEXT UNIQUE,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  categoria_id   INTEGER REFERENCES categoria(id),
  unidade        TEXT NOT NULL DEFAULT 'UN',   -- UN, KG, CX, L
  preco_custo    NUMERIC(14,4) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(14,4) NOT NULL DEFAULT 0,
  ativo          BOOLEAN NOT NULL DEFAULT 1,
  criado_em      TIMESTAMP NOT NULL,
  atualizado_em  TIMESTAMP NOT NULL
);
CREATE INDEX idx_produto_nome ON produto(nome);
CREATE INDEX idx_produto_categoria ON produto(categoria_id);

CREATE TABLE deposito (
  id     INTEGER PRIMARY KEY,
  nome   TEXT NOT NULL UNIQUE,
  ativo  BOOLEAN NOT NULL DEFAULT 1
);
-- v1 opera com um único depósito "Principal", mas a coluna já existe
-- em todas as tabelas de saldo e movimento. Adicionar depósito depois
-- é configuração; adicionar a coluna depois é migração de dados.

-- ─────────────── Estoque ───────────────
CREATE TABLE saldo_estoque (              -- cache, sempre recalculável
  produto_id    INTEGER NOT NULL REFERENCES produto(id),
  deposito_id   INTEGER NOT NULL REFERENCES deposito(id),
  quantidade    NUMERIC(14,4) NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP NOT NULL,
  PRIMARY KEY (produto_id, deposito_id)
);

CREATE TABLE movimento_estoque (          -- append-only. Nunca UPDATE, nunca DELETE
  id              INTEGER PRIMARY KEY,
  produto_id      INTEGER NOT NULL REFERENCES produto(id),
  deposito_id     INTEGER NOT NULL REFERENCES deposito(id),
  tipo            TEXT NOT NULL,          -- ENTRADA | SAIDA | AJUSTE_INVENTARIO | TRANSFERENCIA
  quantidade      NUMERIC(14,4) NOT NULL, -- com sinal: +10 entra, -10 sai
  saldo_anterior  NUMERIC(14,4) NOT NULL,
  saldo_posterior NUMERIC(14,4) NOT NULL,
  custo_unitario  NUMERIC(14,4),
  origem_tipo     TEXT,                   -- ESCOPO_ITEM | MANUAL | IMPORTACAO
  origem_id       INTEGER,
  motivo          TEXT,
  usuario_id      INTEGER NOT NULL REFERENCES usuario(id),
  criado_em       TIMESTAMP NOT NULL
);
CREATE INDEX idx_mov_produto_data ON movimento_estoque(produto_id, criado_em);
CREATE INDEX idx_mov_origem ON movimento_estoque(origem_tipo, origem_id);

-- ─────────────── Inventário ───────────────
CREATE TABLE escopo_inventario (
  id                   INTEGER PRIMARY KEY,
  codigo               TEXT NOT NULL UNIQUE,   -- INV-2026-0001
  titulo               TEXT NOT NULL,
  deposito_id          INTEGER NOT NULL REFERENCES deposito(id),
  status               TEXT NOT NULL,          -- ver máquina de estados
  criterio_selecao     TEXT,                   -- JSON: como os itens entraram
  responsavel_id       INTEGER REFERENCES usuario(id),
  prazo                DATE,
  observacao           TEXT,
  aberto_por           INTEGER REFERENCES usuario(id),
  aberto_em            TIMESTAMP,
  efetivado_por        INTEGER REFERENCES usuario(id),
  efetivado_em         TIMESTAMP,
  cancelado_por        INTEGER REFERENCES usuario(id),
  cancelado_em         TIMESTAMP,
  motivo_cancelamento  TEXT,
  criado_em            TIMESTAMP NOT NULL
);

CREATE TABLE escopo_item (
  id                INTEGER PRIMARY KEY,
  escopo_id         INTEGER NOT NULL REFERENCES escopo_inventario(id),
  produto_id        INTEGER NOT NULL REFERENCES produto(id),
  saldo_congelado   NUMERIC(14,4) NOT NULL,   -- foto na abertura
  saldo_na_efetivacao NUMERIC(14,4),          -- releitura no fechamento
  quantidade_final  NUMERIC(14,4),            -- contagem válida vigente
  diferenca         NUMERIC(14,4),
  status            TEXT NOT NULL,            -- PENDENTE | CONTADO | CANCELADO
  UNIQUE (escopo_id, produto_id)
);
CREATE INDEX idx_escopo_item_escopo ON escopo_item(escopo_id, status);

CREATE TABLE contagem (
  id               INTEGER PRIMARY KEY,
  escopo_item_id   INTEGER NOT NULL REFERENCES escopo_item(id),
  sequencia        INTEGER NOT NULL,          -- 1ª, 2ª, 3ª contagem do item
  quantidade       NUMERIC(14,4) NOT NULL,
  status           TEXT NOT NULL,             -- VALIDA | SUBSTITUIDA | CANCELADA
  observacao       TEXT,
  contado_por      INTEGER NOT NULL REFERENCES usuario(id),
  contado_em       TIMESTAMP NOT NULL,
  cancelado_por    INTEGER REFERENCES usuario(id),
  cancelado_em     TIMESTAMP,
  motivo_cancelamento TEXT
);
CREATE INDEX idx_contagem_item ON contagem(escopo_item_id, sequencia);

-- ─────────────── Acesso e auditoria ───────────────
CREATE TABLE usuario (
  id          INTEGER PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  papel       TEXT NOT NULL,   -- CONTADOR | SUPERVISOR | ADMIN
  ativo       BOOLEAN NOT NULL DEFAULT 1,
  criado_em   TIMESTAMP NOT NULL
);

CREATE TABLE auditoria (
  id          INTEGER PRIMARY KEY,
  entidade    TEXT NOT NULL,
  entidade_id INTEGER NOT NULL,
  acao        TEXT NOT NULL,   -- CRIAR | EDITAR | CANCELAR | EFETIVAR
  antes       TEXT,            -- JSON
  depois      TEXT,            -- JSON
  usuario_id  INTEGER NOT NULL REFERENCES usuario(id),
  criado_em   TIMESTAMP NOT NULL
);
```

### Papéis

| Papel | Pode |
|---|---|
| **Contador** | Registrar e editar as próprias contagens de escopos abertos |
| **Supervisor** | Tudo do contador + abrir escopo, cancelar contagens de terceiros, efetivar, cancelar escopo |
| **Admin** | Tudo + cadastro de produtos, usuários e depósitos |

---

## 6. Máquina de estados do escopo

```
   ┌──────────┐  abrir    ┌────────┐  1ª contagem  ┌──────────────┐
   │ RASCUNHO │ ────────▶ │ ABERTO │ ────────────▶ │ EM_CONTAGEM  │
   └────┬─────┘           └───┬────┘               └──────┬───────┘
        │                     │                           │ concluir contagem
        │                     │                           ▼
        │                     │                    ┌──────────────┐
        │                     │                    │ CONFERENCIA  │
        │                     │                    └──┬────────┬──┘
        │                     │            reabrir ◀──┘        │ efetivar
        │                     │                                ▼
        │                     │                         ┌────────────┐
        │                     │                         │ EFETIVADO  │ (terminal)
        │                     │                         └────────────┘
        └─────────────────────┴──────── cancelar ──────▶ ┌───────────┐
                                                         │ CANCELADO │ (terminal)
                                                         └───────────┘
```

| Estado | O que é permitido |
|---|---|
| `RASCUNHO` | Montar a lista de itens. Nada congelado ainda. Pode excluir o escopo. |
| `ABERTO` | Saldos congelados. Itens podem entrar e sair da lista. Contagem liberada. |
| `EM_CONTAGEM` | Pelo menos uma contagem registrada. Remover item exige motivo. |
| `CONFERENCIA` | Contagem encerrada. Só supervisor age: revisar divergências, mandar recontar item específico, efetivar ou cancelar. |
| `EFETIVADO` | **Imutável.** Só leitura e exportação. |
| `CANCELADO` | **Imutável.** Nenhum movimento gerado. Fica no histórico com motivo. |

**Regra de ouro:** nenhum estado permite alterar `saldo_congelado`. Ele é a testemunha.

---

## 7. Módulos

### 7.1 Cadastro de produto

**Tela: lista de produtos**
```
┌──────────────────────────────────────────────────────────────┐
│  Produtos                                    [+ Novo produto]│
│  [ buscar por nome, SKU ou código de barras          ] 🔍    │
│  Categoria ▾   Situação ▾   ☐ Só abaixo do mínimo            │
├──────────────────────────────────────────────────────────────┤
│  SKU      Produto              Categoria   Un   Saldo   Mín  │
│  ─────────────────────────────────────────────────────────── │
│  PAR-001  Parafuso M6 40mm     Fixação     UN     240    100 │
│  TIN-014  Tinta acrílica 18L   Pintura     UN  ●    3     10 │  ← vermelho
│  CAB-002  Cabo flexível 2,5   Elétrica    M       0     50 │  ← zerado
└──────────────────────────────────────────────────────────────┘
```

**Tela: cadastro/edição**

Campos, em ordem: SKU · código de barras · nome · descrição · categoria · unidade · preço de custo · estoque mínimo · ativo.

Regras:
- SKU único e imutável após criação (é a chave que o histórico referencia). Errou? Inativa e cria outro.
- Código de barras único quando preenchido; aceita leitor no campo.
- **Não existe campo "quantidade inicial".** A tela mostra: *"Saldo: 0 — entra por inventário"*. Novo produto sempre nasce zerado.
- Produto com movimento nunca é excluído, só inativado. Inativo não entra em novos escopos, mas continua no histórico e nos relatórios.

### 7.2 Estoque

O saldo começa em zero para todo o catálogo — inclusive na carga inicial de produtos. A primeira contagem geral é o que dá vida ao estoque.

**Tela: posição de estoque** — saldo atual, valor a custo, última movimentação, data da última contagem por produto.

**Tela: kardex do produto** — extrato cronológico completo:

```
Data/hora        Tipo               Qtd    Saldo   Origem          Usuário
2026-08-20 14:02 AJUSTE_INVENTARIO  -3     237     INV-2026-0007   marina
2026-08-14 09:31 SAIDA              -20    240     Manual: OS 4471 joao
2026-08-01 08:00 AJUSTE_INVENTARIO  +260   260     INV-2026-0001   marina
```

Movimento manual (entrada/saída fora de inventário) existe, mas exige motivo escrito e fica marcado no kardex. É a exceção, não o caminho padrão.

### 7.3 Escopo de inventário

O coração do sistema.

**Abertura.** O supervisor cria a solicitação escolhendo:
- Título e prazo (ex.: "Inventário geral — agosto/2026")
- Depósito
- Responsável
- **Como selecionar os itens:** catálogo inteiro · por categoria · itens acima de X de custo (curva A) · itens não contados há N dias · lista colada de SKUs · seleção manual

Ao abrir, o sistema cria um `escopo_item` por produto e **congela o saldo de cada um**. A partir daí, movimentos normais continuam acontecendo no estoque — o congelado não muda.

**Tela: escopo aberto**
```
┌──────────────────────────────────────────────────────────────────┐
│ INV-2026-0008 · Inventário geral — agosto            EM_CONTAGEM │
│ Depósito Principal · Resp. Marina · Prazo 31/08 · Aberto 24/08   │
│                                                                  │
│  contados 128/340    divergentes 11    acuracidade 91,4%         │
│  [██████████████░░░░░░░░░░░░░░░░░░░░]  38%                        │
│                                                                  │
│  [ Adicionar itens ]  [ Cancelar escopo ]      [ Encerrar contagem ]│
├──────────────────────────────────────────────────────────────────┤
│ Filtro: Todos ▾ Pendentes  Contados  Divergentes                 │
│                                                                  │
│ ☐ SKU      Produto            Congelado  Contado  Dif.  Status   │
│ ─────────────────────────────────────────────────────────────────│
│   PAR-001  Parafuso M6 40mm        240      237    -3  ● diverg. │
│   TIN-014  Tinta acrílica 18L        3        3     0  ● ok      │
│   CAB-002  Cabo flexível 2,5        50        —     —    pendente│
└──────────────────────────────────────────────────────────────────┘
```

**Registrar contagem.** Tela de digitação rápida, otimizada para leitor de código de barras: bipa o código → foco no campo quantidade → Enter → próximo item. Sem mouse.

Cada contagem grava autor e horário. Recontar **não sobrescreve**: cria uma nova contagem com `sequencia + 1` e marca a anterior como `SUBSTITUIDA`. O histórico de tentativas fica visível.

**Editar.** Enquanto o escopo não estiver efetivado:
- Editar o escopo: título, prazo, responsável, observação, adicionar/remover itens
- Editar uma contagem: na prática, registrar nova contagem por cima (a anterior vira `SUBSTITUIDA`)

**Cancelar — em dois níveis, como você pediu:**

| Cancelamento | Efeito |
|---|---|
| **De uma contagem específica** | Aquela contagem vira `CANCELADA` com motivo. Se havia contagem anterior válida, ela volta a valer; se não, o item retorna a `PENDENTE`. O escopo segue vivo. |
| **De um item do escopo** | Item vira `CANCELADO`: sai do cálculo e não gera ajuste na efetivação. Usado para "esse produto não está mais nesse depósito". |
| **Do escopo inteiro** | Escopo vira `CANCELADO`, exige motivo. **Nenhum movimento é gerado, nenhum saldo muda.** Contagens ficam salvas como registro histórico. |

**Efetivar.** Disponível a partir de `CONFERENCIA`, só para supervisor. Antes de gravar, uma tela de confirmação mostra:

- Quantos itens serão ajustados, quantos ficaram pendentes
- Divergência total em unidades e em R$ (sobras vs. faltas)
- **Aviso de saldo alterado:** itens que se movimentaram entre a abertura e agora aparecem destacados, com o saldo congelado e o saldo atual lado a lado. O supervisor decide item a item.
- Política dos pendentes: **ignorar** (padrão, mantém saldo) ou **zerar** (só com marcação explícita)

Ao confirmar, dentro de **uma única transação**:
1. Relê o saldo atual de cada item e grava em `saldo_na_efetivacao`
2. Calcula `diferenca = quantidade_final − saldo_na_efetivacao`
3. Para cada diferença ≠ 0, cria um `movimento_estoque` tipo `AJUSTE_INVENTARIO`, com `origem_tipo = ESCOPO_ITEM`
4. Atualiza `saldo_estoque`
5. Muda o escopo para `EFETIVADO` e o trava

Se qualquer passo falhar, nada é gravado. Não existe efetivação pela metade.

### 7.4 Dashboard

Três blocos. Filtro global por período, depósito e categoria.

**Bloco 1 — Saúde do estoque**
- Valor total a custo · nº de SKUs ativos
- SKUs zerados · abaixo do mínimo · sem movimento há mais de 90 dias (capital parado)
- Curva ABC por valor, com % do valor concentrado em A
- Top 10 produtos por valor imobilizado

**Bloco 2 — Qualidade do inventário** *(o diferencial do Prumo)*
- **Acuracidade por item:** itens sem divergência ÷ itens contados
- **Acuracidade por valor:** `1 − (Σ |diferença| × custo ÷ valor total contado)` — o número que a diretoria entende
- Divergência líquida em R$: quanto sobrou vs. quanto faltou
- Top divergências, absolutas e por valor — onde investigar primeiro
- Divergência por categoria (mapa de calor) e por responsável de contagem
- Reincidência: produtos que divergiram em 2+ inventários seguidos
- Evolução da acuracidade ao longo dos inventários (linha do tempo)

**Bloco 3 — Operação**
- Escopos abertos, com % concluído e dias até o prazo
- Cobertura: % do catálogo contado nos últimos 30/90/365 dias
- Itens nunca inventariados
- Produtividade: contagens por hora, por operador
- Tempo médio entre abertura e efetivação

**Regra de leitura:** todo número do dashboard clica e leva à lista de itens que o compõem. Indicador que não abre não serve para agir.

### 7.5 Exportação

**O que exporta:** catálogo · posição de estoque · kardex (por produto ou período) · escopo com itens e divergências · contagens detalhadas com autoria · movimentos · indicadores do dashboard.

**Formatos**

| Formato | Uso | Cuidados |
|---|---|---|
| **CSV** | Interoperabilidade, importar em qualquer lugar | UTF-8 **com BOM** e separador `;` para abrir limpo no Excel pt-BR. Decimal com vírgula. |
| **XLSX** | Entrega para gestão | Uma aba por bloco (Resumo, Itens, Divergências), cabeçalho congelado, filtro automático, colunas formatadas como número/moeda |
| **JSON** | Integração com outros sistemas | Estrutura aninhada: escopo → itens → contagens |
| **XML** | Sistemas legados / ERP | Schema próprio documentado, `.xsd` versionado junto |

Regras: exportação respeita os filtros da tela; toda exportação registra em auditoria quem baixou o quê; acima de ~20 mil linhas o arquivo é gerado em segundo plano e disponibilizado por link.

---

## 8. Regras de negócio críticas

1. **Concorrência.** Efetivação e movimentos usam lock por linha de saldo dentro de transação. Duas efetivações simultâneas não podem se atropelar.
2. **Saldo negativo.** Configurável: bloquear ou apenas alertar. Ajuste de inventário **sempre** pode resultar em negativo — se a prateleira diz que não tem, o sistema não pode discordar. Negativo é sinalizado no dashboard como erro a investigar.
3. **Um produto só pode estar em um escopo ativo por vez** no mesmo depósito. Evita duas equipes contando a mesma coisa e ajustes duplicados.
4. **Contagem só entra em escopo `ABERTO` ou `EM_CONTAGEM`.** Em `CONFERENCIA`, só recontagem autorizada pelo supervisor.
5. **Contador não efetiva.** Quem conta não valida a própria divergência. Segregação de funções.
6. **Idempotência.** Botão de efetivar bloqueia após o primeiro clique e a requisição carrega uma chave de idempotência.
7. **Job de conferência.** Rotina diária compara `saldo_estoque` com a soma de `movimento_estoque` e alerta qualquer divergência de cache.

---

## 9. Fases de entrega

Cada fase é utilizável sozinha. Nada de fase que só faz sentido com a seguinte.

### Fase 0 — Fundação
- [ ] Repositório, ambientes, variáveis de configuração
- [ ] Migrações versionadas
- [ ] Login, sessão, papéis (contador/supervisor/admin)
- [ ] Layout base: sidebar, cabeçalho, tabela padrão, tokens da paleta
- [ ] Tabela de auditoria funcionando desde o primeiro commit

**Pronto quando:** um admin loga e vê uma tela vazia com a marca aplicada.

### Fase 1 — Catálogo
- [ ] CRUD de categoria
- [ ] CRUD de produto com validação de SKU e código de barras únicos
- [ ] Lista com busca, filtros e paginação
- [ ] Inativar produto (sem exclusão física)
- [ ] Importar produtos por CSV, com prévia de erros antes de gravar

**Pronto quando:** dá para carregar o catálogo real inteiro e todo produto mostra saldo 0.

### Fase 2 — Núcleo de estoque
- [ ] `movimento_estoque` append-only + atualização transacional de `saldo_estoque`
- [ ] Tela de posição de estoque
- [ ] Kardex por produto
- [ ] Movimento manual com motivo obrigatório
- [ ] Alerta de estoque mínimo
- [ ] Job de conferência saldo × soma dos movimentos

**Pronto quando:** o saldo nunca pode ser alterado por outro caminho que não um movimento.

### Fase 3 — Escopo de inventário *(a fase que define o produto)*
- [ ] Abertura com os 6 critérios de seleção
- [ ] Congelamento de saldo na abertura
- [ ] Máquina de estados completa e barrada no backend, não só na tela
- [ ] Tela do escopo com progresso e filtros
- [ ] Registro de contagem com fluxo de teclado/leitor
- [ ] Recontagem com histórico de sequência
- [ ] Cancelar contagem / cancelar item / cancelar escopo, com motivo
- [ ] Editar dados do escopo e sua lista de itens

**Pronto quando:** uma equipe consegue rodar uma contagem completa sem ninguém tocar no saldo.

### Fase 4 — Efetivação
- [ ] Tela de conferência com divergências ordenadas por impacto em R$
- [ ] Aviso de saldos movimentados desde a abertura
- [ ] Política de itens pendentes (ignorar/zerar)
- [ ] Efetivação transacional gerando `AJUSTE_INVENTARIO`
- [ ] Travamento do escopo efetivado
- [ ] Comprovante do inventário (PDF ou XLSX) com assinatura de quem efetivou

**Pronto quando:** o estoque sai do zero exclusivamente por inventário efetivado.

### Fase 5 — Dashboard
- [ ] Bloco 1 — saúde do estoque
- [ ] Bloco 2 — qualidade do inventário (acuracidade por item e por valor)
- [ ] Bloco 3 — operação
- [ ] Filtros globais e drill-down em todo indicador
- [ ] Cache dos agregados com recálculo ao efetivar

**Pronto quando:** dá para responder "meu estoque está confiável?" em menos de 10 segundos.

### Fase 6 — Exportação
- [ ] CSV com BOM e separador pt-BR
- [ ] XLSX multi-aba formatado
- [ ] JSON aninhado
- [ ] XML com `.xsd` documentado
- [ ] Geração assíncrona para volumes grandes
- [ ] Auditoria de exportações

**Pronto quando:** qualquer tela com tabela tem botão de exportar nos quatro formatos.

### Fase 7 — Acabamento
- [ ] Layout responsivo para uso no galpão (celular/tablet)
- [ ] Contagem offline com sincronização ao reconectar
- [ ] Atalhos de teclado e modo bipagem contínua
- [ ] Impressão de etiquetas de código de barras
- [ ] Notificações de escopo perto do prazo

---

## 10. Stack sugerida

Escolha uma linha e siga. Nenhuma delas muda o modelo de dados acima.

| Porte | Stack | Banco |
|---|---|---|
| Micro / interno | Python + FastAPI + HTMX, ou Laravel + Blade | SQLite (WAL ativado) |
| Pequeno/médio | Node + NestJS, ou Django + DRF, front React | PostgreSQL |
| Mobile em campo | PWA com IndexedDB para fila offline | PostgreSQL |

Recomendações independentes de stack: `NUMERIC`/`DECIMAL` para quantidade e dinheiro (nunca `float`), timestamps em UTC exibidos em fuso local, migrações versionadas desde o dia um.

---

## 11. Backlog futuro (deliberadamente fora do v1)

Multi-depósito ativo · endereçamento por rua/prateleira · lote e validade · número de série · reserva de estoque · fornecedores e ordens de compra · custo médio ponderado e PEPS · integração NF-e · inventário rotativo automático por curva ABC · dupla contagem cega obrigatória · aplicativo com coletor de dados · API pública com webhooks.

O modelo da seção 5 comporta todos eles sem reescrita — desde que os princípios da seção 3 sejam respeitados desde o começo.

---

## 12. Riscos

| Risco | Como o Prumo mitiga |
|---|---|
| Movimento durante a contagem distorce o resultado | Saldo congelado + releitura na efetivação + aviso explícito ao supervisor |
| Contagem feita com pressa e sem critério | Autoria por contagem, indicador de divergência por operador, recontagem obrigatória acima de um limite de valor |
| Alguém "consertar" o saldo por fora | Não existe caminho para isso. Movimento manual exige motivo e aparece marcado no kardex |
| Cache de saldo dessincronizar | Job diário de conferência + saldo sempre recalculável |
| Efetivação parcial por falha | Transação única, tudo ou nada, com chave de idempotência |

---

*Prumo — inventário no prumo.*
