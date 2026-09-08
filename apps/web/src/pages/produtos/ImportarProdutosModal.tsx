import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Field, Input, Select } from '../../components/Input';
import { FileDropZone } from '../../components/FileDropZone';
import { ProgressBar } from '../../components/ProgressBar';
import { Table, Th, Td } from '../../components/Table';
import { apiFetch } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface CampoSistema {
  chave: string;
  titulo: string;
  obrigatorio: boolean;
}

interface ColunasResultado {
  colunas: string[];
  camposSistema: CampoSistema[];
}

interface MapeamentoCampo {
  coluna?: string;
  padrao?: string;
}

type Mapeamento = Record<string, MapeamentoCampo>;

interface LinhaValidada {
  linha: number;
  sku: string;
  nome: string;
  erros: string[];
}

interface PreviaResultado {
  validas: LinhaValidada[];
  comErro: LinhaValidada[];
}

const VALOR_NAO_MAPEADO = '__nao_mapeado__';

// Casa coluna do arquivo com campo do sistema por padrões plausíveis, não só
// nome idêntico — mesma ideia já usada em ComparacaoEstoquePage.tsx. "nome"
// aceita "descricao" porque em muitos ERPs a coluna de descrição É o nome
// do produto; o campo "descricao" do Prumo (texto extra opcional) só casa
// com padrões mais específicos pra não competir pela mesma coluna.
const PADROES_CAMPO: Record<string, string[]> = {
  sku: ['sku', 'codigo', 'referencia', 'cod'],
  nome: ['nome', 'produto', 'titulo', 'descricao', 'desc'],
  codigoBarras: ['codigobarras', 'barras', 'ean', 'gtin'],
  descricao: ['detalhe', 'observacao', 'obs'],
  unidade: ['unidade', 'medida'],
  precoCusto: ['preco', 'custo', 'valor'],
  estoqueMinimo: ['minimo', 'qtdminima'],
};

type Passo = 'arquivo' | 'mapeamento' | 'previa' | 'resultado';

const PASSOS: { chave: Passo; rotulo: string }[] = [
  { chave: 'arquivo', rotulo: 'Arquivo' },
  { chave: 'mapeamento', rotulo: 'Mapeamento' },
  { chave: 'previa', rotulo: 'Prévia' },
  { chave: 'resultado', rotulo: 'Concluído' },
];

export function ImportarProdutosModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [passo, setPasso] = useState<Passo>('arquivo');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [colunasInfo, setColunasInfo] = useState<ColunasResultado | null>(null);
  const [mapeamento, setMapeamento] = useState<Mapeamento>({});
  const [previa, setPrevia] = useState<PreviaResultado | null>(null);
  const [resultado, setResultado] = useState<{ criados: number; ignorados: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const escolherArquivo = async (file: File | null) => {
    setArquivo(file);
    setColunasInfo(null);
    setMapeamento({});
    setPrevia(null);
    setResultado(null);
    setErro(null);
    if (!file) {
      setPasso('arquivo');
      return;
    }

    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      const dados = await apiFetch<ColunasResultado>('/produtos/importar/colunas', { method: 'POST', body: formData, isFormData: true });
      setColunasInfo(dados);
      // Tenta casar automaticamente colunas com nome igual/parecido ao campo do sistema.
      const inicial: Mapeamento = {};
      const usadas = new Set<string>();
      for (const campo of dados.camposSistema) {
        const padroes = PADROES_CAMPO[campo.chave] ?? [campo.chave.toLowerCase()];
        const achada = dados.colunas.find((c) => {
          if (usadas.has(c)) return false;
          const normalizado = c.toLowerCase().replace(/[\s_]/g, '');
          return padroes.some((p) => normalizado.includes(p));
        });
        if (achada) {
          inicial[campo.chave] = { coluna: achada };
          usadas.add(achada);
        }
      }
      setMapeamento(inicial);
      setPasso('mapeamento');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    } finally {
      setCarregando(false);
    }
  };

  const definirColuna = (chave: string, coluna: string) => {
    setMapeamento((atual) => ({
      ...atual,
      [chave]: coluna === VALOR_NAO_MAPEADO ? { padrao: atual[chave]?.padrao } : { coluna },
    }));
  };

  const definirPadrao = (chave: string, padrao: string) => {
    setMapeamento((atual) => ({ ...atual, [chave]: { padrao } }));
  };

  const mapeamentoValido = !!mapeamento.sku?.coluna && !!mapeamento.nome?.coluna;

  const gerarPrevia = async () => {
    if (!arquivo) return;
    setErro(null);
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('mapeamento', JSON.stringify(mapeamento));
      const dados = await apiFetch<PreviaResultado>('/produtos/importar/previa', { method: 'POST', body: formData, isFormData: true });
      setPrevia(dados);
      setPasso('previa');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível validar o arquivo.');
    } finally {
      setCarregando(false);
    }
  };

  const confirmar = async () => {
    if (!arquivo) return;
    setErro(null);
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('mapeamento', JSON.stringify(mapeamento));
      const dados = await apiFetch<{ criados: number; ignorados: number }>('/produtos/importar/confirmar', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      setResultado(dados);
      setPasso('resultado');
      qc.invalidateQueries({ queryKey: ['produtos'] });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível gravar os produtos.');
    } finally {
      setCarregando(false);
    }
  };

  const indicePasso = PASSOS.findIndex((p) => p.chave === passo);

  return (
    <Modal title="Importar produtos" onClose={onClose} largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-nevoa">
            Passo {indicePasso + 1} de {PASSOS.length} — {PASSOS[indicePasso].rotulo}
          </div>
          <ProgressBar percentual={((indicePasso + 1) / PASSOS.length) * 100} />
        </div>

        {passo === 'arquivo' && (
          <>
            <p className="text-xs text-nevoa">
              Envie um arquivo CSV ou Excel (.xlsx) do seu sistema — no próximo passo você escolhe qual coluna do seu
              arquivo corresponde a cada campo do Prumo.
            </p>
            <FileDropZone
              accept=".csv,.xlsx,.xls"
              descricaoTipos="CSV ou Excel (.xlsx, .xls)"
              arquivo={arquivo}
              onSelecionar={escolherArquivo}
              disabled={carregando}
            />
            {carregando && <div className="text-sm text-nevoa">Lendo colunas do arquivo…</div>}
            {erro && <div className="text-sm text-divergente">{erro}</div>}
          </>
        )}

        {passo === 'mapeamento' && colunasInfo && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-nevoa">
              Escolha de qual coluna do seu arquivo vem cada campo. Campos não mapeados usam o valor padrão informado.
            </p>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Campo do Prumo</Th>
                    <Th>De: (coluna do seu arquivo)</Th>
                    <Th>Ou valor padrão</Th>
                  </tr>
                </thead>
                <tbody>
                  {colunasInfo.camposSistema.map((campo) => {
                    const atual = mapeamento[campo.chave] ?? {};
                    return (
                      <tr key={campo.chave}>
                        <Td>
                          {campo.titulo}
                          {campo.obrigatorio && <span className="text-divergente"> *</span>}
                        </Td>
                        <Td>
                          <Select value={atual.coluna ?? VALOR_NAO_MAPEADO} onChange={(e) => definirColuna(campo.chave, e.target.value)}>
                            <option value={VALOR_NAO_MAPEADO}>— não mapear —</option>
                            {colunasInfo.colunas.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
                        </Td>
                        <Td>
                          <Input
                            placeholder={campo.obrigatorio ? '(obrigatório mapear)' : 'ex.: UN'}
                            disabled={!!atual.coluna || campo.obrigatorio}
                            value={atual.coluna ? '' : (atual.padrao ?? '')}
                            onChange={(e) => definirPadrao(campo.chave, e.target.value)}
                            className="w-32"
                          />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {erro && <div className="text-sm text-divergente">{erro}</div>}

            <div className="flex justify-between gap-2">
              <Button onClick={() => escolherArquivo(null)}>Trocar arquivo</Button>
              <div className="flex gap-2">
                <Button onClick={onClose}>Cancelar</Button>
                <Button variante="primaria" disabled={!mapeamentoValido || carregando} onClick={gerarPrevia}>
                  {carregando ? 'Validando…' : 'Gerar prévia'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {passo === 'previa' && previa && (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-aco">
              <span className="font-semibold text-conforme">{previa.validas.length}</span> linha(s) válida(s) ·{' '}
              <span className="font-semibold text-divergente">{previa.comErro.length}</span> com erro
            </div>
            {previa.comErro.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-divergente/30 bg-divergente/5 p-3 text-xs">
                {previa.comErro.map((linha) => (
                  <div key={linha.linha} className="mb-1">
                    <span className="font-semibold">Linha {linha.linha}</span> ({linha.sku || '—'}): {linha.erros.join(', ')}
                  </div>
                ))}
              </div>
            )}
            {erro && <div className="text-sm text-divergente">{erro}</div>}
            <div className="flex justify-end gap-2">
              <Button onClick={() => setPasso('mapeamento')}>Voltar ao mapeamento</Button>
              <Button variante="primaria" disabled={previa.validas.length === 0 || carregando} onClick={confirmar}>
                {carregando ? 'Gravando…' : `Gravar ${previa.validas.length} produto(s)`}
              </Button>
            </div>
          </div>
        )}

        {passo === 'resultado' && resultado && (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-conforme">
              {resultado.criados} produto(s) criado(s). {resultado.ignorados} ignorado(s) por erro.
            </div>
            <Button variante="primaria" onClick={onClose}>
              Concluir
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
