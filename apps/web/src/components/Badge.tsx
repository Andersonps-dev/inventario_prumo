// Ponto colorido + texto — não pílula preenchida. Deliberado: numa tabela
// densa (escopos, produtos, auditoria) isso fica mais discreto e ainda assim
// legível de longe. Duas exceções mantêm font-semibold porque o estado
// precisa se destacar mais que os outros numa lista escaneada rápido:
// EM_CONTAGEM (trabalho ativo agora) e CONFERENCIA (pronto pra decisão final).
const CORES: Record<string, string> = {
  RASCUNHO: 'text-muted',
  ABERTO: 'text-warning',
  EM_CONTAGEM: 'text-primary font-semibold',
  CONFERENCIA: 'text-info font-semibold',
  EFETIVADO: 'text-success',
  CANCELADO: 'text-muted line-through',
  PENDENTE: 'text-muted',
  CONTADO: 'text-success',
  divergente: 'text-danger',
  conforme: 'text-success',
  // Ações do log de execuções.
  CRIAR: 'text-success',
  EDITAR: 'text-warning',
  CANCELAR: 'text-danger',
  EFETIVAR: 'text-success',
  EXPORTAR: 'text-muted',
  EXCLUIR: 'text-danger',
  // Eventos de venda (feiras).
  FECHADO: 'text-success',
  // Transferências e entradas.
  ABERTA: 'text-warning',
  EFETIVADA: 'text-success',
  CANCELADA: 'text-muted line-through',
  EM_DISTRIBUICAO: 'text-primary font-semibold',
  CONCLUIDA: 'text-success',
};

const PONTOS: Record<string, string> = {
  RASCUNHO: 'bg-muted',
  ABERTO: 'bg-warning',
  EM_CONTAGEM: 'bg-primary',
  CONFERENCIA: 'bg-info',
  EFETIVADO: 'bg-success',
  CANCELADO: 'bg-muted',
  PENDENTE: 'bg-muted',
  CONTADO: 'bg-success',
  divergente: 'bg-danger',
  conforme: 'bg-success',
  CRIAR: 'bg-success',
  EDITAR: 'bg-warning',
  CANCELAR: 'bg-danger',
  EFETIVAR: 'bg-success',
  EXPORTAR: 'bg-muted',
  EXCLUIR: 'bg-danger',
  FECHADO: 'bg-success',
  ABERTA: 'bg-warning',
  EFETIVADA: 'bg-success',
  CANCELADA: 'bg-muted',
  EM_DISTRIBUICAO: 'bg-primary',
  CONCLUIDA: 'bg-success',
};

export function Badge({ children, tom }: { children: React.ReactNode; tom: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${CORES[tom] ?? 'text-muted'}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PONTOS[tom] ?? 'bg-muted'}`} />
      {children}
    </span>
  );
}
