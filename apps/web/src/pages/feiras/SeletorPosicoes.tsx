import { useMemo, useState } from 'react';
import { Input, Select } from '../../components/Input';
import { useEnderecos } from '../../api/hooks';

/**
 * Checklist de endereços de um depósito, com filtro por código/setor/rua/
 * módulo/nível e "selecionar todos os filtrados" — mesma estrutura do
 * critério POR_ENDERECO em NovoEscopoModal.tsx, reaproveitada aqui pra
 * escolher as posições habilitadas de um grêmio (na criação e ao ampliar).
 */
export function SeletorPosicoes({
  depositoId,
  selecionados,
  onChange,
  excluirIds,
}: {
  depositoId: number | '';
  selecionados: Set<number>;
  onChange: (novo: Set<number>) => void;
  /** Endereços que já são posição do grêmio (na tela de "adicionar mais") — somem da lista. */
  excluirIds?: Set<number>;
}) {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroRua, setFiltroRua] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');

  const { data: enderecosDoDeposito } = useEnderecos({ depositoId: depositoId ? Number(depositoId) : undefined, ativo: true });

  const enderecosBase = useMemo(
    () => (enderecosDoDeposito ?? []).filter((e) => !excluirIds?.has(e.id)),
    [enderecosDoDeposito, excluirIds],
  );

  const setoresDisponiveis = useMemo(() => [...new Set(enderecosBase.map((e) => e.setor))].sort(), [enderecosBase]);
  const ruasDisponiveis = useMemo(() => [...new Set(enderecosBase.map((e) => e.rua))].sort(), [enderecosBase]);
  const modulosDisponiveis = useMemo(() => [...new Set(enderecosBase.map((e) => e.modulo))].sort(), [enderecosBase]);
  const niveisDisponiveis = useMemo(() => [...new Set(enderecosBase.map((e) => e.nivel))].sort(), [enderecosBase]);

  const enderecosFiltrados = useMemo(
    () =>
      enderecosBase.filter(
        (e) =>
          (!filtroCodigo || e.codigo.toLowerCase().includes(filtroCodigo.trim().toLowerCase())) &&
          (!filtroSetor || e.setor === filtroSetor) &&
          (!filtroRua || e.rua === filtroRua) &&
          (!filtroModulo || e.modulo === filtroModulo) &&
          (!filtroNivel || e.nivel === filtroNivel),
      ),
    [enderecosBase, filtroCodigo, filtroSetor, filtroRua, filtroModulo, filtroNivel],
  );

  const alternar = (id: number) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    onChange(novo);
  };

  const selecionarTodosFiltrados = () => {
    const novo = new Set(selecionados);
    for (const e of enderecosFiltrados) novo.add(e.id);
    onChange(novo);
  };

  const limparSelecaoFiltrados = () => {
    const novo = new Set(selecionados);
    for (const e of enderecosFiltrados) novo.delete(e.id);
    onChange(novo);
  };

  if (!depositoId) return <div className="text-xs text-muted">Selecione um depósito primeiro.</div>;

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Buscar por código do endereço…" value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}>
          <option value="">Setor: todos</option>
          {setoresDisponiveis.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={filtroRua} onChange={(e) => setFiltroRua(e.target.value)}>
          <option value="">Rua: todas</option>
          {ruasDisponiveis.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}>
          <option value="">Módulo: todos</option>
          {modulosDisponiveis.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
          <option value="">Nível: todos</option>
          {niveisDisponiveis.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted">
          {enderecosFiltrados.length} endereço(s) {filtroCodigo || filtroSetor || filtroRua || filtroModulo || filtroNivel ? 'no filtro' : 'no depósito'}
        </span>
        <div className="flex gap-3">
          <button type="button" className="text-primary hover:underline" onClick={selecionarTodosFiltrados}>
            Selecionar todos
          </button>
          <button type="button" className="text-muted hover:underline" onClick={limparSelecaoFiltrados}>
            Limpar
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border border-stroke/30">
        {enderecosFiltrados.map((e) => (
          <label key={e.id} className="flex items-center gap-2 border-b border-stroke/10 px-3 py-2 text-sm last:border-0 hover:bg-surface">
            <input type="checkbox" checked={selecionados.has(e.id)} onChange={() => alternar(e.id)} />
            <span className="font-mono text-xs text-muted">{e.codigo}</span>
          </label>
        ))}
        {enderecosFiltrados.length === 0 && (
          <div className="px-3 py-3 text-sm text-muted">
            {enderecosBase.length > 0 ? 'Nenhum endereço para esse filtro.' : 'Nenhum endereço disponível neste depósito.'}
          </div>
        )}
      </div>
    </div>
  );
}
