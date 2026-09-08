import { useState } from 'react';
import { useConferencia, useEfetivarEscopo } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Select } from '../../components/Input';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../app/AuthContext';
import { ApiError } from '../../api/client';

export function ConferenciaPainel({ escopoId }: { escopoId: number }) {
  const { temPapel } = useAuth();
  const { data: conferencia, isLoading } = useConferencia(escopoId);
  const efetivar = useEfetivarEscopo();
  const [politica, setPolitica] = useState<'IGNORAR' | 'ZERAR'>('IGNORAR');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  if (isLoading || !conferencia) return <div className="text-nevoa">Carregando conferência…</div>;

  const { itens, resumo } = conferencia;

  const onEfetivar = async () => {
    setErro(null);
    try {
      await efetivar.mutateAsync({ id: escopoId, body: { politicaPendentes: politica } });
      setConfirmando(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível efetivar.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumoCard rotulo="Itens contados" valor={resumo.itensContados} />
        <ResumoCard rotulo="Itens pendentes" valor={resumo.itensPendentes} />
        <ResumoCard rotulo="Divergência (un.)" valor={resumo.divergenciaTotalUnidades} />
        <ResumoCard
          rotulo="Divergência (R$)"
          valor={resumo.divergenciaTotalReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          tom={resumo.divergenciaTotalReais > 0 ? 'conforme' : resumo.divergenciaTotalReais < 0 ? 'divergente' : undefined}
        />
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>SKU</Th>
              <Th>Produto</Th>
              <Th>Endereço</Th>
              <Th>Congelado</Th>
              <Th>Atual</Th>
              <Th>Contado</Th>
              <Th>Diferença</Th>
              <Th>Impacto (R$)</Th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.itemId} className={item.saldoAlterado ? 'bg-latao/10' : ''}>
                <Td className="font-mono text-xs">{item.sku}</Td>
                <Td>{item.nome}</Td>
                <Td className="font-mono text-xs text-nevoa">{item.enderecoCodigo}</Td>
                <Td>{item.saldoCongelado}</Td>
                <Td>
                  {item.saldoAtual}
                  {item.saldoAlterado && <span className="ml-1 text-xs text-latao-escuro">alterado</span>}
                </Td>
                <Td>{item.quantidadeContada ?? '— pendente'}</Td>
                <Td className={item.diferenca ? (item.diferenca > 0 ? 'text-conforme' : 'text-divergente') : ''}>
                  {item.diferenca ?? '—'}
                </Td>
                <Td>{item.impactoReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — sem rolagem lateral pra conferir cada item. */}
      <div className="flex flex-col gap-2 md:hidden">
        {itens.map((item) => (
          <Card key={item.itemId} padding="p-3" className={item.saldoAlterado ? 'bg-latao/10' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-nevoa">{item.sku}</div>
                <div className="truncate text-sm font-medium text-aco">{item.nome}</div>
                <div className="font-mono text-[11px] text-latao-escuro">{item.enderecoCodigo}</div>
              </div>
              <div className="shrink-0 text-right text-xs text-nevoa">
                Impacto
                <div className="text-sm font-semibold text-aco">
                  {item.impactoReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Congelado</div>
                <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">{item.saldoCongelado}</div>
              </div>
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Contado</div>
                <div className="text-sm font-semibold text-aco [font-variant-numeric:tabular-nums]">
                  {item.quantidadeContada ?? '—'}
                </div>
              </div>
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Diferença</div>
                <div
                  className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                    item.diferenca ? (item.diferenca > 0 ? 'text-conforme' : 'text-divergente') : 'text-aco'
                  }`}
                >
                  {item.diferenca ?? '—'}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {itens.length === 0 && (
          <Card padding="p-3" className="text-sm text-nevoa">
            Nenhum item.
          </Card>
        )}
      </div>

      {temPapel('ADMIN', 'SUPERVISOR') && conferencia.escopo.status === 'CONFERENCIA' && (
        <Card className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-aco">Efetivar inventário</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-aco">Itens pendentes:</span>
            <Select value={politica} onChange={(e) => setPolitica(e.target.value as 'IGNORAR' | 'ZERAR')} className="w-56">
              <option value="IGNORAR">Ignorar (mantém saldo)</option>
              <option value="ZERAR">Zerar saldo</option>
            </Select>
          </div>

          {erro && <div className="text-sm text-divergente">{erro}</div>}

          {/* Primária, não perigo — "efetivar" conclui com sucesso o
              inventário. "Cancelar escopo" (perigo, na tela acima) é a
              ação oposta; as duas convergindo pra vermelho confundiam
              qual delas destrói o trabalho e qual confirma. */}
          <Button variante="primaria" className="self-start" onClick={() => setConfirmando(true)}>
            Efetivar inventário
          </Button>
        </Card>
      )}

      {confirmando && (
        <ConfirmDialog
          titulo="Efetivar inventário?"
          descricao={`Essa ação é irreversível. Confirma a efetivação de ${resumo.itensContados} item(ns) contado(s)? O saldo do sistema será ajustado pra bater com a contagem.`}
          rotuloConfirmar="Sim, efetivar"
          variante="primaria"
          pendente={efetivar.isPending}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={onEfetivar}
        />
      )}
    </div>
  );
}

function ResumoCard({ rotulo, valor, tom }: { rotulo: string; valor: string | number; tom?: 'conforme' | 'divergente' }) {
  const cor = tom === 'conforme' ? 'text-conforme' : tom === 'divergente' ? 'text-divergente' : 'text-aco';
  return (
    <Card padding="p-3">
      <div className="text-xs text-nevoa">{rotulo}</div>
      <div className={`text-lg font-semibold ${cor}`}>{valor}</div>
    </Card>
  );
}
