const CORES: Record<string, string> = {
  RASCUNHO: 'bg-nevoa/20 text-aco',
  ABERTO: 'bg-latao/20 text-latao-escuro',
  // Sólido (não só mais opaco que ABERTO) — numa lista de escopos, "sendo
  // contado agora" precisa se destacar de longe, não só num tom levemente
  // mais forte da mesma cor.
  EM_CONTAGEM: 'bg-latao text-aco font-semibold',
  // Antes era bg-aco/10 — quase idêntico ao cinza pálido de RASCUNHO, difícil
  // distinguir numa lista escaneada rápido. Azul-aço mais saturado destaca
  // "pronto pra decisão final" sem competir com as outras cores de status.
  CONFERENCIA: 'bg-aco text-white font-semibold',
  EFETIVADO: 'bg-conforme/15 text-conforme',
  CANCELADO: 'bg-divergente/15 text-divergente',
  PENDENTE: 'bg-nevoa/20 text-aco',
  CONTADO: 'bg-conforme/15 text-conforme',
  divergente: 'bg-divergente/15 text-divergente',
  conforme: 'bg-conforme/15 text-conforme',
  // Ações do log de execuções.
  CRIAR: 'bg-conforme/15 text-conforme',
  EDITAR: 'bg-latao/20 text-latao-escuro',
  CANCELAR: 'bg-divergente/15 text-divergente',
  EFETIVAR: 'bg-conforme/15 text-conforme',
  EXPORTAR: 'bg-nevoa/20 text-aco',
  EXCLUIR: 'bg-divergente/15 text-divergente',
  // Eventos de venda (feiras).
  FECHADO: 'bg-conforme/15 text-conforme',
};

export function Badge({ children, tom }: { children: React.ReactNode; tom: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CORES[tom] ?? 'bg-nevoa/20 text-aco'}`}>
      {children}
    </span>
  );
}
