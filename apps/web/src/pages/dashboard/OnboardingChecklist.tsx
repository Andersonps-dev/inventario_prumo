import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { useDepositos, useEnderecos, useEscopos, useProdutos } from '../../api/hooks';
import { useAuth } from '../../app/AuthContext';

interface Passo {
  titulo: string;
  feito: boolean;
  rota: string;
  rotulo: string;
  bloqueado: boolean;
}

export function OnboardingChecklist() {
  const { temPapel } = useAuth();
  const navigate = useNavigate();

  const { data: depositos } = useDepositos({ ativo: true });
  const { data: enderecos } = useEnderecos({ ativo: true });
  const { data: produtos } = useProdutos({ ativo: true, pagina: 1 });
  const { data: escopos } = useEscopos();

  // Cadastro é coisa de ADMIN/SUPERVISOR — CONTADOR não tem ação nenhuma aqui.
  if (!temPapel('ADMIN', 'SUPERVISOR')) return null;
  // Espera os 4 carregarem antes de decidir, pra não piscar o card à toa.
  if (!depositos || !enderecos || !produtos || !escopos) return null;

  const temDeposito = depositos.length > 0;
  const temEndereco = enderecos.length > 0;
  const temProduto = produtos.itens.length > 0;
  const temEscopo = escopos.length > 0;

  // Empresa já operacional (tem os 3 cadastros base) — o card não tem mais valor aqui.
  if (temDeposito && temEndereco && temProduto) return null;

  const passos: Passo[] = [
    { titulo: 'Cadastrar um depósito', feito: temDeposito, rota: '/depositos', rotulo: 'Cadastrar depósito', bloqueado: false },
    { titulo: 'Cadastrar endereços', feito: temEndereco, rota: '/enderecos', rotulo: 'Cadastrar endereços', bloqueado: !temDeposito },
    { titulo: 'Cadastrar produtos (ou importar planilha)', feito: temProduto, rota: '/produtos', rotulo: 'Cadastrar produtos', bloqueado: false },
    {
      titulo: 'Criar o primeiro inventário',
      feito: temEscopo,
      rota: '/escopos',
      rotulo: 'Criar inventário',
      bloqueado: !temDeposito || !temEndereco || !temProduto,
    },
  ];

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
      <h2 className="text-sm font-semibold text-ink">Primeiros passos</h2>
      <p className="mt-1 text-xs text-muted">Siga essa ordem pra deixar a empresa pronta pra operar.</p>
      <ol className="mt-3 flex flex-col gap-2">
        {passos.map((p, i) => (
          <li key={p.titulo} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={`flex items-center gap-2 ${p.feito ? 'text-success' : 'text-ink'}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  p.feito ? 'bg-success/15 text-success' : 'bg-stroke/20 text-muted'
                }`}
              >
                {p.feito ? <Check size={12} /> : i + 1}
              </span>
              {p.titulo}
            </span>
            {!p.feito && (
              <button
                className="flex shrink-0 items-center gap-0.5 text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                disabled={p.bloqueado}
                title={p.bloqueado ? 'Complete os passos anteriores primeiro' : undefined}
                onClick={() => navigate(p.rota)}
              >
                {p.rotulo} <ChevronRight size={13} />
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
