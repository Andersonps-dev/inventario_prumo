import { useState } from 'react';
import { useAuditoria } from '../../api/hooks';
import { useAuth } from '../../app/AuthContext';
import type { FiltrosAuditoria } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Field, Input, Select } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FiltrosPanel } from '../../components/FiltrosPanel';
import { useOrdenacao } from '../../app/useOrdenacao';

const ACOES = ['CRIAR', 'EDITAR', 'CANCELAR', 'EFETIVAR', 'EXPORTAR', 'EXCLUIR'];

const ROTULO_ACAO: Record<string, string> = {
  CRIAR: 'Criar',
  EDITAR: 'Editar',
  CANCELAR: 'Cancelar',
  EFETIVAR: 'Efetivar',
  EXPORTAR: 'Exportar',
  EXCLUIR: 'Excluir',
};

const ROTULO_ENTIDADE: Record<string, string> = {
  usuario: 'Usuário',
  empresa: 'Empresa',
  endereco: 'Endereço',
  escopo_inventario: 'Escopo de inventário',
  escopo_item: 'Item de escopo',
  contagem: 'Contagem',
  exportacao: 'Exportação',
  produto: 'Produto',
  evento_venda: 'Feira',
};

export function AuditoriaPage() {
  const { usuario: ator, empresaSelecionada } = useAuth();
  const modoGlobal = ator?.papel === 'SUPER_ADMIN' && !empresaSelecionada;
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const { data, isLoading } = useAuditoria(filtros);

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.tamanhoPagina)) : 1;

  // Ordena só a página atual — a listagem em si já é paginada no backend.
  const { linhasOrdenadas: itensOrdenados, ordenacao, alternar } = useOrdenacao(data?.itens, {
    criadoEm: (r) => r.criadoEm,
    entidade: (r) => r.entidade,
    acao: (r) => r.acao,
    usuario: (r) => r.usuario.nome,
    empresa: (r) => r.empresa?.nome,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Log de Execuções</h1>
        <p className="text-sm text-muted">{modoGlobal ? 'Ações de todas as empresas.' : 'Ações registradas nesta empresa.'}</p>
      </div>

      <FiltrosPanel
        ativos={[filtros.entidade, filtros.acao, filtros.dataInicio, filtros.dataFim].filter(Boolean).length}
      >
        <Card padding="p-3" className="flex flex-wrap items-end gap-3">
          <Field label="Entidade">
            <Input
              placeholder="ex.: produto, escopo_inventario"
              value={filtros.entidade ?? ''}
              onChange={(e) => setFiltros({ ...filtros, entidade: e.target.value || undefined, pagina: 1 })}
              className="w-52"
            />
          </Field>
          <Field label="Ação">
            <Select
              value={filtros.acao ?? ''}
              onChange={(e) => setFiltros({ ...filtros, acao: e.target.value || undefined, pagina: 1 })}
            >
              <option value="">Todas</option>
              {ACOES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="De">
            <Input
              type="date"
              value={filtros.dataInicio ?? ''}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value || undefined, pagina: 1 })}
            />
          </Field>
          <Field label="Até">
            <Input
              type="date"
              value={filtros.dataFim ?? ''}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value || undefined, pagina: 1 })}
            />
          </Field>
          {(filtros.entidade || filtros.acao || filtros.dataInicio || filtros.dataFim) && (
            <button className="text-xs text-primary hover:underline" onClick={() => setFiltros({})}>
              Limpar filtros
            </button>
          )}
        </Card>
      </FiltrosPanel>

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="criadoEm" ordenacao={ordenacao} onSort={alternar}>
                Data
              </Th>
              <Th sortKey="entidade" ordenacao={ordenacao} onSort={alternar}>
                Entidade
              </Th>
              <Th sortKey="acao" ordenacao={ordenacao} onSort={alternar}>
                Ação
              </Th>
              <Th sortKey="usuario" ordenacao={ordenacao} onSort={alternar}>
                Usuário
              </Th>
              {modoGlobal && (
                <Th sortKey="empresa" ordenacao={ordenacao} onSort={alternar}>
                  Empresa
                </Th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <Td className="text-muted">Carregando…</Td>
              </tr>
            )}
            {itensOrdenados?.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-xs text-muted">{new Date(r.criadoEm).toLocaleString('pt-BR')}</Td>
                <Td className="text-xs">
                  {ROTULO_ENTIDADE[r.entidade] ?? r.entidade}
                  {r.entidadeId ? <span className="font-mono text-muted"> #{r.entidadeId}</span> : ''}
                </Td>
                <Td>
                  <Badge tom={r.acao}>{ROTULO_ACAO[r.acao] ?? r.acao}</Badge>
                </Td>
                <Td>{r.usuario.nome}</Td>
                {modoGlobal && <Td>{r.empresa?.nome ?? '—'}</Td>}
              </tr>
            ))}
            {itensOrdenados && itensOrdenados.length === 0 && (
              <tr>
                <Td className="text-muted">Nenhum registro para os filtros selecionados.</Td>
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
              <Card key={i} padding="p-3" className="h-16 animate-pulse" />
            ))}
          </div>
        )}
        {itensOrdenados?.map((r) => (
          <Card key={r.id} padding="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm text-ink">
                {ROTULO_ENTIDADE[r.entidade] ?? r.entidade}
                {r.entidadeId ? <span className="font-mono text-xs text-muted"> #{r.entidadeId}</span> : ''}
              </div>
              <Badge tom={r.acao}>{ROTULO_ACAO[r.acao] ?? r.acao}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span>{new Date(r.criadoEm).toLocaleString('pt-BR')}</span>
              <span>{r.usuario.nome}</span>
              {modoGlobal && <span>{r.empresa?.nome ?? 'Sem empresa'}</span>}
            </div>
          </Card>
        ))}
        {itensOrdenados && itensOrdenados.length === 0 && <EmptyState mensagem="Nenhum registro para os filtros selecionados." />}
      </div>

      {data && data.total > data.tamanhoPagina && (
        <div className="flex items-center justify-end gap-3 text-sm text-ink">
          <Button disabled={(filtros.pagina ?? 1) <= 1} onClick={() => setFiltros({ ...filtros, pagina: (filtros.pagina ?? 1) - 1 })}>
            Anterior
          </Button>
          <span>
            Página {filtros.pagina ?? 1} de {totalPaginas}
          </span>
          <Button
            disabled={(filtros.pagina ?? 1) >= totalPaginas}
            onClick={() => setFiltros({ ...filtros, pagina: (filtros.pagina ?? 1) + 1 })}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
