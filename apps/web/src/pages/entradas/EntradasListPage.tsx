import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEntradas } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { NovaEntradaModal } from './NovaEntradaModal';

export function EntradasListPage() {
  const { temPapel } = useAuth();
  const [status, setStatus] = useState('');
  const [criando, setCriando] = useState(false);
  const { data: entradas, isLoading } = useEntradas(status || undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ink">Entradas por nota fiscal</h1>
        {temPapel('ADMIN', 'SUPERVISOR') && (
          <Button variante="primaria" onClick={() => setCriando(true)}>
            + Nova entrada
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="EM_DISTRIBUICAO">Em distribuição</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </Select>
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Nota fiscal</Th>
              <Th>Depósito</Th>
              <Th>Itens</Th>
              <Th>Criado por</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-muted">Carregando…</Td>
              </tr>
            )}
            {entradas?.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link to={`/entradas/${e.id}`} className="font-mono text-xs text-primary hover:underline">
                    {e.codigo}
                  </Link>
                </Td>
                <Td>{e.nota}</Td>
                <Td>{e.deposito.nome}</Td>
                <Td>{e._count.itens}</Td>
                <Td>{e.criadoPorUsuario.nome}</Td>
                <Td>
                  <Badge tom={e.status}>{e.status}</Badge>
                </Td>
              </tr>
            ))}
            {entradas && entradas.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhuma entrada encontrada.</Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="p-3" className="h-20 animate-pulse" />
            ))}
          </div>
        )}
        {entradas?.map((e) => (
          <Link key={e.id} to={`/entradas/${e.id}`}>
            <Card padding="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">{e.codigo}</div>
                  <div className="truncate text-sm font-medium text-ink">NF {e.nota}</div>
                </div>
                <Badge tom={e.status}>{e.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span>{e.deposito.nome}</span>
                <span>{e._count.itens} {e._count.itens === 1 ? 'item' : 'itens'}</span>
              </div>
            </Card>
          </Link>
        ))}
        {entradas && entradas.length === 0 && <EmptyState mensagem="Nenhuma entrada encontrada." />}
      </div>

      {criando && <NovaEntradaModal onClose={() => setCriando(false)} />}
    </div>
  );
}
