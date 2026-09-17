import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEscopos } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FiltrosPanel } from '../../components/FiltrosPanel';
import { Input, Select } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { useOrdenacao } from '../../app/useOrdenacao';
import { NovoEscopoModal } from './NovoEscopoModal';

export function EscoposListPage() {
  const { temPapel } = useAuth();
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);
  const { data: escopos, isLoading } = useEscopos(status || undefined);

  const escoposFiltrados = escopos?.filter((e) => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return e.codigo.toLowerCase().includes(termo) || e.titulo.toLowerCase().includes(termo);
  });
  const { linhasOrdenadas: escoposOrdenados, ordenacao, alternar } = useOrdenacao(escoposFiltrados, {
    codigo: (e) => e.codigo,
    titulo: (e) => e.titulo,
    deposito: (e) => e.deposito.nome,
    responsavel: (e) => e.responsavel?.nome,
    itens: (e) => e._count.itens,
    prazo: (e) => e.prazo,
    status: (e) => e.status,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ink">Inventários</h1>
        {temPapel('ADMIN', 'SUPERVISOR') && (
          <Button variante="primaria" onClick={() => setCriando(true)}>
            + Novo escopo
          </Button>
        )}
      </div>

      <FiltrosPanel ativos={(busca ? 1 : 0) + (status ? 1 : 0)}>
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Buscar por código ou título…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="ABERTO">Aberto</option>
            <option value="EM_CONTAGEM">Em contagem</option>
            <option value="CONFERENCIA">Conferência</option>
            <option value="EFETIVADO">Efetivado</option>
            <option value="CANCELADO">Cancelado</option>
          </Select>
        </div>
      </FiltrosPanel>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="codigo" ordenacao={ordenacao} onSort={alternar}>
                Código
              </Th>
              <Th sortKey="titulo" ordenacao={ordenacao} onSort={alternar}>
                Título
              </Th>
              <Th sortKey="deposito" ordenacao={ordenacao} onSort={alternar}>
                Depósito
              </Th>
              <Th sortKey="responsavel" ordenacao={ordenacao} onSort={alternar}>
                Responsável
              </Th>
              <Th sortKey="itens" ordenacao={ordenacao} onSort={alternar}>
                Itens
              </Th>
              <Th sortKey="prazo" ordenacao={ordenacao} onSort={alternar}>
                Prazo
              </Th>
              <Th sortKey="status" ordenacao={ordenacao} onSort={alternar}>
                Status
              </Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-muted">Carregando…</Td>
              </tr>
            )}
            {escoposOrdenados?.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link to={`/escopos/${e.id}`} className="font-mono text-xs text-primary hover:underline">
                    {e.codigo}
                  </Link>
                </Td>
                <Td>{e.titulo}</Td>
                <Td>{e.deposito.nome}</Td>
                <Td>{e.responsavel?.nome ?? '—'}</Td>
                <Td>{e._count.itens}</Td>
                <Td>{e.prazo ? new Date(e.prazo).toLocaleDateString('pt-BR') : '—'}</Td>
                <Td>
                  <Badge tom={e.status}>{e.status}</Badge>
                </Td>
              </tr>
            ))}
            {escoposOrdenados && escoposOrdenados.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhum inventário encontrado.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — sem rolagem lateral pra comparar depósito/prazo/status. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="p-3" className="h-20 animate-pulse" />
            ))}
          </div>
        )}
        {escoposOrdenados?.map((e) => (
          <Link key={e.id} to={`/escopos/${e.id}`}>
            <Card padding="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">{e.codigo}</div>
                  <div className="truncate text-sm font-medium text-ink">{e.titulo}</div>
                </div>
                <Badge tom={e.status}>{e.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span>{e.deposito.nome}</span>
                <span>{e.responsavel?.nome ?? 'Sem responsável'}</span>
                <span>{e._count.itens} {e._count.itens === 1 ? 'item' : 'itens'}</span>
                {e.prazo && <span>Prazo {new Date(e.prazo).toLocaleDateString('pt-BR')}</span>}
              </div>
            </Card>
          </Link>
        ))}
        {escoposOrdenados && escoposOrdenados.length === 0 && <EmptyState mensagem="Nenhum inventário encontrado." />}
      </div>

      {criando && <NovoEscopoModal onClose={() => setCriando(false)} />}
    </div>
  );
}
