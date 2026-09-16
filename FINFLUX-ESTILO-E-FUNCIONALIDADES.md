# FinFlux → guia de estilo e funcionalidades para reaproveitar

> Extraído do frontend real do FinFlux (`c:\Users\aaand\Documents\finflux\frontend`) em 2026-09-15,
> pra servir de referência ao implementar o mesmo estilo + funcionalidades (e mais) neste projeto.
> Não é código pra copiar e colar direto — é o "manual" do que existe, com trechos reais de classe/CSS
> pra reconstruir o mesmo look & feel numa base de código diferente.

---

## 0. Como usar este documento

1. Seção 1–4: **sistema de design** — cores, tipografia, componentes reutilizáveis, com o código real das classes Tailwind usadas no FinFlux.
2. Seção 5: **mapa de funcionalidades completo** do FinFlux — todas as 15 telas do core + as 7 telas avançadas de admin (visão, não todas implementadas ainda no FinFlux).
3. Seção 6: **ideias extras** ("e muito mais") — funcionalidades que o FinFlux *não* tem mas que fazem sentido para um SaaS financeiro, especialmente um com IA.
4. Seção 7: checklist de teste por tela (mesmo critério usado no FinFlux).

**Aviso sobre este projeto (quitei/DebAI):** o frontend daqui já tem uma identidade visual própria e diferente
(`tailwind.config.ts`: paleta `verde/ambar/coral`, fontes Inter + Playfair Display + JetBrains Mono, raio de
12px/16px/24px, sombras `card`/`card-hover`/`lg`). Este documento descreve o estilo do **FinFlux** (azul/slate,
Inter só, raio único de 12px) para você decidir: **adotar os tokens do FinFlux como estão**, ou **manter a
paleta verde/âmbar/coral do quitei mas aplicar os mesmos padrões estruturais** (mesma anatomia de sidebar,
cards, drawer, badges etc., só trocando as cores). A segunda opção costuma manter a identidade da marca; a
primeira é mais rápida. As seções abaixo têm os tokens exatos dos dois lados para essa decisão.

---

## 1. Stack técnica de referência

```json
{
  "next": "^16",                    // App Router
  "react": "18.3.1",
  "typescript": "5.5.4",
  "tailwindcss": "3.4.6",
  "@tanstack/react-query": "5.51.1", // cache/estado de dados assíncronos
  "react-hook-form": "7.52.1",
  "@hookform/resolvers": "3.9.0",
  "zod": "3.23.8",                   // validação de formulário
  "axios": "1.18.1",
  "recharts": "^3.10.1",             // gráficos
  "lucide-react": "^0.469.0"         // ícones (único pacote de ícones usado)
}
```

Sem biblioteca de componentes (nada de MUI/Chakra/shadcn) — tudo é Tailwind puro + componentes próprios pequenos.
Isso é uma decisão de estilo: dá controle total sobre o visual e mantém o bundle pequeno.

---

## 2. Tokens de design

### 2.1 Cores (`tailwind.config.ts`)

```ts
colors: {
  primary: { DEFAULT: "#2563EB", hover: "#1D4ED8" },  // azul de ação
  success: "#16A34A",   // receita / pago / positivo
  danger:  "#DC2626",   // despesa / vencido / destrutivo
  warning: "#F59E0B",   // vence hoje / atenção
  info:    "#0EA5E9",   // neutro-informativo
  surface: { DEFAULT: "#F8FAFC", dark: "#0F172A" },   // fundo da página
  card:    { DEFAULT: "#FFFFFF", dark: "#1E293B" },   // fundo de cards/painéis/dropdowns
  stroke:  { DEFAULT: "#E2E8F0", dark: "#334155" },   // bordas
},
fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
borderRadius: { card: "12px" },
```

`globals.css` (base global, 3 regras só):

```css
html, body { @apply text-surface-dark dark:text-slate-100; }
body { @apply bg-surface text-sm dark:bg-surface-dark; }
* { @apply border-stroke dark:border-stroke-dark; }
```

Regra prática: **todo texto padrão é `text-sm` (14px) globalmente** — títulos de página é que sobem pra
`text-lg`/`text-xl font-semibold`, não o corpo. Isso é o que dá a sensação "densa mas legível" (referência
Linear/Notion citada no plano). Cor de texto secundário é sempre `text-slate-500 dark:text-slate-400`.

Dark mode: `darkMode: "class"` no Tailwind + um hook `useTheme()` que aplica a classe `dark` no `<html>` e
persiste em localStorage. **Toda cor usada tem par claro/escuro** — nunca uma cor "crua" sem o `dark:` correspondente.

### 2.2 Paleta equivalente do quitei (se optar por manter a identidade atual)

```ts
verde:  { 50:"#EAF5EE", 500:"#2E8B57", 600:"#226642", 700:"#1A4F33", 900:"#0A2218" }, // primário
ambar:  { 100:"#FCEFD0", 500:"#E8A020" },  // warning/destaque
coral:  { 500:"#D95B3A", 600:"#C14A2C" },  // danger
borderRadius: { sm:"6px", DEFAULT:"10px", lg:"16px", xl:"24px" },
boxShadow: {
  card: "0 1px 3px 0 rgba(10,34,24,.08), 0 1px 2px -1px rgba(10,34,24,.08)",
  "card-hover": "0 4px 12px 0 rgba(10,34,24,.12)",
},
fontFamily: { sans: "Inter", display: "Playfair Display", mono: "JetBrains Mono" }
```

Mapeamento sugerido se for portar os componentes do FinFlux mantendo a marca do quitei:
`primary → verde.600` · `success → verde.500` · `danger → coral.600` · `warning → ambar.500` ·
`rounded-card (12px) → rounded-lg (16px) ou rounded (10px)` · adicionar sombra `card`/`card-hover` do
quitei nos componentes que no FinFlux só usam borda (o FinFlux é "flat", o quitei já tem elevação sutil —
mantenha a elevação do quitei, é mais o estilo dele).

### 2.3 Tipografia e espaçamento

- Fonte única: Inter (var CSS `--font-inter`, carregada via `next/font`), fallback `system-ui`.
- Títulos de tela: 24px/semibold (`text-2xl font-semibold`) ou 18px/semibold pra cabeçalhos de card (`text-lg font-semibold`).
- Corpo: 14px (`text-sm`). Tabelas: 13-14px, cabeçalho de tabela em `text-xs text-slate-400`.
- Legendas/hints/labels de card: `text-xs text-slate-500 dark:text-slate-400`.
- Espaçamento de conteúdo: `p-4` no mobile, `p-8` no desktop (`className="p-4 sm:p-8"` na área principal).
- Gap padrão entre elementos de um grupo: `gap-2` (8px) ou `gap-3` (12px); entre seções/cards: `gap-4` (16px)/`gap-6`.
- Container de página: sem max-width fixo em código (o plano original previa 1280px, a implementação real deixa fluido dentro do shell).

### 2.4 Layout base (shell)

```
┌───────────────────────────────────────────────┐
│ Sidebar 240px (desktop) │  Topbar 64px         │
│ fixa, bg-card, border-r │  bg-card, border-b   │
│                         ├───────────────────────┤
│ logo · nav · usuário +  │  título · busca ·     │
│ tema (rodapé)           │  + Novo · sino · ...  │
│                         ├───────────────────────┤
│                         │  main, bg-surface,     │
│                         │  p-4 sm:p-8, overflow-y│
└───────────────────────────────────────────────┘
```

- **Desktop (≥768px):** sidebar sempre visível com rótulos (sem estado "só ícone" intermediário — decisão
  consciente do FinFlux pra simplificar: ou está totalmente aberta, ou é um overlay no mobile).
- **Mobile (<768px):** sidebar vira overlay (drawer) acionado pelo ícone hambúrguer na topbar; o botão
  "+ Novo" também some do topbar e reaparece como **FAB** (botão flutuante circular `fixed bottom-6 right-6`)
  com um menu que abre pra cima.
- Item ativo do menu: `border-l-4 border-primary bg-primary/10 font-medium text-primary` (barra lateral +
  fundo tintado, não just bold).
- Header do shell reserva uma faixa opcional no topo (`bg-slate-900 text-white`, altura de banner) pra
  banners de sistema (no FinFlux: modo "acessando ambiente de outra empresa" como super-admin) — útil pra
  qualquer app multiempresa/multi-tenant com um papel de suporte/admin.

---

## 3. Biblioteca de componentes (padrões reais, com código)

Todos os componentes abaixo existem como arquivos próprios e pequenos (30–150 linhas), nada de componentes
gigantes fazendo tudo. Renomeie/traduza pro domínio do novo app, mas mantenha essa granularidade.

### 3.1 Card KPI / resumo

```tsx
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  {cards.map((c) => (
    <div key={c.label} className="rounded-card border bg-card p-4 dark:bg-card-dark">
      <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
      <p className={`mt-1 text-xl font-semibold ${c.colorClass}`}>{formatBRL(c.value)}</p>
      {c.count !== undefined && (
        <p className="text-xs text-slate-400">{c.count} {c.count === 1 ? "conta" : "contas"}</p>
      )}
    </div>
  ))}
</div>
```

Padrão: label cinza pequeno em cima, valor grande semibold embaixo (cor semântica: vermelho se vencido,
verde se recebido, âmbar se "hoje", neutro se total), contagem auxiliar opcional. Sempre em grid responsivo
2 colunas mobile → 4 desktop.

### 3.2 Badge de status (ponto colorido + texto, não pílula preenchida)

```tsx
const STATUS_CONFIG = {
  pendente: { label: "Pendente", dot: "bg-info",    text: "text-slate-600 dark:text-slate-300" },
  vencido:  { label: "Vencida",  dot: "bg-danger",  text: "text-danger" },
  pago:     { label: "Paga",     dot: "bg-success", text: "text-success" },
  cancelado:{ label: "Cancelada",dot: "bg-slate-400", text: "text-slate-400 line-through" },
};

<span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
  {cfg.label}
</span>
```

Essa é uma escolha de estilo deliberada: **badge = ponto + texto colorido**, não "pílula com fundo
colorido" (mais comum em outros sistemas). Fica mais discreto em tabelas densas.

### 3.3 Tabela com filtros, seleção múltipla e linha clicável

Anatomia (ex.: tela "Contas a pagar"):

1. Linha de cards KPI (3.1).
2. Barra de filtros: navegador de mês (`‹ Setembro 2026 ›`), abas de status (Todas/Pendentes/Vencidas/Pagas),
   selects de categoria/pessoa, busca por texto, botão "Exportar CSV".
3. `<table>` HTML puro (sem lib de tabela): checkbox na 1ª coluna, badge de status, colunas de dado, valor
   sempre alinhado à direita e em negrito, coluna de ações por último.
4. Linha inteira é clicável (`onClick` abre o drawer) exceto a célula do checkbox (`onClick={(e) => e.stopPropagation()}`).
5. Estado visual por linha: vencida → `bg-danger/5`; já paga/concluída → `text-slate-400` (esmaecida).
6. Seleção múltipla → **barra flutuante fixa embaixo, centralizada** (não no topo):

```tsx
<div className="sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-card border bg-card px-4 py-2.5 shadow-lg dark:bg-card-dark">
  <span className="text-sm font-medium">{count} selecionados</span>
  <button className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover">Baixar todos</button>
  <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10">Excluir</button>
  <button className="text-sm text-slate-400 hover:text-slate-600">Fechar</button>
</div>
```

7. Navegador de mês (reutilizável em qualquer tela com corte temporal):

```tsx
<div className="flex items-center gap-1 text-sm font-medium">
  <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={16} /></button>
  <span className="w-40 text-center">{formatMonthLabel(month)}</span>
  <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={16} /></button>
</div>
```

### 3.4 Drawer lateral (edição/detalhe) vs. Modal (criação rápida) — quando usar cada um

- **Modal centralizado** (560px, overlay escuro `bg-black/40`) → para **criar** algo rápido a partir de
  qualquer lugar do sistema (ex.: "Novo lançamento"). Fecha com Esc, X ou clique fora.
- **Drawer lateral** (desliza da direita, ocupa a altura toda) → para **ver/editar o detalhe** de um item já
  existente ao clicar numa linha de tabela ou card (histórico, abas, ações contextuais como "Marcar como pago").
- Ambos: `Esc` fecha (hook de `keydown` no `useEffect`), header com título + X, footer com ações
  (`Cancelar` ghost à esquerda dos primários, ação principal em `bg-primary` à direita).
- Modal de criação sempre tem 3 botões no rodapé: **Cancelar** (ghost) · **Salvar** (primário) ·
  **Salvar e criar outro** (secundário) — atalho pra quem está cadastrando vários itens em sequência.

### 3.5 Confirmação destrutiva (dialog pequeno, não drawer/modal genérico)

```tsx
<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-black/40" onClick={onClose} />
  <div className="relative w-full max-w-sm rounded-card bg-card p-5 shadow-xl dark:bg-card-dark">
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-danger/10 text-danger">
      <AlertTriangle size={18} />
    </div>
    <h2 className="mt-3 text-base font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    {/* Cancelar (ghost) · Excluir (bg-danger) */}
  </div>
</div>
```

Regra do FinFlux (vale a pena copiar): **toda ação irreversível pede confirmação com este componente; toda
ação reversível (cancelar, inativar) não pede — só dá toast com "Desfazer".** Isso evita fadiga de cliques
em confirmação e reserva o "atrito" pra quando realmente importa.

### 3.6 Toast (canto inferior direito, um de cada vez, com "Desfazer")

```tsx
<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  <div className="flex items-center gap-2 rounded-card border bg-card px-4 py-3 text-sm shadow-lg dark:bg-card-dark border-success/30 text-success">
    <CheckCircle2 size={16} />
    <span className="text-surface-dark dark:text-slate-100">Lançamento criado</span>
    <button className="text-sm font-semibold text-primary hover:underline">Desfazer</button>
    <button aria-label="Fechar"><X size={14} /></button>
  </div>
</div>
```

Decisão importante documentada no próprio código-fonte (comentário original): **empilhar múltiplos toasts
foi rejeitado de propósito** — com mais de um toast na tela ao mesmo tempo, fica ambíguo qual botão
"Desfazer" desfaz qual ação, risco real de clicar errado. O FinFlux mostra **só um toast por vez** (o novo
substitui o anterior). Auto-dismiss em 5s. Variantes: `success` (verde) / `error` (vermelho) / `info` (azul).

### 3.7 Empty state

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
  <Inbox className="text-slate-300 dark:text-slate-600" size={40} />
  <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
  <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover">
    <Plus size={16} /> {ctaLabel}
  </button>
</div>
```

Ícone cinza claro + mensagem curta + botão de ação primária (nunca um empty state sem saída). Usado em toda
lista vazia (tabelas, listas de freelancers, empresas no admin, etc.).

### 3.8 Formulário — input padrão, campo monetário BR, toggle, select com busca

```tsx
// classe base de TODO input/select do sistema
const FIELD_CLASS = "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-primary dark:bg-surface-dark";
const FIELD_ERROR_CLASS = "border-danger";

// wrapper padrão: label + campo + erro/hint
<div>
  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
  {children}
  {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
</div>
```

Campo monetário: prefixo "R$" fixo à esquerda (`pointer-events-none absolute left-3`), digitação **da
direita pra esquerda como centavos** (padrão Nubank/Organizze — usuário digita "12345" e vê "R$ 123,45"),
alinhado à direita dentro do input.

Toggle (switch) — não checkbox nativo, componente próprio:

```tsx
<button role="switch" aria-checked={checked}
  className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}>
  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
</button>
```

Toggles condicionais (padrão "Omie" citado no plano): um toggle que, quando ligado, **revela campos extras
logo abaixo dele** dentro do mesmo bloco (ex.: "Repetir?" → mostra select de recorrência; "Já pago?" → mostra
data de pagamento). Evita formulário longo por padrão, mas não esconde nada atrás de outra tela.

Validação: `react-hook-form` + `zod`, erros inline em vermelho abaixo do campo (nunca em toast/alert).

### 3.9 Skeleton de carregamento

```tsx
<div className="animate-pulse space-y-4">
  <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-card border bg-card dark:bg-card-dark" />)}
  </div>
  <div className="h-64 rounded-card border bg-card dark:bg-card-dark" />
</div>
```

Skeleton reflete a forma real do conteúdo que vai carregar (título + linha de cards + bloco grande), não um
spinner genérico.

### 3.10 Menu dropdown (novo item, notificações, usuário)

Mesmo padrão em todo lugar: `absolute` + `z-20` + `mt-2` + `rounded-card border bg-card shadow-lg
dark:bg-card-dark`, fechado por um hook `useClickOutside`. Sino de notificação com badge numérico:

```tsx
<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
  {naoLidas > 9 ? "9+" : naoLidas}
</span>
```

### 3.11 Onboarding / tour guiado

O FinFlux tem um `TourOverlay` + `useTour()` com passos marcados via atributo `data-tour="id-do-elemento"`
nos componentes reais (ex.: `data-tour="novo-lancamento-btn"`), disparável a qualquer momento por um ícone de
lâmpada na topbar ("Rever tour guiado"). Vale a pena replicar esse padrão: **tour aponta pra elementos reais
da UI via atributo, não pra uma cópia genérica** — evita tour ficar dessincronizado do layout real.

---

## 4. Convenções gerais de interação

- **Formatação BR sempre**: `R$ 1.234,56`, datas `dd/mm/aaaa`, semana começa segunda. Centralizado em
  `lib/format.ts` (funções `formatBRL`, `formatDateBR`, `todayISO` etc.) — nunca formatado inline em cada componente.
- **Teclado**: `Esc` fecha modal/drawer/dialog; `Enter` salva formulário; `Tab` navega previsível.
- **Confirmação vs. toast**: destrutivo e irreversível → dialog de confirmação (3.5); reversível → toast com
  desfazer (3.6); nada acontece "silenciosamente".
- **Responsivo real, não só "não quebra"**: breakpoints principais em 768px (sidebar ↔ hambúrguer) e 1024px;
  tabelas densas viram listas de cards no mobile em telas onde faz sentido (ex.: admin de usuários).
- **Estados obrigatórios em toda tela de lista**: loading (skeleton) · vazio (empty state ilustrado) · erro ·
  conteúdo — as 4 variações, sempre.
- **Números sempre batem**: total dos cards de resumo = soma exata da tabela filtrada abaixo (não são fontes
  de dado independentes).
- Multiempresa / multi-tenant: todo dado carrega um `empresa_id` (ou equivalente), todo filtro de backend
  aplica esse escopo automaticamente — nunca opcional, nunca por tela.

---

## 5. Mapa de funcionalidades do FinFlux (o que existe, módulo a módulo)

### 5.1 Modelo de acesso

- Multiempresa com administração central: **não existe cadastro público** — empresas e usuários só são
  criados por um `super_admin`, via painel `/admin` separado do sistema de negócio.
- Papéis: `super_admin` (sem empresa própria, gerencia empresas/usuários, pode "Acessar ambiente" de
  qualquer empresa pra suporte, com banner fixo avisando o modo) · `usuario` (pertence a exatamente 1 empresa,
  sem hierarquia extra dentro dela).
- Regra de permissão simples e forte: **excluir permanentemente é exclusivo do super_admin**; usuário comum só
  tem ações reversíveis (cancelar, inativar), nunca "apagar de vez" — nem em ação única nem em lote.
- Isolamento de dados: banco único compartilhado, toda tabela de negócio com `empresa_id`, todo query do
  backend filtrado por isso.

### 5.2 Entidades principais

| Entidade | Campos-chave |
|---|---|
| Empresa | razão social, nome fantasia, CNPJ, status (ativa/suspensa) |
| Usuário | nome, e-mail, senha, role, empresa_id (null só pro super_admin), ativo, último acesso |
| Lançamento | tipo (pagar/receber), descrição, valor, vencimento, data pagamento, status, categoria, pessoa, recorrência (nenhuma/mensal/semanal/parcelado N×), anexos, observações, flags de imposto/nota fiscal |
| Freelancer | nome, doc, contato, área, PIX, valor de diária padrão, status |
| Diária | freelancer, data, valor, status pago/não pago, vínculo com o lançamento gerado no fechamento |
| Categoria | nome, tipo (receita/despesa), cor, ícone |
| Pessoa (cliente/fornecedor) | nome, documento, contato, ativo |
| ConfigTributária | regime, anexo, fator R, folha 12 meses, alíquotas por faixa |
| Notificação | tipo, título, mensagem, referência, lida, data |
| RegraAlerta | evento, dias antes, canal, ativa |

### 5.3 Telas do core de negócio (1–15)

1. **Shell** — sidebar + topbar + tema + responsivo + toast (base de tudo).
2. **Modal "Novo lançamento"** — componente central reutilizado em várias telas; toggle despesa/receita muda
   a cor do cabeçalho; campos condicionais (recorrência, já pago, nota fiscal, entra no imposto).
3. **Contas a Pagar** — cards de resumo (vencidas/hoje/próx. 7 dias/total mês), filtros + abas de status,
   tabela com seleção múltipla, drawer de detalhe com "Marcar como pago" (data, juros/desconto).
4. **Contas a Receber** — mesma estrutura + badge "Base do imposto" + card "imposto estimado sobre o
   recebido" linkando pra tela de Impostos + botão "Enviar cobrança" (stub).
5. **Cadastros** — abas Categorias (chips ícone+cor)/Clientes/Fornecedores (tabela + drawer).
6. **Freelancers** — lista com cards de resumo, ficha em drawer com abas Diárias/Pagamentos/Dados, "+ Lançar
   diária" rápido.
7. **Fechar pagamento de freelancers** — agrupa diárias pendentes por período escolhido na hora (semana/mês/
   personalizado) → gera 1 conta a pagar; ao baixá-la, as diárias vinculadas viram "pago" automaticamente.
8. **Configuração tributária** (Simples Nacional) — anexo III/V, Fator R, tabela de alíquotas editável,
   preferências de vencimento/alerta/regime caixa-competência.
9. **Impostos** — hero card com imposto estimado do mês + vencimento + faixa/alíquota, memória de cálculo
   expansível, gráfico 12 meses, tabela anual de apuração.
10. **Alertas e Notificações** — sino com dropdown (todas/não lidas), página de regras de alerta configuráveis
    (X dias antes, vencido, limite de faixa, job atrasado), banner no dashboard.
11. **Dashboard** — grid de 12 colunas: banner de alertas, 4 KPIs com variação %, gráfico de fluxo de caixa
    (realizado/projetado), card de imposto, próximos vencimentos, resumo de freelancers, donut de despesas
    por categoria, receita por cliente, últimas movimentações.
12. **Fluxo de caixa** — extrato dia a dia com saldo acumulado, projeção dos dias futuros em cinza/itálico,
    alerta de saldo negativo projetado, gráfico de linha 90 dias.
13. **Login** — sem cadastro público, sem "esqueci senha" autosserviço (reset é só via admin).
14. **Admin: Empresas** — CRUD enxuto fora do shell de negócio, drawer de resumo, link pra usuários da empresa.
15. **Admin: Usuários** — filtro por empresa, geração de senha temporária copiável, reset forçando troca no
    próximo login.

### 5.4 Visão de painel de controle remoto (telas 16–22 — planejadas, não todas construídas)

Princípio: **qualquer ação que hoje exigiria terminal/SSH/acesso direto ao banco vira um botão no admin**,
com confirmação, log de auditoria e resultado visível.

- **16 — Central de Saúde**: status de API/banco/uptime, erros 5xx recentes, "pulso" de uso (empresas ativas,
  logins nas últimas 24h).
- **17 — Auditoria**: trilha imutável de quem fez o quê (toda ação sensível gera linha automaticamente, não é
  opcional); filtros + exportação CSV.
- **18 — Backups & Manutenção**: listar/gerar/restaurar backup (restauração com confirmação dupla + digitar
  nome pra confirmar), banner de manutenção agendável, status da última migração de banco.
- **19 — Config. Globais & Feature Flags**: toggles de comportamento sem deploy, escopo global ou por empresa,
  tudo auditado.
- **20 — Comunicados/Broadcast**: aviso pra todas as empresas ou uma específica, aparece como banner
  dispensável dentro do sistema de negócio.
- **21 — Segurança & Sessões**: sessões ativas com "encerrar", encerrar todas de uma empresa, log de login
  malsucedido, espaço reservado pra 2FA obrigatório do super-admin.
- **22 — Central de Ações Operacionais**: lista **fechada** (nunca comando livre) de ações pré-aprovadas com
  botão "Executar" + confirmação + resultado + log de auditoria — é isso que torna seguro dar esse poder
  remotamente.
- Requisito transversal: painel admin 100% usável no celular, PWA instalável, push notification pra eventos
  críticos, 2FA obrigatório antes de expor fora da rede local.

---

## 6. "E muito mais" — funcionalidades que o FinFlux não tem mas fazem sentido pra você

Pensando especificamente num SaaS financeiro com IA (que é o perfil deste projeto, DebAI/quitei), algumas
extensões naturais do que está no FinFlux:

**Sobre os lançamentos e fluxo de caixa**
- Conciliação bancária (importar OFX/CSV do banco, casar automaticamente com lançamentos existentes).
- Categorização automática por IA a partir da descrição (com "categoria sugerida" editável, não forçada).
- Anexo de comprovante com OCR: extrair valor/data/fornecedor de uma nota/boleto fotografado e pré-preencher o modal.
- Múltiplas contas bancárias/carteiras com saldo por conta (o FinFlux removeu isso de propósito; avalie se
  faz sentido pro seu caso — é uma decisão de produto, não técnica).
- Regras de recorrência mais ricas: recorrência com data-fim, pular feriados/fins de semana automaticamente.

**Sobre cobrança (fits no domínio de um app de "quitar dívidas")**
- Geração de link de pagamento/boleto/Pix cobrança (o FinFlux só tem o botão stub "Enviar cobrança").
- Negociação assistida por IA: sugestão de parcelamento/desconto dentro de política definida pelo usuário.
- Régua de cobrança automática (WhatsApp/e-mail/SMS) com templates e horários configuráveis — o FinFlux só
  previa "canal WhatsApp desabilitado, em breve"; dá pra ir além disso.
- Score de risco do devedor/cliente com histórico de atraso.

**Sobre impostos/compliance**
- Suporte a mais de um regime tributário (Lucro Presumido, MEI), não só Simples Nacional Anexo III/V.
- Emissão de nota fiscal integrada (hoje o FinFlux só guarda a flag "nota emitida", não emite).
- Alertas de mudança de legislação/alíquota.

**Sobre IA no produto (diferencial natural pro DebAI)**
- Assistente conversacional pra perguntas tipo "quanto vou pagar de imposto se eu faturar mais R$ 10k esse
  mês?" ou "resuma meu fluxo de caixa dos últimos 3 meses".
- Detecção de anomalias (lançamento fora do padrão, duplicado, gasto muito acima da média da categoria).
- Previsão de fluxo de caixa com IA (além da projeção linear simples que o FinFlux faz a partir dos pendentes).
- Resumo automático em linguagem natural no dashboard ("Este mês você gastou 20% a mais em Marketing que a
  média dos últimos 6 meses").

**Sobre colaboração e escala**
- Papéis intermediários dentro de uma empresa (hoje o FinFlux só tem "usuário == usuário", todos iguais) —
  ex.: financeiro vs. sócio (visualização) vs. contador (acesso a impostos apenas).
- Comentários/menções em um lançamento (auditoria colaborativa, não só individual).
- Webhooks/API pública + chaves de API, pra integrar com outras ferramentas.
- App mobile nativo ou PWA completo (o FinFlux só planeja PWA pro admin, não pro app de negócio).

**Sobre onboarding**
- Import inicial em massa (CSV) de lançamentos/clientes/fornecedores ao criar uma empresa nova, em vez de
  cadastro manual um a um.
- Checklist de configuração inicial guiado (o tour do FinFlux é só explicativo, não force o preenchimento
  de config tributária/categorias antes de liberar o resto).

---

## 7. Checklist de teste por tela (mesmo critério do FinFlux — reaproveitar)

- [ ] Responsivo em 1440 / 1024 / 768 / 375px
- [ ] Dark mode sem cor "quebrada" (toda cor tem par `dark:`)
- [ ] Empty state, loading (skeleton) e erro aparecem de verdade
- [ ] Máscaras BR (R$ e data) funcionam ao digitar e ao colar
- [ ] Ações destrutivas pedem confirmação; ações concluídas mostram toast
- [ ] Teclado: Esc fecha modal/drawer, Enter salva, Tab navega
- [ ] Os números batem: totais dos cards = soma da tabela filtrada
