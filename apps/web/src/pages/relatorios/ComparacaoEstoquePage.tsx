import { useState } from 'react';
import { apiFetch } from '../../api/client';
import { Table, Th, Td } from '../../components/Table';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Field, Select } from '../../components/Input';
import { Card } from '../../components/Card';
import { FileDropZone } from '../../components/FileDropZone';
import { useOrdenacao } from '../../app/useOrdenacao';

interface ColunasResultado {
  colunas: string[];
}

type StatusComparacao = 'OK' | 'DIVERGENTE' | 'NAO_ENCONTRADO_NO_SISTEMA' | 'NAO_INFORMADO_PELO_CLIENTE';

interface LinhaComparacao {
  sku: string;
  nome: string | null;
  estoqueCliente: number | null;
  estoquePrumo: number | null;
  diferenca: number | null;
  status: StatusComparacao;
}

interface LinhaComparacaoComErro {
  linha: number;
  motivo: string;
}

interface ResultadoComparacao {
  linhas: LinhaComparacao[];
  linhasComErro: LinhaComparacaoComErro[];
}

const ROTULO_STATUS: Record<StatusComparacao, string> = {
  OK: 'Bate certo',
  DIVERGENTE: 'Divergente',
  NAO_ENCONTRADO_NO_SISTEMA: 'SKU não existe no Prumo',
  NAO_INFORMADO_PELO_CLIENTE: 'Não informado pelo cliente',
};

const TOM_STATUS: Record<StatusComparacao, string> = {
  OK: 'conforme',
  DIVERGENTE: 'divergente',
  NAO_ENCONTRADO_NO_SISTEMA: 'divergente',
  NAO_INFORMADO_PELO_CLIENTE: 'PENDENTE',
};

function exportarCsv(linhas: LinhaComparacao[]) {
  const BOM = '﻿';
  const cabecalho = ['SKU', 'Produto', 'Estoque do cliente', 'Estoque Prumo', 'Diferença', 'Status'];
  const GATILHOS_FORMULA = ['=', '+', '-', '@', '\t', '\r'];
  const escapar = (v: string) => {
    const seguro = v.length > 0 && GATILHOS_FORMULA.includes(v[0]) ? `'${v}` : v;
    return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  const linhasCsv = [cabecalho.join(';')];
  for (const l of linhas) {
    linhasCsv.push(
      [
        l.sku,
        l.nome ?? '',
        l.estoqueCliente ?? '',
        l.estoquePrumo ?? '',
        l.diferenca ?? '',
        ROTULO_STATUS[l.status],
      ]
        .map((v) => escapar(String(v)))
        .join(';'),
    );
  }
  const blob = new Blob([BOM + linhasCsv.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'comparacao-estoque.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ComparacaoEstoquePage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [colunas, setColunas] = useState<string[] | null>(null);
  const [colunaSku, setColunaSku] = useState('');
  const [colunaEstoque, setColunaEstoque] = useState('');
  const [resultado, setResultado] = useState<LinhaComparacao[] | null>(null);
  const [linhasComErro, setLinhasComErro] = useState<LinhaComparacaoComErro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const escolherArquivo = async (file: File | null) => {
    setArquivo(file);
    setColunas(null);
    setColunaSku('');
    setColunaEstoque('');
    setResultado(null);
    setLinhasComErro([]);
    setErro(null);
    if (!file) return;

    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      const dados = await apiFetch<ColunasResultado>('/relatorios/comparacao-estoque/colunas', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      setColunas(dados.colunas);
      const acharColuna = (padroes: string[]) =>
        dados.colunas.find((c) => padroes.some((p) => c.toLowerCase().replace(/[\s_]/g, '').includes(p)));
      setColunaSku(acharColuna(['sku', 'codigo', 'referencia']) ?? '');
      setColunaEstoque(acharColuna(['estoque', 'quantidade', 'qtd', 'saldo']) ?? '');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    } finally {
      setCarregando(false);
    }
  };

  const comparar = async () => {
    if (!arquivo || !colunaSku || !colunaEstoque) return;
    setErro(null);
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('mapeamento', JSON.stringify({ sku: { coluna: colunaSku }, estoque: { coluna: colunaEstoque } }));
      const dados = await apiFetch<ResultadoComparacao>('/relatorios/comparacao-estoque/comparar', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      setResultado(dados.linhas);
      setLinhasComErro(dados.linhasComErro);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível comparar o estoque.');
    } finally {
      setCarregando(false);
    }
  };

  const divergencias = resultado?.filter((l) => l.status === 'DIVERGENTE' || l.status === 'NAO_ENCONTRADO_NO_SISTEMA').length ?? 0;

  const [filtroStatus, setFiltroStatus] = useState('');
  const resultadoFiltrado = resultado?.filter((l) => !filtroStatus || l.status === filtroStatus);
  const { linhasOrdenadas: resultadoOrdenado, ordenacao, alternar } = useOrdenacao(resultadoFiltrado, {
    sku: (l) => l.sku,
    nome: (l) => l.nome,
    estoqueCliente: (l) => l.estoqueCliente,
    estoquePrumo: (l) => l.estoquePrumo,
    diferenca: (l) => l.diferenca,
    status: (l) => l.status,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-aco">Comparação de estoque</h1>
        <p className="text-sm text-nevoa">
          Envie a contagem do seu sistema externo e confira contra o Prumo — o Prumo é a referência (fazemos
          inventário nele), a diferença mostra o quanto ele tem a mais ou a menos em relação ao arquivo enviado.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <Field label="Arquivo (CSV ou Excel)">
          <FileDropZone
            accept=".csv,.xlsx,.xls"
            descricaoTipos="CSV ou Excel (.xlsx, .xls)"
            arquivo={arquivo}
            onSelecionar={escolherArquivo}
            disabled={carregando}
          />
        </Field>

        {colunas && (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Coluna de SKU">
              <Select value={colunaSku} onChange={(e) => setColunaSku(e.target.value)} className="w-56">
                <option value="">Selecione…</option>
                {colunas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Coluna de Estoque">
              <Select value={colunaEstoque} onChange={(e) => setColunaEstoque(e.target.value)} className="w-56">
                <option value="">Selecione…</option>
                {colunas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variante="primaria" disabled={!colunaSku || !colunaEstoque || carregando} onClick={comparar}>
              {carregando ? 'Comparando…' : 'Comparar'}
            </Button>
          </div>
        )}

        {erro && <div className="text-sm text-divergente">{erro}</div>}
      </Card>

      {resultado && (
        <>
          {linhasComErro.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-divergente/30 bg-divergente/5 p-3 text-xs">
              <div className="font-semibold text-divergente">
                {linhasComErro.length} linha(s) do arquivo foram ignoradas por não terem SKU ou estoque válidos:
              </div>
              <div className="max-h-32 overflow-y-auto">
                {linhasComErro.map((l) => (
                  <div key={l.linha}>
                    <span className="font-semibold">Linha {l.linha}:</span> {l.motivo}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3 text-xs text-nevoa">
              <span>
                <span className="font-semibold text-aco">{resultado.length}</span> linha(s)
              </span>
              <span>·</span>
              <span>
                <span className={`font-semibold ${divergencias > 0 ? 'text-divergente' : 'text-conforme'}`}>{divergencias}</span> com
                divergência
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-56">
                <option value="">Todos os status</option>
                <option value="OK">Bate certo</option>
                <option value="DIVERGENTE">Divergente</option>
                <option value="NAO_ENCONTRADO_NO_SISTEMA">SKU não existe no Prumo</option>
                <option value="NAO_INFORMADO_PELO_CLIENTE">Não informado pelo cliente</option>
              </Select>
              <Button onClick={() => exportarCsv(resultado)}>Exportar CSV</Button>
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <Th sortKey="sku" ordenacao={ordenacao} onSort={alternar}>
                  SKU
                </Th>
                <Th sortKey="nome" ordenacao={ordenacao} onSort={alternar}>
                  Produto
                </Th>
                <Th sortKey="estoqueCliente" ordenacao={ordenacao} onSort={alternar}>
                  Estoque do cliente
                </Th>
                <Th sortKey="estoquePrumo" ordenacao={ordenacao} onSort={alternar}>
                  Estoque Prumo
                </Th>
                <Th sortKey="diferenca" ordenacao={ordenacao} onSort={alternar}>
                  Diferença
                </Th>
                <Th sortKey="status" ordenacao={ordenacao} onSort={alternar}>
                  Status
                </Th>
              </tr>
            </thead>
            <tbody>
              {resultadoOrdenado?.map((l, i) => (
                <tr key={i}>
                  <Td className="font-mono text-xs">{l.sku}</Td>
                  <Td>{l.nome ?? '—'}</Td>
                  <Td className="[font-variant-numeric:tabular-nums]">{l.estoqueCliente ?? '—'}</Td>
                  <Td className="[font-variant-numeric:tabular-nums]">{l.estoquePrumo ?? '—'}</Td>
                  <Td
                    className={`[font-variant-numeric:tabular-nums] ${
                      l.diferenca ? (l.diferenca > 0 ? 'font-semibold text-conforme' : 'font-semibold text-divergente') : ''
                    }`}
                  >
                    {l.diferenca !== null ? (l.diferenca > 0 ? `+${l.diferenca}` : l.diferenca) : '—'}
                  </Td>
                  <Td>
                    <Badge tom={TOM_STATUS[l.status]}>{ROTULO_STATUS[l.status]}</Badge>
                  </Td>
                </tr>
              ))}
              {resultadoOrdenado && resultadoOrdenado.length === 0 && (
                <tr>
                  <Td className="text-nevoa">Nenhuma linha encontrada.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
