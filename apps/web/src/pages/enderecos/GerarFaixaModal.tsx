import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Field, Input, Select } from '../../components/Input';
import { useGerarFaixaConfirmar, useGerarFaixaPrevia } from '../../api/hooks';
import { ApiError } from '../../api/client';
import type { Endereco, SegmentoFaixa, TipoSegmentoFaixa } from '../../api/types';

const SEGMENTOS: { chave: 'setor' | 'rua' | 'modulo' | 'nivel' | 'vao'; rotulo: string }[] = [
  { chave: 'setor', rotulo: 'Setor' },
  { chave: 'rua', rotulo: 'Rua' },
  { chave: 'modulo', rotulo: 'Módulo' },
  { chave: 'nivel', rotulo: 'Nível' },
  { chave: 'vao', rotulo: 'Vão' },
];

const SEGMENTO_VAZIO: SegmentoFaixa = { tipo: 'fixo', valor: '' };

export function GerarFaixaModal({ depositoId, onClose }: { depositoId: number; onClose: () => void }) {
  const navigate = useNavigate();
  const previa = useGerarFaixaPrevia();
  const confirmar = useGerarFaixaConfirmar();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ criados: number; enderecos: Endereco[] } | null>(null);

  const [form, setForm] = useState<Record<string, SegmentoFaixa>>({
    setor: { ...SEGMENTO_VAZIO },
    rua: { ...SEGMENTO_VAZIO },
    modulo: { ...SEGMENTO_VAZIO },
    nivel: { ...SEGMENTO_VAZIO },
    vao: { ...SEGMENTO_VAZIO },
  });

  const alterarSegmento = (chave: string, patch: Partial<SegmentoFaixa>) => {
    setForm((atual) => ({ ...atual, [chave]: { ...atual[chave], ...patch } }));
  };

  const alterarTipo = (chave: string, tipo: TipoSegmentoFaixa) => {
    setForm((atual) => ({
      ...atual,
      [chave]: tipo === 'fixo' ? { tipo, valor: '' } : { tipo, inicio: '', fim: '', passo: 1 },
    }));
  };

  const payload = () => ({
    depositoId,
    setor: form.setor,
    rua: form.rua,
    modulo: form.modulo,
    nivel: form.nivel,
    vao: form.vao,
  });

  const gerarPrevia = async () => {
    setErro(null);
    try {
      await previa.mutateAsync(payload());
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível calcular a prévia.');
    }
  };

  const confirmarGeracao = async () => {
    setErro(null);
    try {
      const dados = await confirmar.mutateAsync(payload());
      setResultado(dados);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível gerar os endereços.');
    }
  };

  const irParaEtiquetas = () => {
    if (!resultado) return;
    navigate('/enderecos/etiquetas', { state: { enderecos: resultado.enderecos } });
  };

  return (
    <Modal title="Gerar endereços por faixa" onClose={onClose} largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        {!resultado && (
          <>
            <p className="text-xs text-muted">
              Cada segmento pode ser um valor fixo ou uma faixa (início–fim, com passo). O código final combina os
              cinco segmentos: Setor-Rua-Módulo-Nível-Vão. Faixas numéricas preservam os zeros à esquerda do início;
              faixas de uma letra vão de A a Z.
            </p>

            <div className="flex flex-col gap-3">
              {SEGMENTOS.map(({ chave, rotulo }) => {
                const seg = form[chave];
                return (
                  <div key={chave} className="flex items-end gap-2 rounded-md border border-stroke/20 p-2">
                    <Field label={rotulo}>
                      <Select value={seg.tipo} onChange={(e) => alterarTipo(chave, e.target.value as TipoSegmentoFaixa)} className="w-28">
                        <option value="fixo">Fixo</option>
                        <option value="faixa">Faixa</option>
                      </Select>
                    </Field>
                    {seg.tipo === 'fixo' ? (
                      <Field label="Valor">
                        <Input
                          value={seg.valor ?? ''}
                          onChange={(e) => alterarSegmento(chave, { valor: e.target.value })}
                          className="w-32"
                        />
                      </Field>
                    ) : (
                      <>
                        <Field label="Início">
                          <Input value={seg.inicio ?? ''} onChange={(e) => alterarSegmento(chave, { inicio: e.target.value })} className="w-24" />
                        </Field>
                        <Field label="Fim">
                          <Input value={seg.fim ?? ''} onChange={(e) => alterarSegmento(chave, { fim: e.target.value })} className="w-24" />
                        </Field>
                        <Field label="Passo">
                          <Input
                            type="number"
                            min={1}
                            value={seg.passo ?? 1}
                            onChange={(e) => alterarSegmento(chave, { passo: Number(e.target.value) })}
                            className="w-20"
                          />
                        </Field>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {erro && <div className="text-sm text-danger">{erro}</div>}

            {!previa.data && (
              <div className="flex justify-end gap-2">
                <Button onClick={onClose}>Cancelar</Button>
                <Button variante="primaria" disabled={previa.isPending} onClick={gerarPrevia}>
                  {previa.isPending ? 'Calculando…' : 'Gerar prévia'}
                </Button>
              </div>
            )}

            {previa.data && (
              <div className="flex flex-col gap-3 rounded-md border border-stroke/20 bg-surface p-3">
                <div className="text-sm text-ink">
                  <span className="font-semibold">{previa.data.total}</span> endereço(s) no total ·{' '}
                  <span className="font-semibold text-success">{previa.data.novos}</span> novo(s) ·{' '}
                  <span className="font-semibold text-danger">{previa.data.duplicados}</span> já existente(s)
                </div>
                {previa.data.amostra.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {previa.data.amostra.map((c) => (
                      <span key={c} className="rounded bg-card px-2 py-1 font-mono text-xs text-ink shadow-sm">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button onClick={onClose}>Cancelar</Button>
                  <Button variante="primaria" disabled={previa.data.novos === 0 || confirmar.isPending} onClick={confirmarGeracao}>
                    {confirmar.isPending ? 'Gravando…' : `Confirmar e criar ${previa.data.novos} endereço(s)`}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {resultado && (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-success">{resultado.criados} endereço(s) criado(s) com sucesso.</div>
            <div className="flex justify-end gap-2">
              <Button variante="primaria" onClick={irParaEtiquetas}>
                Imprimir etiquetas destes {resultado.criados}
              </Button>
              <Button onClick={onClose}>Concluir</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
