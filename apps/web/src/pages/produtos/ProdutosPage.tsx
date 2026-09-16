import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAtualizarProduto, useProdutos } from '../../api/hooks';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonLinhas } from '../../components/Skeleton';
import { RowActions, RowAction } from '../../components/RowActions';
import { Input } from '../../components/Input';
import { useAuth } from '../../app/AuthContext';
import { useOrdenacao } from '../../app/useOrdenacao';
import { ApiError } from '../../api/client';
import { ProdutoFormModal } from './ProdutoFormModal';
import { ImportarProdutosModal } from './ImportarProdutosModal';
import { ExportButton } from '../../components/ExportButton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Produto } from '../../api/types';

export function ProdutosPage() {
  const { temPapel } = useAuth();
  const [searchParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const [abaixoDoMinimo, setAbaixoDoMinimo] = useState(searchParams.get('abaixoDoMinimo') === 'true');
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Produto | null | 'novo'>(null);
  const [importando, setImportando] = useState(false);

  const { data, isLoading } = useProdutos({ busca: busca || undefined, abaixoDoMinimo, pagina });
  const atualizar = useAtualizarProduto();
  const [erro, setErro] = useState<string | null>(null);
  const [inativando, setInativando] = useState<Produto | null>(null);

  const podeGerenciar = temPapel('ADMIN', 'SUPERVISOR');
  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.tamanhoPagina)) : 1;

  const { linhasOrdenadas: itens, ordenacao, alternar } = useOrdenacao(data?.itens, {
    codigoBarras: (p) => p.codigoBarras,
    sku: (p) => p.sku,
    nome: (p) => p.nome,
    saldo: (p) => p.saldo,
    estoqueMinimo: (p) => p.estoqueMinimo,
    ativo: (p) => p.ativo,
  });

  const executarAlternarAtivo = async (produto: Produto) => {
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: produto.id, dto: { ativo: !produto.ativo } });
      setInativando(null);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar a situação do produto.');
    }
  };

  const alternarAtivo = (produto: Produto) => {
    if (produto.ativo) {
      setInativando(produto);
    } else {
      executarAlternarAtivo(produto);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ink">Produtos</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/produtos/etiquetas">
            <Button>Etiquetas</Button>
          </Link>
          <ExportButton tipo="catalogo" />
          {podeGerenciar && (
            <>
              <Button onClick={() => setImportando(true)}>Importar CSV</Button>
              <Button variante="primaria" onClick={() => setEditando('novo')}>
                + Novo produto
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nome, SKU ou código de barras"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          className="w-72"
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={abaixoDoMinimo}
            onChange={(e) => {
              setAbaixoDoMinimo(e.target.checked);
              setPagina(1);
            }}
          />
          Só abaixo do mínimo
        </label>
      </div>

      {erro && <div className="text-sm text-danger">{erro}</div>}

      {/* Desktop/tablet: tabela completa. */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th sortKey="codigoBarras" ordenacao={ordenacao} onSort={alternar}>
                Código de barras
              </Th>
              <Th sortKey="sku" ordenacao={ordenacao} onSort={alternar}>
                SKU
              </Th>
              <Th sortKey="nome" ordenacao={ordenacao} onSort={alternar}>
                Produto
              </Th>
              <Th>Un.</Th>
              <Th sortKey="saldo" ordenacao={ordenacao} onSort={alternar}>
                Saldo
              </Th>
              <Th sortKey="estoqueMinimo" ordenacao={ordenacao} onSort={alternar}>
                Mínimo
              </Th>
              <Th sortKey="ativo" ordenacao={ordenacao} onSort={alternar}>
                Situação
              </Th>
              {podeGerenciar && <Th></Th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonLinhas linhas={4} colunas={podeGerenciar ? 8 : 7} />}
            {itens?.map((produto) => (
              <tr key={produto.id} className={!produto.ativo ? 'opacity-50' : ''}>
                <Td className="font-mono text-xs text-muted">{produto.codigoBarras ?? '—'}</Td>
                <Td className="font-mono text-xs">{produto.sku}</Td>
                <Td>{produto.nome}</Td>
                <Td>{produto.unidade}</Td>
                <Td className={produto.abaixoDoMinimo ? 'font-semibold text-danger' : ''}>
                  {produto.abaixoDoMinimo && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-danger align-middle" />}
                  {produto.saldo}
                </Td>
                <Td>{produto.estoqueMinimo}</Td>
                <Td>
                  <Badge tom={produto.ativo ? 'conforme' : 'divergente'}>{produto.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </Td>
                {podeGerenciar && (
                  <Td>
                    <RowActions>
                      <RowAction onClick={() => setEditando(produto)}>Editar</RowAction>
                      <RowAction tom="perigo" onClick={() => alternarAtivo(produto)}>
                        {produto.ativo ? 'Inativar' : 'Reativar'}
                      </RowAction>
                    </RowActions>
                  </Td>
                )}
              </tr>
            ))}
            {data && data.itens.length === 0 && (
              <tr>
                <Td colSpan={podeGerenciar ? 8 : 7}>
                  <EmptyState mensagem="Nenhum produto encontrado." />
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Celular: cards empilhados — sem rolagem lateral pra alcançar as ações. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="p-3" className="h-24 animate-pulse" />
            ))}
          </div>
        )}
        {itens?.map((produto) => (
          <Card key={produto.id} padding="p-3" className={!produto.ativo ? 'opacity-50' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted">
                  {produto.codigoBarras ?? '—'} · {produto.sku}
                </div>
                <div className="truncate text-sm font-medium text-ink">{produto.nome}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge tom={produto.ativo ? 'conforme' : 'divergente'}>{produto.ativo ? 'Ativo' : 'Inativo'}</Badge>
                {podeGerenciar && (
                  <RowActions>
                    <RowAction onClick={() => setEditando(produto)}>Editar</RowAction>
                    <RowAction tom="perigo" onClick={() => alternarAtivo(produto)}>
                      {produto.ativo ? 'Inativar' : 'Reativar'}
                    </RowAction>
                  </RowActions>
                )}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Un.</div>
                <div className="text-sm font-semibold text-ink">{produto.unidade}</div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Saldo</div>
                <div className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${produto.abaixoDoMinimo ? 'text-danger' : 'text-ink'}`}>
                  {produto.abaixoDoMinimo && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-danger align-middle" />}
                  {produto.saldo}
                </div>
              </div>
              <div className="rounded-md bg-surface py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted">Mínimo</div>
                <div className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">{produto.estoqueMinimo}</div>
              </div>
            </div>
          </Card>
        ))}
        {data && data.itens.length === 0 && <EmptyState mensagem="Nenhum produto encontrado." />}
      </div>

      {data && data.total > data.tamanhoPagina && (
        <div className="flex items-center justify-end gap-3 text-sm text-ink">
          <Button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <Button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      {editando && (
        <ProdutoFormModal produto={editando === 'novo' ? null : editando} onClose={() => setEditando(null)} />
      )}
      {importando && <ImportarProdutosModal onClose={() => setImportando(false)} />}

      {inativando && (
        <ConfirmDialog
          titulo="Inativar produto?"
          descricao={`"${inativando.nome}" deixa de entrar em novos escopos de inventário, mas o histórico é preservado.`}
          rotuloConfirmar="Inativar"
          variante="perigo"
          pendente={atualizar.isPending}
          onCancelar={() => setInativando(null)}
          onConfirmar={() => executarAlternarAtivo(inativando)}
        />
      )}
    </div>
  );
}
