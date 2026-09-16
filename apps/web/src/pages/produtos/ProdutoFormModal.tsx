import { useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useCriarProduto, useAtualizarProduto } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { Produto } from '../../api/types';

export function ProdutoFormModal({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const criar = useCriarProduto();
  const atualizar = useAtualizarProduto();
  const [erro, setErro] = useState<string | null>(null);

  const valoresIniciais = {
    sku: produto?.sku ?? '',
    codigoBarras: produto?.codigoBarras ?? '',
    nome: produto?.nome ?? '',
    unidade: produto?.unidade ?? 'UN',
    precoCusto: produto?.precoCusto ?? 0,
    estoqueMinimo: produto?.estoqueMinimo ?? 0,
    ativo: produto?.ativo ?? true,
  };
  const [form, setForm] = useState(valoresIniciais);
  // Snapshot congelado no momento em que o modal abriu — usado só pra saber
  // o que o usuário de fato mexeu (abaixo), nunca reatribuído.
  const inicial = useRef(valoresIniciais).current;

  const salvando = criar.isPending || atualizar.isPending;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    try {
      const codigoBarrasAtual = form.codigoBarras || undefined;
      if (produto) {
        // Manda só os campos que essa aba de fato alterou, não o formulário
        // inteiro — se outra aba tiver o mesmo produto aberto e salvar um
        // campo diferente nesse meio-tempo, um PATCH com tudo sobrescreveria
        // essa mudança em silêncio assim que essa aba salvasse por cima.
        const dto: Partial<{
          codigoBarras?: string;
          nome: string;
          unidade: string;
          precoCusto: number;
          estoqueMinimo: number;
          ativo: boolean;
        }> = {};
        if (codigoBarrasAtual !== (inicial.codigoBarras || undefined)) dto.codigoBarras = codigoBarrasAtual;
        if (form.nome !== inicial.nome) dto.nome = form.nome;
        if (form.unidade !== inicial.unidade) dto.unidade = form.unidade;
        if (form.precoCusto !== inicial.precoCusto) dto.precoCusto = form.precoCusto;
        if (form.estoqueMinimo !== inicial.estoqueMinimo) dto.estoqueMinimo = form.estoqueMinimo;
        if (form.ativo !== inicial.ativo) dto.ativo = form.ativo;
        await atualizar.mutateAsync({ id: produto.id, dto });
      } else {
        await criar.mutateAsync({
          sku: form.sku,
          codigoBarras: codigoBarrasAtual,
          nome: form.nome,
          unidade: form.unidade,
          precoCusto: form.precoCusto,
          estoqueMinimo: form.estoqueMinimo,
        });
      }
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar o produto.');
    }
  };

  return (
    <Modal title={produto ? `Editar ${produto.sku}` : 'Novo produto'} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU">
            <Input
              required
              disabled={!!produto}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </Field>
          <Field label="Código de barras">
            <Input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} />
          </Field>
        </div>

        <Field label="Nome">
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Unidade">
            <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
          </Field>
          <Field label="Preço de custo">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.precoCusto}
              onChange={(e) => setForm({ ...form, precoCusto: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Estoque mínimo">
          <Input
            type="number"
            step="0.01"
            min={0}
            value={form.estoqueMinimo}
            onChange={(e) => setForm({ ...form, estoqueMinimo: Number(e.target.value) })}
          />
        </Field>

        {!produto && <div className="text-xs text-muted">Saldo: 0 — entra por inventário.</div>}

        {produto && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Produto ativo
            {!form.ativo && (
              <span className="text-xs text-muted">— inativo não entra em novos escopos, mas continua no histórico</span>
            )}
          </label>
        )}

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
