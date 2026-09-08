import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { NotificacoesSino } from './NotificacoesSino';

const NAV_TOPO = [{ to: '/', label: 'Dashboard', fim: true }];

// Telas de cadastro — agrupadas num dropdown pra tirar peso visual do
// menu principal (eram 3 itens soltos entre Dashboard e Estoque).
const NAV_CADASTROS = [
  { to: '/produtos', label: 'Produtos' },
  { to: '/depositos', label: 'Depósitos', papeis: ['ADMIN'] },
  { to: '/enderecos', label: 'Endereços' },
];

const NAV_OPERACIONAL = [
  { to: '/estoque', label: 'Estoque' },
  { to: '/feiras', label: 'Feiras' },
  { to: '/escopos', label: 'Inventários' },
  // Relatórios/comparação expõem catálogo e estoque em massa — mesmo
  // recorte de papel que o backend exige (relatorios.controller.ts).
  { to: '/relatorios/inventario', label: 'Relatórios', papeis: ['ADMIN', 'SUPERVISOR'] },
  { to: '/relatorios/comparacao-estoque', label: 'Comparar estoque', papeis: ['ADMIN', 'SUPERVISOR'] },
];

const NAV_ADMIN = [
  { to: '/admin/usuarios', label: 'Usuários', papeis: ['ADMIN', 'SUPER_ADMIN'] },
  { to: '/admin/empresas', label: 'Empresas', papeis: ['SUPER_ADMIN'] },
  { to: '/admin/auditoria', label: 'Log de Execuções', papeis: ['ADMIN', 'SUPER_ADMIN'] },
];

export function Layout() {
  const { usuario, sair, empresaSelecionada, sairDaEmpresa, temPapel } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const superAdminSemEmpresa = usuario?.papel === 'SUPER_ADMIN' && !empresaSelecionada;
  const mostraNavOperacional = !superAdminSemEmpresa;
  // Rotas operacionais (Dashboard, Produtos, etc.) dependem de uma empresa
  // selecionada — sem isso ficavam travadas em "Carregando…" ou mostrando
  // um catálogo vazio enganoso. Rotas /admin/* continuam acessíveis (é lá
  // que o SUPER_ADMIN escolhe a empresa).
  const precisaEscolherEmpresa = superAdminSemEmpresa && !location.pathname.startsWith('/admin');
  const navCadastros = NAV_CADASTROS.filter((item) => !item.papeis || temPapel(...(item.papeis as ('ADMIN' | 'SUPERVISOR')[])));
  const navOperacional = NAV_OPERACIONAL.filter((item) => !item.papeis || temPapel(...(item.papeis as ('ADMIN' | 'SUPERVISOR')[])));
  const navAdmin = NAV_ADMIN.filter((item) => temPapel(...(item.papeis as ('ADMIN' | 'SUPER_ADMIN')[])));

  const cadastrosAtivo = navCadastros.some((item) => location.pathname.startsWith(item.to));
  const [cadastrosAberto, setCadastrosAberto] = useState(cadastrosAtivo);
  useEffect(() => {
    if (cadastrosAtivo) setCadastrosAberto(true);
  }, [cadastrosAtivo]);

  const aoSairDaEmpresa = () => {
    sairDaEmpresa();
    navigate('/admin/empresas');
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-concreto">
      {/* Barra superior — só em telas estreitas. Padding extra respeita o notch/status bar (iOS). */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-aco px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white md:hidden">
        <button onClick={() => setMenuAberto(true)} aria-label="Abrir menu" className="text-xl">
          ☰
        </button>
        <div className="text-base font-bold tracking-tight text-latao">Prumo</div>
        {mostraNavOperacional && <NotificacoesSino abrirParaBaixo />}
      </div>

      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-aco/50 md:hidden" onClick={() => setMenuAberto(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-aco text-white transition-transform md:static md:z-auto md:w-60 md:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div>
            <div className="text-lg font-bold tracking-tight text-latao">Prumo</div>
            <div className="text-xs text-nevoa">inventário no prumo</div>
          </div>
          <button onClick={() => setMenuAberto(false)} className="text-white md:hidden" aria-label="Fechar menu">
            ✕
          </button>
        </div>

        {usuario?.papel === 'SUPER_ADMIN' && (
          <div className="mx-3 mb-3 rounded-md bg-white/5 px-3 py-2 text-xs">
            {empresaSelecionada ? (
              <>
                <div className="text-nevoa">Operando em</div>
                <div className="truncate font-semibold text-latao">{empresaSelecionada.nome}</div>
                <button onClick={aoSairDaEmpresa} className="mt-1 text-latao-escuro hover:underline">
                  Sair da empresa
                </button>
              </>
            ) : (
              <div className="text-nevoa">Nenhuma empresa selecionada</div>
            )}
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {mostraNavOperacional &&
            NAV_TOPO.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.fim}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-white/10 text-latao font-semibold' : 'text-nevoa hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

          {mostraNavOperacional && navCadastros.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setCadastrosAberto((v) => !v)}
                aria-expanded={cadastrosAberto}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  cadastrosAtivo ? 'bg-white/10 text-latao font-semibold' : 'text-nevoa hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>Cadastros</span>
                <span className={`text-xs transition-transform ${cadastrosAberto ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {cadastrosAberto && (
                <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                  {navCadastros.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuAberto(false)}
                      className={({ isActive }) =>
                        `rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive ? 'bg-white/10 text-latao font-semibold' : 'text-nevoa hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}

          {mostraNavOperacional &&
            navOperacional.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-white/10 text-latao font-semibold' : 'text-nevoa hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

          {navAdmin.length > 0 && (
            <>
              {mostraNavOperacional && <div className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-nevoa/70">Admin</div>}
              {navAdmin.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-white/10 text-latao font-semibold' : 'text-nevoa hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-white/10 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-nevoa">
          {mostraNavOperacional && (
            <div className="mb-2 hidden md:block">
              <NotificacoesSino />
            </div>
          )}
          <div className="font-medium text-white">{usuario?.nome}</div>
          <div>{usuario?.papel}</div>
          <button onClick={sair} className="mt-2 text-latao hover:underline">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-[max(5rem,calc(3.25rem+env(safe-area-inset-top)))] md:p-6 md:pt-6">
        {precisaEscolherEmpresa ? <Navigate to="/admin/empresas" replace /> : <Outlet />}
      </main>
    </div>
  );
}
