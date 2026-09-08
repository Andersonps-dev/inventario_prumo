import { useMemo, useState } from 'react';

export type Direcao = 'asc' | 'desc';

type Acessor<T> = (item: T) => string | number | boolean | null | undefined;

/**
 * Ordenação client-side genérica pra qualquer tabela — cada coluna
 * ordenável registra seu próprio acessor (ex.: { nome: (p) => p.nome }),
 * clicar no cabeçalho (via <Th sortKey="nome">) chama `alternar('nome')`.
 * Clicar de novo no mesmo campo inverte a direção; trocar de campo
 * reinicia em ascendente.
 */
export function useOrdenacao<T>(linhas: T[] | undefined, campos: Record<string, Acessor<T>>) {
  const [campoAtual, setCampoAtual] = useState<string | null>(null);
  const [direcao, setDirecao] = useState<Direcao>('asc');

  const alternar = (campo: string) => {
    if (campoAtual === campo) {
      setDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setCampoAtual(campo);
      setDirecao('asc');
    }
  };

  const linhasOrdenadas = useMemo(() => {
    if (!linhas || !campoAtual) return linhas;
    const acessor = campos[campoAtual];
    if (!acessor) return linhas;
    const copia = [...linhas].sort((a, b) => {
      const va = acessor(a);
      const vb = acessor(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      if (typeof va === 'boolean' && typeof vb === 'boolean') return va === vb ? 0 : va ? -1 : 1;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' });
    });
    return direcao === 'desc' ? copia.reverse() : copia;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, campoAtual, direcao]);

  return { linhasOrdenadas, ordenacao: { campo: campoAtual, direcao }, alternar };
}
