import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCriarEscopo, useDepositos, useEnderecos, useProdutos } from '../../api/hooks';
import { ApiError } from '../../api/client';

type TipoCriterio =
  | 'CATALOGO_INTEIRO'
  | 'CURVA_A_CUSTO'
  | 'NAO_CONTADOS_HA_N_DIAS'
  | 'LISTA_SKUS'
  | 'SELECAO_MANUAL'
  | 'POR_ENDERECO';

const CRITERIOS: { valor: TipoCriterio; rotulo: string }[] = [
  { valor: 'CATALOGO_INTEIRO', rotulo: 'Catálogo inteiro' },
  { valor: 'CURVA_A_CUSTO', rotulo: 'Itens acima de X de custo (curva A)' },
  { valor: 'NAO_CONTADOS_HA_N_DIAS', rotulo: 'Não contados há N dias' },
  { valor: 'LISTA_SKUS', rotulo: 'Lista colada de SKUs' },
  { valor: 'SELECAO_MANUAL', rotulo: 'Seleção manual (buscar produtos)' },
  { valor: 'POR_ENDERECO', rotulo: 'Por endereço (contagem cíclica)' },
];

export function NovoEscopoModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data: depositos } = useDepositos({ ativo: true });
  const criar = useCriarEscopo();

  const [titulo, setTitulo] = useState('');
  const [depositoId, setDepositoId] = useState<number | ''>('');
  const [prazo, setPrazo] = useState('');
  const [tipoCriterio, setTipoCriterio] = useState<TipoCriterio>('CATALOGO_INTEIRO');
  const [valorMinimoCusto, setValorMinimoCusto] = useState(0);
  const [dias, setDias] = useState(30);
  const [skusTexto, setSkusTexto] = useState('');
  const [produtoIdsSelecionados, setProdutoIdsSelecionados] = useState<Set<number>>(new Set());
  const [buscaProdutos, setBuscaProdutos] = useState('');
  const [enderecoIds, setEnderecoIds] = useState<Set<number>>(new Set());
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroRua, setFiltroRua] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const { data: enderecosDoDeposito } = useEnderecos({ depositoId: depositoId ? Number(depositoId) : undefined, ativo: true });

  const setoresDisponiveis = useMemo(
    () => [...new Set((enderecosDoDeposito ?? []).map((e) => e.setor))].sort(),
    [enderecosDoDeposito],
  );
  const ruasDisponiveis = useMemo(
    () => [...new Set((enderecosDoDeposito ?? []).map((e) => e.rua))].sort(),
    [enderecosDoDeposito],
  );
  const modulosDisponiveis = useMemo(
    () => [...new Set((enderecosDoDeposito ?? []).map((e) => e.modulo))].sort(),
    [enderecosDoDeposito],
  );
  const niveisDisponiveis = useMemo(
    () => [...new Set((enderecosDoDeposito ?? []).map((e) => e.nivel))].sort(),
    [enderecosDoDeposito],
  );
  const enderecosFiltrados = useMemo(
    () =>
      (enderecosDoDeposito ?? []).filter(
        (e) =>
          (!filtroCodigo || e.codigo.toLowerCase().includes(filtroCodigo.trim().toLowerCase())) &&
          (!filtroSetor || e.setor === filtroSetor) &&
          (!filtroRua || e.rua === filtroRua) &&
          (!filtroModulo || e.modulo === filtroModulo) &&
          (!filtroNivel || e.nivel === filtroNivel),
      ),
    [enderecosDoDeposito, filtroCodigo, filtroSetor, filtroRua, filtroModulo, filtroNivel],
  );
  const { data: produtosBusca } = useProdutos({
    ativo: true,
    pagina: 1,
    busca: buscaProdutos.trim() || undefined,
  });

  const alternarEndereco = (id: number) => {
    setEnderecoIds((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  // Opera sobre os endereços filtrados na tela, não sobre todo o depósito —
  // é o comportamento esperado quando se combina filtro + seleção em massa.
  const selecionarTodosFiltrados = () => {
    setEnderecoIds((atual) => {
      const novo = new Set(atual);
      for (const e of enderecosFiltrados) novo.add(e.id);
      return novo;
    });
  };

  const limparSelecaoFiltrados = () => {
    setEnderecoIds((atual) => {
      const novo = new Set(atual);
      for (const e of enderecosFiltrados) novo.delete(e.id);
      return novo;
    });
  };

  const alternarProduto = (id: number) => {
    setProdutoIdsSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!depositoId) return;
    try {
      const criterio =
        tipoCriterio === 'CURVA_A_CUSTO'
          ? { tipo: tipoCriterio, valorMinimoCusto }
          : tipoCriterio === 'NAO_CONTADOS_HA_N_DIAS'
            ? { tipo: tipoCriterio, dias }
            : tipoCriterio === 'LISTA_SKUS'
              ? { tipo: tipoCriterio, skus: skusTexto.split(/[\s,;]+/).filter(Boolean) }
              : tipoCriterio === 'SELECAO_MANUAL'
                ? { tipo: tipoCriterio, produtoIds: [...produtoIdsSelecionados] }
                : tipoCriterio === 'POR_ENDERECO'
                  ? { tipo: tipoCriterio, enderecoIds: [...enderecoIds] }
                  : { tipo: tipoCriterio };

      const escopo = await criar.mutateAsync({
        titulo,
        depositoId: Number(depositoId),
        prazo: prazo || undefined,
        criterio,
      });
      onClose();
      navigate(`/escopos/${escopo.id}`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar o escopo.');
    }
  };

  return (
    <Modal title="Novo escopo de inventário" onClose={onClose} largura="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input required placeholder="Inventário geral — agosto/2026" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Depósito">
            <Select required value={depositoId} onChange={(e) => setDepositoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione…</option>
              {depositos?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prazo">
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Field>
        </div>

        <Field label="Como selecionar os itens">
          <Select value={tipoCriterio} onChange={(e) => setTipoCriterio(e.target.value as TipoCriterio)}>
            {CRITERIOS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </Select>
        </Field>

        {tipoCriterio === 'CURVA_A_CUSTO' && (
          <Field label="Custo mínimo (R$)">
            <Input type="number" step="0.01" min={0} value={valorMinimoCusto} onChange={(e) => setValorMinimoCusto(Number(e.target.value))} />
          </Field>
        )}
        {tipoCriterio === 'NAO_CONTADOS_HA_N_DIAS' && (
          <Field label="Dias sem contagem">
            <Input type="number" min={1} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
          </Field>
        )}
        {tipoCriterio === 'LISTA_SKUS' && (
          <Field label="SKUs (separados por vírgula, espaço ou quebra de linha)">
            <textarea
              className="rounded-md border border-stroke/50 px-3 py-2 text-sm"
              rows={3}
              value={skusTexto}
              onChange={(e) => setSkusTexto(e.target.value)}
            />
          </Field>
        )}
        {tipoCriterio === 'SELECAO_MANUAL' && (
          <Field label={`Produtos${produtoIdsSelecionados.size > 0 ? ` (${produtoIdsSelecionados.size} selecionado(s))` : ''}`}>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Buscar por SKU ou nome…"
                value={buscaProdutos}
                onChange={(e) => setBuscaProdutos(e.target.value)}
              />
              <div className="max-h-56 overflow-y-auto rounded-md border border-stroke/30">
                {produtosBusca?.itens.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 border-b border-stroke/10 px-3 py-2 text-sm last:border-0 hover:bg-surface">
                    <input type="checkbox" checked={produtoIdsSelecionados.has(p.id)} onChange={() => alternarProduto(p.id)} />
                    <span className="font-mono text-xs text-muted">{p.sku}</span>
                    <span className="text-ink">{p.nome}</span>
                  </label>
                ))}
                {produtosBusca && produtosBusca.itens.length === 0 && (
                  <div className="px-3 py-3 text-sm text-muted">
                    {buscaProdutos ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto encontrado.'}
                  </div>
                )}
              </div>
            </div>
          </Field>
        )}
        {tipoCriterio === 'POR_ENDERECO' && (
          <Field label={`Endereços a contar${enderecoIds.size > 0 ? ` (${enderecoIds.size} selecionado(s))` : ''}`}>
            {!depositoId ? (
              <div className="text-xs text-muted">Selecione um depósito primeiro.</div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Buscar por código do endereço…"
                  value={filtroCodigo}
                  onChange={(e) => setFiltroCodigo(e.target.value)}
                />
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
                    {enderecosFiltrados.length} endereço(s){' '}
                    {filtroCodigo || filtroSetor || filtroRua || filtroModulo || filtroNivel ? 'no filtro' : 'no depósito'}
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
                      <input type="checkbox" checked={enderecoIds.has(e.id)} onChange={() => alternarEndereco(e.id)} />
                      <span className="font-mono text-xs text-muted">{e.codigo}</span>
                    </label>
                  ))}
                  {enderecosFiltrados.length === 0 && (
                    <div className="px-3 py-3 text-sm text-muted">
                      {enderecosDoDeposito && enderecosDoDeposito.length > 0
                        ? 'Nenhum endereço para esse filtro.'
                        : 'Nenhum endereço cadastrado neste depósito.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Field>
        )}

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variante="primaria"
            disabled={
              criar.isPending ||
              (tipoCriterio === 'POR_ENDERECO' && enderecoIds.size === 0) ||
              (tipoCriterio === 'SELECAO_MANUAL' && produtoIdsSelecionados.size === 0)
            }
          >
            Criar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
