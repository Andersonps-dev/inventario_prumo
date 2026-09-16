import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { useDepositos, useEnderecos, useRegistrarMovimentoManual } from '../../api/hooks';
import { ApiError } from '../../api/client';

interface ProdutoOpcao {
  produto_id: number;
  sku: string;
  nome: string;
}

export function MovimentoManualModal({ produtos, onClose }: { produtos: ProdutoOpcao[]; onClose: () => void }) {
  const registrar = useRegistrarMovimentoManual();
  const { data: depositos } = useDepositos({ ativo: true });
  const [produtoId, setProdutoId] = useState<number | ''>('');
  const [depositoId, setDepositoId] = useState<number | ''>('');
  const [enderecoId, setEnderecoId] = useState<number | ''>('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [quantidade, setQuantidade] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const { data: enderecos } = useEnderecos({ depositoId: depositoId || undefined, ativo: true });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!produtoId) return;
    try {
      await registrar.mutateAsync({
        produtoId,
        depositoId: depositoId || undefined,
        enderecoId: enderecoId || undefined,
        tipo,
        quantidade,
        motivo,
      });
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível registrar o movimento.');
    }
  };

  return (
    <Modal title="Movimento manual" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-muted">Exceção ao fluxo padrão de inventário. Motivo é obrigatório e fica marcado no kardex.</p>

        <Field label="Produto">
          <Select required value={produtoId} onChange={(e) => setProdutoId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Selecione…</option>
            {produtos.map((p) => (
              <option key={p.produto_id} value={p.produto_id}>
                {p.sku} — {p.nome}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Depósito">
            <Select
              value={depositoId}
              onChange={(e) => {
                setDepositoId(e.target.value ? Number(e.target.value) : '');
                setEnderecoId('');
              }}
            >
              <option value="">Padrão</option>
              {depositos?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Endereço">
            <Select value={enderecoId} onChange={(e) => setEnderecoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Sem endereço definido</option>
              {enderecos?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'ENTRADA' | 'SAIDA')}>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
            </Select>
          </Field>
          <Field label="Quantidade">
            <Input type="number" min={0} step="0.01" required value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
          </Field>
        </div>

        <Field label="Motivo (obrigatório)">
          <Input required minLength={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Field>

        {erro && <div className="text-sm text-danger">{erro}</div>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variante="primaria" disabled={registrar.isPending}>
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
