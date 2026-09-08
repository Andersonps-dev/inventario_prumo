import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAdicionarItens, useEnderecos, useProdutos } from '../../api/hooks';
import type { ResultadoAdicionarItens } from '../../api/hooks';
import { ApiError } from '../../api/client';

type Modo = 'PRODUTOS' | 'ENDERECOS';

export function AdicionarItensModal({ escopoId, depositoId, onClose }: { escopoId: number; depositoId: number; onClose: () => void }) {
  const adicionar = useAdicionarItens();
  const [modo, setModo] = useState<Modo>('PRODUTOS');
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<number>>(new Set());
  const [enderecosSelecionados, setEnderecosSelecionados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAdicionarItens | null>(null);
  const [busca, setBusca] = useState('');

  const { data: produtos } = useProdutos({ ativo: true, pagina: 1, busca: busca.trim() || undefined });
  const { data: enderecos } = useEnderecos({ depositoId, ativo: true, busca: busca.trim() || undefined });

  const alternarProduto = (id: number) => {
    setProdutosSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const alternarEndereco = (id: number) => {
    setEnderecosSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const trocarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setBusca('');
    setErro(null);
  };

  const confirmar = async () => {
    setErro(null);
    try {
      const body =
        modo === 'ENDERECOS' ? { enderecoIds: [...enderecosSelecionados] } : { produtoIds: [...produtosSelecionados] };
      const r = await adicionar.mutateAsync({ id: escopoId, body });
      setResultado(r);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível adicionar os itens.');
    }
  };

  const selecaoVazia = modo === 'ENDERECOS' ? enderecosSelecionados.size === 0 : produtosSelecionados.size === 0;

  return (
    <Modal title="Adicionar ao escopo" onClose={onClose} largura="max-w-lg">
      {resultado ? (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-conforme">
            {resultado.itensCriados} item(ns) adicionado(s).
            {resultado.ignoradosPorConflito > 0 && (
              <div className="mt-1 text-divergente">
                {resultado.ignoradosPorConflito} ignorado(s) — já estão em outro escopo ativo neste depósito.
              </div>
            )}
            {resultado.itensCriados === 0 && resultado.ignoradosPorConflito === 0 && (
              <div className="mt-1 text-nevoa">
                Nenhum item novo — {modo === 'ENDERECOS' ? 'os endereços selecionados não têm saldo registrado, ou já estão todos neste escopo.' : 'os produtos selecionados já estão neste escopo.'}
              </div>
            )}
          </div>
          <Button variante="primaria" onClick={onClose}>
            Concluir
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => trocarModo('PRODUTOS')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === 'PRODUTOS' ? 'bg-aco text-white' : 'border border-nevoa/30 bg-white text-aco'
              }`}
            >
              Por produto
            </button>
            <button
              type="button"
              onClick={() => trocarModo('ENDERECOS')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === 'ENDERECOS' ? 'bg-aco text-white' : 'border border-nevoa/30 bg-white text-aco'
              }`}
            >
              Por endereço
            </button>
          </div>

          {modo === 'ENDERECOS' && (
            <p className="text-xs text-nevoa">
              Todo produto com saldo registrado nos endereços escolhidos entra no escopo — mesmo comportamento de abrir
              um escopo "por endereço".
            </p>
          )}

          <Input
            placeholder={modo === 'PRODUTOS' ? 'Buscar por SKU ou nome…' : 'Buscar por código, setor, rua…'}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />

          {modo === 'PRODUTOS' ? (
            <div className="max-h-72 overflow-y-auto rounded-md border border-nevoa/30">
              {produtos?.itens.map((p) => (
                <label key={p.id} className="flex items-center gap-2 border-b border-nevoa/10 px-3 py-2 text-sm last:border-0 hover:bg-concreto">
                  <input type="checkbox" checked={produtosSelecionados.has(p.id)} onChange={() => alternarProduto(p.id)} />
                  <span className="font-mono text-xs text-nevoa">{p.sku}</span>
                  <span className="text-aco">{p.nome}</span>
                </label>
              ))}
              {produtos && produtos.itens.length === 0 && (
                <div className="px-3 py-3 text-sm text-nevoa">
                  {busca ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto encontrado.'}
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-md border border-nevoa/30">
              {enderecos?.map((e) => (
                <label key={e.id} className="flex items-center gap-2 border-b border-nevoa/10 px-3 py-2 text-sm last:border-0 hover:bg-concreto">
                  <input type="checkbox" checked={enderecosSelecionados.has(e.id)} onChange={() => alternarEndereco(e.id)} />
                  <span className="font-mono text-xs text-aco">{e.codigo}</span>
                  <span className="text-nevoa">
                    {e.setor} · {e.rua} · {e.modulo} · {e.nivel}
                  </span>
                </label>
              ))}
              {enderecos && enderecos.length === 0 && (
                <div className="px-3 py-3 text-sm text-nevoa">
                  {busca ? 'Nenhum endereço encontrado para essa busca.' : 'Nenhum endereço ativo neste depósito.'}
                </div>
              )}
            </div>
          )}

          {erro && <div className="text-sm text-divergente">{erro}</div>}

          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button variante="primaria" disabled={selecaoVazia || adicionar.isPending} onClick={confirmar}>
              Adicionar{' '}
              {modo === 'ENDERECOS'
                ? enderecosSelecionados.size > 0 && `(${enderecosSelecionados.size})`
                : produtosSelecionados.size > 0 && `(${produtosSelecionados.size})`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
