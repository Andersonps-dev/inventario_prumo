import { useNavigate } from 'react-router-dom';
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
    <div className="rounded-lg border border-latao/40 bg-latao/5 p-4">
      <h2 className="text-sm font-semibold text-aco">Primeiros passos</h2>
      <p className="mt-1 text-xs text-nevoa">Siga essa ordem pra deixar a empresa pronta pra operar.</p>
      <ol className="mt-3 flex flex-col gap-2">
        {passos.map((p, i) => (
          <li key={p.titulo} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={`flex items-center gap-2 ${p.feito ? 'text-conforme' : 'text-aco'}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  p.feito ? 'bg-conforme/15 text-conforme' : 'bg-nevoa/20 text-nevoa'
                }`}
              >
                {p.feito ? '✓' : i + 1}
              </span>
              {p.titulo}
            </span>
            {!p.feito && (
              <button
                className="shrink-0 text-xs text-latao-escuro hover:underline disabled:cursor-not-allowed disabled:text-nevoa disabled:no-underline"
                disabled={p.bloqueado}
                title={p.bloqueado ? 'Complete os passos anteriores primeiro' : undefined}
                onClick={() => navigate(p.rota)}
              >
                {p.rotulo} →
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
