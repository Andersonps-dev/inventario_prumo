import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTransferencias } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { NovaTransferenciaModal } from './NovaTransferenciaModal';

export function TransferenciasListPage() {
  const { temPapel } = useAuth();
  const [status, setStatus] = useState('');
  const [criando, setCriando] = useState(false);
  const { data: transferencias, isLoading } = useTransferencias(status || undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ink">Transferências entre posições</h1>
        {temPapel('ADMIN', 'SUPERVISOR') && (
          <Button variante="primaria" onClick={() => setCriando(true)}>
            + Nova transferência
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          <option value="">Todos os status</option>
          <option value="ABERTA">Aberta</option>
          <option value="EFETIVADA">Efetivada</option>
          <option value="CANCELADA">Cancelada</option>
        </Select>
      </div>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Depósito</Th>
              <Th>Origem</Th>
              <Th>Destino</Th>
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
            {transferencias?.map((t) => (
              <tr key={t.id}>
                <Td>
                  <Link to={`/transferencias/${t.id}`} className="font-mono text-xs text-primary hover:underline">
                    {t.codigo}
                  </Link>
                </Td>
                <Td>{t.deposito.nome}</Td>
                <Td className="font-mono text-xs text-muted">{t.enderecoOrigem.interno ? '—' : t.enderecoOrigem.codigo}</Td>
                <Td className="font-mono text-xs text-muted">{t.enderecoDestino.interno ? '—' : t.enderecoDestino.codigo}</Td>
                <Td>{t._count.itens}</Td>
                <Td>{t.criadoPorUsuario.nome}</Td>
                <Td>
                  <Badge tom={t.status}>{t.status}</Badge>
                </Td>
              </tr>
            ))}
            {transferencias && transferencias.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhuma transferência encontrada.</Td>
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
        {transferencias?.map((t) => (
          <Link key={t.id} to={`/transferencias/${t.id}`}>
            <Card padding="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted">{t.codigo}</div>
                  <div className="truncate text-sm font-medium text-ink">{t.deposito.nome}</div>
                </div>
                <Badge tom={t.status}>{t.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                <span className="font-mono">{t.enderecoOrigem.interno ? '—' : t.enderecoOrigem.codigo} → {t.enderecoDestino.interno ? '—' : t.enderecoDestino.codigo}</span>
                <span>{t._count.itens} {t._count.itens === 1 ? 'item' : 'itens'}</span>
              </div>
            </Card>
          </Link>
        ))}
        {transferencias && transferencias.length === 0 && <EmptyState mensagem="Nenhuma transferência encontrada." />}
      </div>

      {criando && <NovaTransferenciaModal onClose={() => setCriando(false)} />}
    </div>
  );
}
