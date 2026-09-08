import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoesPrazo } from '../api/hooks';

export function NotificacoesSino({ abrirParaBaixo = false }: { abrirParaBaixo?: boolean }) {
  const { data: notificacoes } = useNotificacoesPrazo();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const total = notificacoes?.length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative flex items-center gap-1 rounded-md px-2 py-1.5 text-nevoa hover:bg-white/5 hover:text-white"
        aria-label="Notificações de prazo"
      >
        <span aria-hidden>🔔</span>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-divergente px-1 text-[10px] font-semibold text-white">
            {total}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className={`absolute right-0 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-nevoa/30 bg-white py-1 shadow-xl ${
            abrirParaBaixo ? 'top-full mt-2' : 'bottom-full mb-2 left-0 right-auto'
          }`}
        >
          <div className="border-b border-nevoa/20 px-3 py-2 text-xs font-semibold text-aco">Escopos perto do prazo</div>
          {total === 0 ? (
            <div className="px-3 py-3 text-sm text-nevoa">Nenhum escopo com prazo próximo.</div>
          ) : (
            <ul>
              {notificacoes!.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      setAberto(false);
                      navigate(`/escopos/${n.id}`);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-concreto"
                  >
                    <div className="font-mono text-xs text-nevoa">{n.codigo}</div>
                    <div className="text-aco">{n.titulo}</div>
                    <div className={n.diasAtePrazo !== null && n.diasAtePrazo <= 1 ? 'text-xs text-divergente' : 'text-xs text-latao-escuro'}>
                      {n.diasAtePrazo !== null
                        ? n.diasAtePrazo < 0
                          ? `Vencido há ${Math.abs(n.diasAtePrazo)}d`
                          : n.diasAtePrazo === 0
                            ? 'Vence hoje'
                            : `${n.diasAtePrazo}d até o prazo`
                        : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
