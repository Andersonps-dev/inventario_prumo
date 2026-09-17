import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  Conferencia,
  Deposito,
  Empresa,
  Endereco,
  EscopoDetalhe,
  EscopoItem,
  EscopoResumo,
  EventoVenda,
  GerarFaixaPayload,
  GerarFaixaPrevia,
  ListaAuditoria,
  LinhaRelatorioInventario,
  ListaProdutos,
  MovimentoEstoque,
  NotificacaoPrazo,
  Operacao,
  Papel,
  PosicaoEstoqueLinha,
  Produto,
  EntradaDetalhe,
  EntradaResumo,
  QualidadeInventario,
  SaudeEstoque,
  TransferenciaDetalhe,
  TransferenciaResumo,
  UsuarioAdmin,
} from './types';

// ─────────────── Endereços ───────────────

export interface FiltrosEnderecos {
  depositoId?: number;
  busca?: string;
  ativo?: boolean;
}

export function useEnderecos(filtros: FiltrosEnderecos = {}) {
  const params = new URLSearchParams();
  if (filtros.depositoId) params.set('depositoId', String(filtros.depositoId));
  if (filtros.busca) params.set('busca', filtros.busca);
  if (filtros.ativo !== undefined) params.set('ativo', String(filtros.ativo));
  const qs = params.toString();
  return useQuery({
    queryKey: ['enderecos', filtros],
    queryFn: () => apiFetch<Endereco[]>(`/enderecos${qs ? `?${qs}` : ''}`),
  });
}

export interface EnderecoFormValues {
  depositoId: number;
  setor: string;
  rua: string;
  modulo: string;
  nivel: string;
  vao: string;
}

export function useCriarEndereco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: EnderecoFormValues) => apiFetch<Endereco>('/enderecos', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enderecos'] }),
  });
}

export function useAtualizarEndereco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<EnderecoFormValues> & { ativo?: boolean } }) =>
      apiFetch<Endereco>(`/enderecos/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enderecos'] }),
  });
}

export function useExcluirEndereco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/enderecos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enderecos'] }),
  });
}

export function useGerarFaixaPrevia() {
  return useMutation({
    mutationFn: (dto: GerarFaixaPayload) => apiFetch<GerarFaixaPrevia>('/enderecos/gerar-faixa/previa', { method: 'POST', body: dto }),
  });
}

export function useGerarFaixaConfirmar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: GerarFaixaPayload) =>
      apiFetch<{ criados: number; enderecos: Endereco[] }>('/enderecos/gerar-faixa/confirmar', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enderecos'] }),
  });
}

// ─────────────── Depósitos ───────────────

// `select` filtra em cima do mesmo cache/fetch (`['depositos']`) — evita uma
// segunda chamada de rede só pra excluir os inativos das telas que criam
// algo novo (escopo, movimento, endereço), enquanto a tela de gestão de
// depósitos continua vendo a lista completa.
export function useDepositos(filtros: { ativo?: boolean } = {}) {
  return useQuery({
    queryKey: ['depositos'],
    queryFn: () => apiFetch<Deposito[]>('/depositos'),
    select: (data) => (filtros.ativo === undefined ? data : data.filter((d) => d.ativo === filtros.ativo)),
  });
}

export function useCriarDeposito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) => apiFetch<Deposito>('/depositos', { method: 'POST', body: { nome } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['depositos'] }),
  });
}

export function useAtualizarDeposito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { nome?: string; ativo?: boolean } }) =>
      apiFetch<Deposito>(`/depositos/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['depositos'] }),
  });
}

// ─────────────── Produtos ───────────────

export interface FiltrosProdutos {
  busca?: string;
  ativo?: boolean;
  abaixoDoMinimo?: boolean;
  pagina?: number;
}

export function useProdutos(filtros: FiltrosProdutos) {
  const params = new URLSearchParams();
  if (filtros.busca) params.set('busca', filtros.busca);
  if (filtros.ativo !== undefined) params.set('ativo', String(filtros.ativo));
  if (filtros.abaixoDoMinimo) params.set('abaixoDoMinimo', 'true');
  params.set('pagina', String(filtros.pagina ?? 1));

  return useQuery({
    queryKey: ['produtos', filtros],
    queryFn: () => apiFetch<ListaProdutos>(`/produtos?${params.toString()}`),
  });
}

export interface ProdutoFormValues {
  sku: string;
  codigoBarras?: string;
  nome: string;
  descricao?: string;
  unidade?: string;
  precoCusto?: number;
  estoqueMinimo?: number;
}

export function useCriarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ProdutoFormValues) => apiFetch<Produto>('/produtos', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

export function useAtualizarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<ProdutoFormValues> & { ativo?: boolean } }) =>
      apiFetch<Produto>(`/produtos/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

// ─────────────── Estoque ───────────────

export function usePosicaoEstoque(depositoId?: number) {
  return useQuery({
    queryKey: ['estoque', 'posicao', depositoId ?? null],
    queryFn: () => apiFetch<PosicaoEstoqueLinha[]>(`/estoque/posicao${depositoId ? `?depositoId=${depositoId}` : ''}`),
  });
}

export function useKardex(produtoId: number | null) {
  return useQuery({
    queryKey: ['estoque', 'kardex', produtoId],
    queryFn: () => apiFetch<MovimentoEstoque[]>(`/estoque/kardex/${produtoId}`),
    enabled: produtoId !== null,
  });
}

export function useRegistrarMovimentoManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { produtoId: number; depositoId?: number; enderecoId?: number; tipo: 'ENTRADA' | 'SAIDA'; quantidade: number; motivo: string }) =>
      apiFetch('/estoque/movimentos', { method: 'POST', body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
    },
  });
}

// ─────────────── Escopos ───────────────

export function useNotificacoesPrazo() {
  return useQuery({
    queryKey: ['escopos', 'notificacoes', 'prazo'],
    queryFn: () => apiFetch<NotificacaoPrazo[]>('/escopos/notificacoes/prazo'),
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useEscopos(status?: string) {
  return useQuery({
    queryKey: ['escopos', status],
    queryFn: () => apiFetch<EscopoResumo[]>(`/escopos${status ? `?status=${status}` : ''}`),
  });
}

export function useEscopo(id: number | null) {
  return useQuery({
    queryKey: ['escopos', id],
    queryFn: () => apiFetch<EscopoDetalhe>(`/escopos/${id}`),
    enabled: id !== null,
  });
}

export function useConferencia(id: number | null) {
  return useQuery({
    queryKey: ['escopos', id, 'conferencia'],
    queryFn: () => apiFetch<Conferencia>(`/escopos/${id}/conferencia`),
    enabled: id !== null,
  });
}

interface CriterioSelecao {
  tipo: 'CATALOGO_INTEIRO' | 'CURVA_A_CUSTO' | 'NAO_CONTADOS_HA_N_DIAS' | 'LISTA_SKUS' | 'SELECAO_MANUAL' | 'POR_ENDERECO';
  valorMinimoCusto?: number;
  dias?: number;
  skus?: string[];
  produtoIds?: number[];
  enderecoIds?: number[];
}

export function useCriarEscopo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { titulo: string; depositoId: number; responsavelId?: number; prazo?: string; observacao?: string; criterio: CriterioSelecao }) =>
      apiFetch<EscopoResumo>('/escopos', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escopos'] }),
  });
}

function useEscopoAction<TBody = void>(action: (id: number) => string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body?: TBody }) =>
      apiFetch(action(id), { method: 'POST', body: body as unknown }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['escopos'] });
      qc.invalidateQueries({ queryKey: ['escopos', variables.id] });
    },
  });
}

export interface ResultadoAbrirEscopo {
  itensCriados: number;
  ignoradosPorConflito: number;
}

export function useAbrirEscopo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch<ResultadoAbrirEscopo>(`/escopos/${id}/abrir`, { method: 'POST' }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['escopos'] });
      qc.invalidateQueries({ queryKey: ['escopos', variables.id] });
    },
  });
}

export const useEncerrarContagem = () => useEscopoAction((id) => `/escopos/${id}/encerrar-contagem`);
export const useReabrirEscopo = () => useEscopoAction((id) => `/escopos/${id}/reabrir`);
export const useCancelarEscopo = () => useEscopoAction<{ motivo: string }>((id) => `/escopos/${id}/cancelar`);
export interface ResultadoAdicionarItens {
  itensCriados: number;
  ignoradosPorConflito: number;
  itens: EscopoItem[];
}

export function useAdicionarItens() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { produtoIds?: number[]; enderecoId?: number; enderecoIds?: number[] } }) =>
      apiFetch<ResultadoAdicionarItens>(`/escopos/${id}/itens`, { method: 'POST', body }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['escopos'] });
      qc.invalidateQueries({ queryKey: ['escopos', variables.id] });
    },
  });
}
export const useEfetivarEscopo = () =>
  useEscopoAction<{ politicaPendentes: 'IGNORAR' | 'ZERAR' }>((id) => `/escopos/${id}/efetivar`);

export function useCancelarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ escopoId, itemId, motivo }: { escopoId: number; itemId: number; motivo: string }) =>
      apiFetch(`/escopos/${escopoId}/itens/${itemId}/cancelar`, { method: 'POST', body: { motivo } }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['escopos', v.escopoId] }),
  });
}

export function useCancelarContagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      escopoId,
      contagemId,
      quantidade,
      motivo,
    }: {
      escopoId: number;
      contagemId: number;
      quantidade: number;
      motivo: string;
    }) => apiFetch(`/escopos/${escopoId}/contagens/${contagemId}/cancelar`, { method: 'POST', body: { quantidade, motivo } }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['escopos', v.escopoId] }),
  });
}

// ─────────────── Dashboard ───────────────

export interface FiltrosDashboard {
  depositoId?: number;
  dataInicio?: string;
  dataFim?: string;
}

function querystringFiltros(filtros: FiltrosDashboard) {
  const params = new URLSearchParams();
  if (filtros.depositoId) params.set('depositoId', String(filtros.depositoId));
  if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
  return params.toString();
}

export function useSaudeEstoque(filtros: FiltrosDashboard) {
  const qs = querystringFiltros(filtros);
  return useQuery({
    queryKey: ['dashboard', 'saude', filtros],
    queryFn: () => apiFetch<SaudeEstoque>(`/dashboard/saude${qs ? `?${qs}` : ''}`),
  });
}

export function useQualidadeInventario(filtros: FiltrosDashboard) {
  const qs = querystringFiltros(filtros);
  return useQuery({
    queryKey: ['dashboard', 'qualidade', filtros],
    queryFn: () => apiFetch<QualidadeInventario>(`/dashboard/qualidade${qs ? `?${qs}` : ''}`),
  });
}

export function useOperacao(filtros: FiltrosDashboard) {
  const qs = querystringFiltros(filtros);
  return useQuery({
    queryKey: ['dashboard', 'operacao', filtros],
    queryFn: () => apiFetch<Operacao>(`/dashboard/operacao${qs ? `?${qs}` : ''}`),
  });
}

// ─────────────── Relatórios ───────────────

export interface FiltrosRelatorio extends FiltrosDashboard {
  escopoId?: number;
  enderecoId?: number;
}

export function useRelatorioInventario(filtros: FiltrosRelatorio) {
  const params = new URLSearchParams(querystringFiltros(filtros));
  if (filtros.escopoId) params.set('escopoId', String(filtros.escopoId));
  if (filtros.enderecoId) params.set('enderecoId', String(filtros.enderecoId));
  const qs = params.toString();
  return useQuery({
    queryKey: ['relatorios', 'inventario', filtros],
    queryFn: () => apiFetch<LinhaRelatorioInventario[]>(`/relatorios/inventario${qs ? `?${qs}` : ''}`),
  });
}

export function useRegistrarContagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ escopoId, ...dto }: { escopoId: number; escopoItemId: number; quantidade: number; observacao?: string }) =>
      apiFetch('/escopos/contagens', { method: 'POST', body: dto }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['escopos', v.escopoId] }),
  });
}

// ─────────────── Admin — Empresas ───────────────

export function useEmpresas() {
  return useQuery({ queryKey: ['empresas'], queryFn: () => apiFetch<Empresa[]>('/empresas') });
}

export function useCriarEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) => apiFetch<Empresa>('/empresas', { method: 'POST', body: { nome } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas'] }),
  });
}

export function useAtualizarEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { nome?: string; ativo?: boolean } }) =>
      apiFetch<Empresa>(`/empresas/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresas'] }),
  });
}

// ─────────────── Admin — Usuários ───────────────

export function useUsuariosAdmin() {
  return useQuery({ queryKey: ['usuarios'], queryFn: () => apiFetch<UsuarioAdmin[]>('/usuarios') });
}

export interface CriarUsuarioAdminPayload {
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
}

export function useCriarUsuarioAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CriarUsuarioAdminPayload) => apiFetch<UsuarioAdmin>('/usuarios', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

export function useAtualizarUsuarioAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { nome?: string; papel?: Papel; ativo?: boolean } }) =>
      apiFetch<UsuarioAdmin>(`/usuarios/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

// ─────────────── Admin — Auditoria ───────────────

export interface FiltrosAuditoria {
  entidade?: string;
  acao?: string;
  usuarioId?: number;
  empresaId?: number;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
}

export function useAuditoria(filtros: FiltrosAuditoria) {
  const params = new URLSearchParams();
  if (filtros.entidade) params.set('entidade', filtros.entidade);
  if (filtros.acao) params.set('acao', filtros.acao);
  if (filtros.usuarioId) params.set('usuarioId', String(filtros.usuarioId));
  if (filtros.empresaId) params.set('empresaId', String(filtros.empresaId));
  if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
  params.set('pagina', String(filtros.pagina ?? 1));
  return useQuery({
    queryKey: ['auditoria', filtros],
    queryFn: () => apiFetch<ListaAuditoria>(`/auditoria?${params.toString()}`),
  });
}

// ─────────────── Eventos de venda (feiras) ───────────────

export function useEventosVenda() {
  return useQuery({ queryKey: ['eventos-venda'], queryFn: () => apiFetch<EventoVenda[]>('/eventos-venda') });
}

export function useEventoVenda(id: number) {
  return useQuery({
    queryKey: ['eventos-venda', id],
    queryFn: () => apiFetch<EventoVenda>(`/eventos-venda/${id}`),
  });
}

// `enderecoId` é sempre uma posição do depósito de origem da feira — de
// onde tirar (ao levar/adicionar) ou pra onde devolver (ao retornar).
export interface ItemComPosicao {
  produtoId: number;
  enderecoId: number;
  quantidade: number;
}

export function useCriarEventoVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { titulo: string; dataEvento?: string; depositoOrigemId: number; enderecoIds: number[] }) =>
      apiFetch<EventoVenda>('/eventos-venda', { method: 'POST', body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos-venda'] });
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

export function useAdicionarPosicoesEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enderecoIds }: { id: number; enderecoIds: number[] }) =>
      apiFetch<EventoVenda>(`/eventos-venda/${id}/posicoes`, { method: 'POST', body: { enderecoIds } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['eventos-venda', v.id] });
      qc.invalidateQueries({ queryKey: ['eventos-venda'] });
    },
  });
}

export function useAtualizarEventoVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: number; titulo?: string; dataEvento?: string }) =>
      apiFetch<EventoVenda>(`/eventos-venda/${id}`, { method: 'PATCH', body: dto }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['eventos-venda', v.id] });
      qc.invalidateQueries({ queryKey: ['eventos-venda'] });
    },
  });
}

export function useAdicionarItemEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...item }: { id: number } & ItemComPosicao) =>
      apiFetch<EventoVenda>(`/eventos-venda/${id}/itens`, { method: 'POST', body: item }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['eventos-venda', v.id] });
      qc.invalidateQueries({ queryKey: ['eventos-venda'] });
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

export function useRegistrarRetornoItemEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...item }: { id: number } & ItemComPosicao) =>
      apiFetch<EventoVenda>(`/eventos-venda/${id}/retorno`, { method: 'POST', body: item }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['eventos-venda', v.id] });
      qc.invalidateQueries({ queryKey: ['eventos-venda'] });
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

export function useFecharEventoVenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<EventoVenda>(`/eventos-venda/${id}/fechar`, { method: 'POST' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['eventos-venda', id] });
      qc.invalidateQueries({ queryKey: ['eventos-venda'] });
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

// ─────────────── Transferências entre posições ───────────────

export function useTransferencias(status?: string) {
  return useQuery({
    queryKey: ['transferencias', status],
    queryFn: () => apiFetch<TransferenciaResumo[]>(`/transferencias${status ? `?status=${status}` : ''}`),
  });
}

export function useTransferencia(id: number) {
  return useQuery({
    queryKey: ['transferencias', id],
    queryFn: () => apiFetch<TransferenciaDetalhe>(`/transferencias/${id}`),
  });
}

export function useCriarTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { depositoId: number; enderecoOrigemId: number; enderecoDestinoId: number }) =>
      apiFetch<TransferenciaDetalhe>('/transferencias', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transferencias'] }),
  });
}

export function useBiparTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, produtoId, quantidade }: { id: number; produtoId: number; quantidade: number }) =>
      apiFetch<TransferenciaDetalhe>(`/transferencias/${id}/itens`, { method: 'POST', body: { produtoId, quantidade } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['transferencias', v.id] });
      qc.invalidateQueries({ queryKey: ['transferencias'] });
    },
  });
}

export function useEfetivarTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<TransferenciaDetalhe>(`/transferencias/${id}/efetivar`, { method: 'POST' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['transferencias', id] });
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

export function useCancelarTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      apiFetch<TransferenciaDetalhe>(`/transferencias/${id}/cancelar`, { method: 'POST', body: { motivo } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['transferencias', v.id] });
      qc.invalidateQueries({ queryKey: ['transferencias'] });
    },
  });
}

// ─────────────── Entrada por nota fiscal ───────────────

export function useEntradas(status?: string) {
  return useQuery({
    queryKey: ['entradas', status],
    queryFn: () => apiFetch<EntradaResumo[]>(`/entradas${status ? `?status=${status}` : ''}`),
  });
}

export function useEntrada(id: number) {
  return useQuery({
    queryKey: ['entradas', id],
    queryFn: () => apiFetch<EntradaDetalhe>(`/entradas/${id}`),
  });
}

export function useCriarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { nota: string; depositoId: number }) => apiFetch<EntradaDetalhe>('/entradas', { method: 'POST', body: dto }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entradas'] }),
  });
}

export function useBiparEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, produtoId, quantidade }: { id: number; produtoId: number; quantidade: number }) =>
      apiFetch<EntradaDetalhe>(`/entradas/${id}/itens`, { method: 'POST', body: { produtoId, quantidade } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['entradas', v.id] });
      qc.invalidateQueries({ queryKey: ['entradas'] });
    },
  });
}

export function useFinalizarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<EntradaDetalhe>(`/entradas/${id}/finalizar`, { method: 'POST' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['entradas', id] });
      qc.invalidateQueries({ queryKey: ['entradas'] });
    },
  });
}

export function useDistribuirEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      enderecoId,
      itens,
    }: {
      id: number;
      enderecoId: number;
      itens: { produtoId: number; quantidade: number }[];
    }) => apiFetch<EntradaDetalhe>(`/entradas/${id}/distribuir`, { method: 'POST', body: { enderecoId, itens } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['entradas', v.id] });
      qc.invalidateQueries({ queryKey: ['entradas'] });
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

export function useCancelarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      apiFetch<EntradaDetalhe>(`/entradas/${id}/cancelar`, { method: 'POST', body: { motivo } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['entradas', v.id] });
      qc.invalidateQueries({ queryKey: ['entradas'] });
    },
  });
}
