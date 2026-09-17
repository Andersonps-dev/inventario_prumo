export type Papel = 'CONTADOR' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface Empresa {
  id: number;
  nome: string;
  ativo: boolean;
  criadoEm: string;
  _count?: { usuarios: number; produtos: number; depositos: number; escopos: number };
}

export interface UsuarioAdmin {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
  empresa: { id: number; nome: string } | null;
}

export interface RegistroAuditoria {
  id: number;
  empresaId: number | null;
  entidade: string;
  entidadeId: number;
  acao: string;
  antes: unknown;
  depois: unknown;
  usuarioId: number;
  criadoEm: string;
  usuario: { nome: string };
  empresa: { nome: string } | null;
}

export interface ListaAuditoria {
  itens: RegistroAuditoria[];
  pagina: number;
  tamanhoPagina: number;
  total: number;
}

export interface Endereco {
  id: number;
  codigo: string;
  depositoId: number;
  setor: string;
  rua: string;
  modulo: string;
  nivel: string;
  vao: string;
  interno: boolean;
  ativo: boolean;
  deposito?: { nome: string };
}

export type TipoSegmentoFaixa = 'fixo' | 'faixa';

export interface SegmentoFaixa {
  tipo: TipoSegmentoFaixa;
  valor?: string;
  inicio?: string;
  fim?: string;
  passo?: number;
}

export interface GerarFaixaPayload {
  depositoId: number;
  setor: SegmentoFaixa;
  rua: SegmentoFaixa;
  modulo: SegmentoFaixa;
  nivel: SegmentoFaixa;
  vao: SegmentoFaixa;
}

export interface GerarFaixaPrevia {
  total: number;
  novos: number;
  duplicados: number;
  amostra: string[];
}

export interface LinhaRelatorioInventario {
  data: string;
  escopoCodigo: string;
  escopoTitulo: string;
  deposito: string;
  enderecoCodigo: string;
  sku: string;
  codigoBarras: string | null;
  nome: string;
  saldoEstoque: number;
  contagem: number | null;
  diferenca: number | null;
  status: 'CONTADO' | 'PENDENTE';
}

export interface SaudeEstoque {
  valorTotalCusto: number;
  skusAtivos: number;
  skusZerados: number;
  skusAbaixoDoMinimo: number;
  semMovimento90d: number;
  curvaAbc: { classe: string; quantidadeSkus: number; valor: number; percentualDoValor: number }[];
  top10ValorImobilizado: { produtoId: number; sku: string; nome: string; saldo: number; valor: number }[];
}

export interface ItemDivergencia {
  itemId: number;
  escopoCodigo: string;
  sku: string;
  nome: string;
  diferenca: number;
  impactoReais: number;
}

export interface QualidadeInventario {
  acuraciadePorItem: number;
  acuraciadePorValor: number;
  divergenciaLiquidaReais: number;
  topDivergenciasAbsolutas: ItemDivergencia[];
  topDivergenciasValor: ItemDivergencia[];
  divergenciaPorResponsavel: { responsavel: string; unidades: number; reais: number }[];
  reincidencia: { produtoId: number; sku: string; nome: string; inventariosConsecutivosDivergentes: number }[];
  evolucaoAcuracidade: { escopoId: number; codigo: string; efetivadoEm: string; acuraciadePorItem: number; acuraciadePorValor: number }[];
}

export interface Operacao {
  escoposAbertos: { id: number; codigo: string; titulo: string; status: string; percentualConcluido: number; diasAtePrazo: number | null }[];
  cobertura: { dias: number; cobertos: number; total: number; percentual: number }[];
  itensNuncaInventariados: { id: number; sku: string; nome: string }[];
  produtividadePorOperador: { usuarioId: number; nome: string; totalContagens: number; contagensPorHora: number }[];
  tempoMedioAberturaEfetivacaoHoras: number | null;
}

export interface Deposito {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Produto {
  id: number;
  sku: string;
  codigoBarras: string | null;
  nome: string;
  unidade: string;
  precoCusto: number;
  estoqueMinimo: number;
  ativo: boolean;
  saldo: number;
  abaixoDoMinimo: boolean;
}

export interface ListaProdutos {
  itens: Produto[];
  pagina: number;
  tamanhoPagina: number;
  total: number;
}

export type StatusEscopo = 'RASCUNHO' | 'ABERTO' | 'EM_CONTAGEM' | 'CONFERENCIA' | 'EFETIVADO' | 'CANCELADO';
export type StatusEscopoItem = 'PENDENTE' | 'CONTADO' | 'CANCELADO';

export interface NotificacaoPrazo {
  id: number;
  codigo: string;
  titulo: string;
  status: StatusEscopo;
  prazo: string;
  diasAtePrazo: number | null;
}

export interface EscopoResumo {
  id: number;
  codigo: string;
  titulo: string;
  status: StatusEscopo;
  prazo: string | null;
  criadoEm: string;
  deposito: { nome: string };
  responsavel: { nome: string } | null;
  _count: { itens: number };
}

export interface Contagem {
  id: number;
  sequencia: number;
  quantidade: string;
  status: 'VALIDA' | 'SUBSTITUIDA' | 'CANCELADA';
  observacao: string | null;
  contadoEm: string;
  contadoPorUsuario?: { nome: string };
}

export interface EscopoItem {
  id: number;
  produtoId: number;
  enderecoId: number;
  saldoCongelado: string;
  saldoNaEfetivacao: string | null;
  quantidadeFinal: string | null;
  diferenca: string | null;
  status: StatusEscopoItem;
  produto: { id: number; sku: string; codigoBarras: string | null; nome: string; unidade: string; precoCusto: string };
  endereco: { id: number; codigo: string; interno: boolean };
  contagens: Contagem[];
}

export interface EscopoDetalhe {
  id: number;
  codigo: string;
  titulo: string;
  status: StatusEscopo;
  observacao: string | null;
  prazo: string | null;
  deposito: Deposito;
  responsavel: { id: number; nome: string } | null;
  criterioSelecao: { tipo: string; enderecoIds?: number[] } | null;
  itens: EscopoItem[];
}

export interface ItemConferencia {
  itemId: number;
  produtoId: number;
  sku: string;
  nome: string;
  enderecoCodigo: string;
  status: 'PENDENTE' | 'CONTADO';
  saldoCongelado: number;
  saldoAtual: number;
  saldoAlterado: boolean;
  quantidadeContada: number | null;
  diferenca: number | null;
  precoCusto: number;
  impactoReais: number;
}

export interface Conferencia {
  escopo: { id: number; codigo: string; titulo: string; status: StatusEscopo };
  itens: ItemConferencia[];
  resumo: {
    totalItens: number;
    itensContados: number;
    itensPendentes: number;
    divergenciaTotalUnidades: number;
    divergenciaTotalReais: number;
  };
}

export interface PosicaoEstoqueLinha {
  endereco_id: number;
  posicao: string;
  endereco_interno: boolean;
  produto_id: number;
  sku: string;
  nome: string;
  unidade: string;
  estoque_minimo: number;
  preco_custo: number;
  saldo: number;
  reservado: number;
  disponivel: number;
  valor_total: number;
  ultima_movimentacao: string | null;
}

export type StatusEventoVenda = 'ABERTO' | 'FECHADO';

export interface ItemRelatorioEvento {
  produtoId: number;
  sku: string;
  nome: string;
  unidade: string;
  quantidade: number;
  precoCustoUnitario: number;
  valorTotal: number;
}

export interface RelatorioFechamentoEvento {
  itens: ItemRelatorioEvento[];
  quantidadeTotal: number;
  valorTotal: number;
  fechadoEm: string;
}

// O que está reservado pro evento num (produto, endereço) real — o saldo
// nunca sai do lugar, isso é só "quanto está comprometido" ali.
export interface ItemReservaEvento {
  produto_id: number;
  sku: string;
  nome: string;
  unidade: string;
  endereco_id: number;
  posicao: string;
  endereco_interno: boolean;
  saldo: number;
  valor_total: number;
}

// Posição habilitada pra bipar item neste grêmio — escolhida na criação,
// pode ganhar mais depois com o grêmio já ABERTO.
export interface EventoVendaPosicaoInfo {
  enderecoId: number;
  codigo: string;
  interno: boolean;
}

export interface EventoVenda {
  id: number;
  titulo: string;
  dataEvento: string | null;
  status: StatusEventoVenda;
  depositoOrigemId: number;
  depositoOrigem: { nome: string };
  criadoPorUsuario: { nome: string };
  fechadoPorUsuario: { nome: string } | null;
  relatorioFechamento: RelatorioFechamentoEvento | null;
  criadoEm: string;
  fechadoEm: string | null;
  // Só vem preenchido em GET /eventos-venda/:id.
  posicoes?: EventoVendaPosicaoInfo[];
  // Só vem preenchido em GET /eventos-venda/:id, e só enquanto ABERTO —
  // o que ainda está reservado (não vendido nem devolvido).
  posicaoAtual?: ItemReservaEvento[] | null;
}

// ─────────────── Transferências entre posições ───────────────

export type StatusTransferencia = 'ABERTA' | 'EFETIVADA' | 'CANCELADA';

export interface TransferenciaResumo {
  id: number;
  codigo: string;
  status: StatusTransferencia;
  criadoEm: string;
  deposito: { nome: string };
  enderecoOrigem: { codigo: string; interno: boolean };
  enderecoDestino: { codigo: string; interno: boolean };
  criadoPorUsuario: { nome: string };
  _count: { itens: number };
}

export interface TransferenciaItem {
  id: number;
  produtoId: number;
  quantidade: string;
  produto: { id: number; sku: string; codigoBarras: string | null; nome: string; unidade: string; precoCusto: string };
}

export interface TransferenciaDetalhe {
  id: number;
  codigo: string;
  status: StatusTransferencia;
  deposito: { id: number; nome: string };
  enderecoOrigem: { id: number; codigo: string; interno: boolean };
  enderecoDestino: { id: number; codigo: string; interno: boolean };
  criadoPorUsuario: { nome: string };
  efetivadoPorUsuario: { nome: string } | null;
  canceladoPorUsuario: { nome: string } | null;
  criadoEm: string;
  efetivadoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  itens: TransferenciaItem[];
}

// ─────────────── Entrada por nota fiscal ───────────────

export type StatusEntrada = 'RASCUNHO' | 'EM_DISTRIBUICAO' | 'CONCLUIDA' | 'CANCELADA';

export interface EntradaResumo {
  id: number;
  codigo: string;
  nota: string;
  status: StatusEntrada;
  criadoEm: string;
  deposito: { nome: string };
  criadoPorUsuario: { nome: string };
  _count: { itens: number };
}

export interface EntradaItem {
  id: number;
  produtoId: number;
  quantidadeRecebida: string;
  quantidadeDistribuida: string;
  produto: { id: number; sku: string; codigoBarras: string | null; nome: string; unidade: string; precoCusto: string };
}

export interface EntradaDetalhe {
  id: number;
  codigo: string;
  nota: string;
  status: StatusEntrada;
  deposito: { id: number; nome: string };
  criadoPorUsuario: { nome: string };
  canceladoPorUsuario: { nome: string } | null;
  criadoEm: string;
  finalizadoEm: string | null;
  concluidoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  itens: EntradaItem[];
}

export interface MovimentoEstoque {
  id: number;
  tipo: string;
  quantidade: string;
  saldoAnterior: string;
  saldoPosterior: string;
  origemTipo: string | null;
  origemId: number | null;
  motivo: string | null;
  criadoEm: string;
  usuario: { nome: string };
  deposito: { nome: string };
  endereco: { codigo: string; interno: boolean };
}
