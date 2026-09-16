import { useRef, useState } from 'react';
import { Button } from './Button';
import { solicitarExportacao, ApiError } from '../api/client';
import { useAuth } from '../app/AuthContext';

const FORMATOS = ['CSV', 'XLSX', 'JSON', 'XML'] as const;

export function ExportButton({
  tipo,
  filtros = {},
  rotulo = 'Exportar',
}: {
  tipo: string;
  filtros?: object;
  rotulo?: string;
}) {
  const { temPapel } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<'ocioso' | 'gerando' | 'baixando'>('ocioso');
  const [erro, setErro] = useState<string | null>(null);
  const fecharTimeout = useRef<number | undefined>(undefined);

  // Backend (exportacao.controller.ts) exige ADMIN/SUPERVISOR — esconder o
  // botão pra quem não tem acesso em vez de deixar clicar e tomar 403.
  if (!temPapel('ADMIN', 'SUPERVISOR')) return null;

  const exportar = async (formato: (typeof FORMATOS)[number]) => {
    setAberto(false);
    setErro(null);
    try {
      await solicitarExportacao(tipo, formato, filtros, setEstado);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível exportar.');
    } finally {
      setEstado('ocioso');
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        onClick={() => setAberto((v) => !v)}
        onBlur={() => {
          fecharTimeout.current = window.setTimeout(() => setAberto(false), 150);
        }}
        disabled={estado !== 'ocioso'}
      >
        {estado === 'gerando' ? 'Gerando…' : estado === 'baixando' ? 'Baixando…' : rotulo}
      </Button>
      {aberto && (
        <div className="absolute right-0 z-10 mt-1 w-32 rounded-card border border-stroke bg-card py-1 shadow-lg">
          {FORMATOS.map((f) => (
            <button
              key={f}
              onMouseDown={(e) => {
                e.preventDefault();
                window.clearTimeout(fecharTimeout.current);
                exportar(f);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface"
            >
              {f}
            </button>
          ))}
        </div>
      )}
      {erro && <div className="absolute right-0 top-full mt-1 w-48 text-xs text-danger">{erro}</div>}
    </div>
  );
}
