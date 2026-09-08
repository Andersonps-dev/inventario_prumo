import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEventosVenda } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input, Select } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { useOrdenacao } from '../../app/useOrdenacao';
import { NovaFeiraModal } from './NovaFeiraModal';

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FeirasPage() {
  const { temPapel } = useAuth();
  const [criando, setCriando] = useState(false);
  const { data: eventos, isLoading } = useEventosVenda();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');

  const eventosFiltrados = eventos?.filter((e) => {
    if (status && e.status !== status) return false;
    if (busca && !e.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });
  const { linhasOrdenadas: eventosOrdenados, ordenacao, alternar } = useOrdenacao(eventosFiltrados, {
    titulo: (e) => e.titulo,
    depositoOrigem: (e) => e.depositoOrigem.nome,
    criadoPor: (e) => e.criadoPorUsuario.nome,
    criadoEm: (e) => e.criadoEm,
    status: (e) => e.status,
    quantidadeVendida: (e) => e.relatorioFechamento?.quantidadeTotal ?? null,
    valorVendido: (e) => e.relatorioFechamento?.valorTotal ?? null,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-aco">Feiras</h1>
          <p className="text-sm text-nevoa">
            Leve itens do estoque pra vender fora — o saldo continua existindo, só muda de lugar. O que não voltar vira relatório de venda.
          </p>
        </div>
        {temPapel('ADMIN', 'SUPERVISOR') && (
          <Button variante="primaria" onClick={() => setCriando(true)}>
            + Nova feira
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar por título…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          <option value="">Todos os status</option>
          <option value="ABERTO">Aberto</option>
          <option value="FECHADO">Fechado</option>
        </Select>
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="titulo" ordenacao={ordenacao} onSort={alternar}>
                Título
              </Th>
              <Th sortKey="depositoOrigem" ordenacao={ordenacao} onSort={alternar}>
                Depósito de origem
              </Th>
              <Th sortKey="criadoPor" ordenacao={ordenacao} onSort={alternar}>
                Criado por
              </Th>
              <Th sortKey="criadoEm" ordenacao={ordenacao} onSort={alternar}>
                Aberto em
              </Th>
              <Th sortKey="status" ordenacao={ordenacao} onSort={alternar}>
                Status
              </Th>
              <Th sortKey="quantidadeVendida" ordenacao={ordenacao} onSort={alternar}>
                Qtde. vendida
              </Th>
              <Th sortKey="valorVendido" ordenacao={ordenacao} onSort={alternar}>
                Valor vendido
              </Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-nevoa">Carregando…</Td>
              </tr>
            )}
            {eventosOrdenados?.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link to={`/feiras/${e.id}`} className="text-latao-escuro hover:underline">
                    {e.titulo}
                  </Link>
                </Td>
                <Td>{e.depositoOrigem.nome}</Td>
                <Td>{e.criadoPorUsuario.nome}</Td>
                <Td className="text-xs text-nevoa">{new Date(e.criadoEm).toLocaleString('pt-BR')}</Td>
                <Td>
                  <Badge tom={e.status}>{e.status}</Badge>
                </Td>
                <Td>{e.relatorioFechamento ? e.relatorioFechamento.quantidadeTotal : '—'}</Td>
                <Td>{e.relatorioFechamento ? moeda(e.relatorioFechamento.valorTotal) : '—'}</Td>
              </tr>
            ))}
            {eventosOrdenados && eventosOrdenados.length === 0 && (
              <tr>
                <Td className="text-nevoa">Nenhuma feira encontrada.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — status e valor (o que mais importa numa lista de feiras) sempre visíveis sem rolar. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && <div className="text-sm text-nevoa">Carregando…</div>}
        {eventosOrdenados?.map((e) => (
          <Card key={e.id} padding="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/feiras/${e.id}`} className="truncate text-sm font-medium text-latao-escuro hover:underline">
                  {e.titulo}
                </Link>
                <div className="truncate text-xs text-nevoa">{e.depositoOrigem.nome}</div>
              </div>
              <Badge tom={e.status}>{e.status}</Badge>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Qtde. vendida</div>
                <div className="text-sm font-semibold text-aco">{e.relatorioFechamento ? e.relatorioFechamento.quantidadeTotal : '—'}</div>
              </div>
              <div className="rounded-md bg-concreto py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-nevoa">Valor vendido</div>
                <div className="text-sm font-semibold text-aco">
                  {e.relatorioFechamento ? moeda(e.relatorioFechamento.valorTotal) : '—'}
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-nevoa">
              {e.criadoPorUsuario.nome} · {new Date(e.criadoEm).toLocaleString('pt-BR')}
            </div>
          </Card>
        ))}
        {eventosOrdenados && eventosOrdenados.length === 0 && <div className="p-3 text-sm text-nevoa">Nenhuma feira encontrada.</div>}
      </div>

      {criando && <NovaFeiraModal onClose={() => setCriando(false)} />}
    </div>
  );
}
