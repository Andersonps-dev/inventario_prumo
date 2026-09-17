import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Package,
  Scale,
  Settings,
  Store,
  Sun,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './useTheme';

const NAV_TOPO = [{ to: '/', label: 'Dashboard', fim: true, icon: LayoutDashboard }];

// Telas de cadastro — agrupadas num dropdown pra tirar peso visual do
// menu principal (eram 3 itens soltos entre Dashboard e Estoque).
const NAV_CADASTROS = [
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/depositos', label: 'Depósitos', papeis: ['ADMIN'], icon: Warehouse },
  { to: '/enderecos', label: 'Endereços', icon: MapPin },
];

const NAV_OPERACIONAL = [
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/feiras', label: 'Grêmio', icon: Store },
  { to: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
  { to: '/escopos', label: 'Inventários', icon: ClipboardList },
  // Relatórios/comparação expõem catálogo e estoque em massa — mesmo
  // recorte de papel que o backend exige (relatorios.controller.ts).
  { to: '/relatorios/inventario', label: 'Relatórios', papeis: ['ADMIN', 'SUPERVISOR'], icon: BarChart3 },
  { to: '/relatorios/comparacao-estoque', label: 'Comparar estoque', papeis: ['ADMIN', 'SUPERVISOR'], icon: Scale },
];

// Fora do menu principal, atrás do ícone de engrenagem no rodapé — são
// telas de administração, não do dia a dia operacional.
const NAV_ADMIN = [
  { to: '/admin/usuarios', label: 'Usuários', papeis: ['ADMIN', 'SUPER_ADMIN'], icon: Users },
  { to: '/admin/empresas', label: 'Empresas', papeis: ['SUPER_ADMIN'], icon: Building2 },
  { to: '/admin/auditoria', label: 'Log de Execuções', papeis: ['ADMIN', 'SUPER_ADMIN'], icon: History },
];

const ITEM_ATIVO = 'border-l-4 border-primary bg-primary/10 pl-2 font-medium text-primary';
const ITEM_INATIVO = 'border-l-4 border-transparent pl-2 text-muted hover:bg-surface hover:text-ink';

function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/favicon.png" alt="" className="h-7 w-7 shrink-0 rounded-lg" />
      <div className={compacta ? 'text-base font-bold tracking-tight' : 'text-lg font-bold tracking-tight'}>
        <span className="text-ink">In</span>
        <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">vexa</span>
      </div>
    </div>
  );
}

function AdminMenu({ itens }: { itens: { to: string; label: string; icon: LucideIcon }[] }) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  if (itens.length === 0) return null;

  return (
    <div ref={raizRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Administração"
        aria-expanded={aberto}
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors ${
          aberto ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface hover:text-ink'
        }`}
      >
        <Settings size={16} />
      </button>
      {aberto && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded-card border border-stroke bg-card py-1 shadow-lg">
          <div className="border-b border-stroke px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted/70">
            Administração
          </div>
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setAberto(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-primary/10 font-medium text-primary' : 'text-ink hover:bg-surface'
                }`
              }
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { usuario, sair, empresaSelecionada, sairDaEmpresa, temPapel } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div className="flex h-dvh overflow-hidden bg-surface">
      {/* Barra superior — só em telas estreitas. Padding extra respeita o notch/status bar (iOS). */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-stroke bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-ink md:hidden">
        <button onClick={() => setMenuAberto(true)} aria-label="Abrir menu" className="text-muted hover:text-ink">
          <Menu size={22} />
        </button>
        <Marca compacta />
        <div className="w-[22px]" aria-hidden />
      </div>

      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMenuAberto(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-stroke bg-card text-ink transition-transform md:static md:z-auto md:w-60 md:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <Marca />
          <button onClick={() => setMenuAberto(false)} className="text-muted hover:text-ink md:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {usuario?.papel === 'SUPER_ADMIN' && (
          <div className="mx-3 mb-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            {empresaSelecionada ? (
              <>
                <div className="text-muted">Operando em</div>
                <div className="truncate font-semibold text-primary">{empresaSelecionada.nome}</div>
                <button onClick={aoSairDaEmpresa} className="mt-1 text-muted hover:text-ink hover:underline">
                  Sair da empresa
                </button>
              </>
            ) : (
              <div className="text-muted">Nenhuma empresa selecionada</div>
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
                  `flex items-center gap-2 rounded-r-md py-2 text-sm transition-colors ${isActive ? ITEM_ATIVO : ITEM_INATIVO}`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}

          {mostraNavOperacional && navCadastros.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setCadastrosAberto((v) => !v)}
                aria-expanded={cadastrosAberto}
                className={`flex w-full items-center justify-between rounded-r-md py-2 pr-3 text-sm transition-colors ${
                  cadastrosAtivo ? ITEM_ATIVO : ITEM_INATIVO
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers size={16} />
                  Cadastros
                </span>
                <ChevronDown size={14} className={`transition-transform ${cadastrosAberto ? 'rotate-180' : ''}`} />
              </button>
              {cadastrosAberto && (
                <div className="ml-3 flex flex-col gap-1 border-l border-stroke pl-3">
                  {navCadastros.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuAberto(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted hover:bg-surface hover:text-ink'
                        }`
                      }
                    >
                      <item.icon size={15} />
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
                  `flex items-center gap-2 rounded-r-md py-2 text-sm transition-colors ${isActive ? ITEM_ATIVO : ITEM_INATIVO}`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-stroke px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted">
          <div className="mb-2 flex items-center gap-1">
            <AdminMenu itens={navAdmin} />
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-muted hover:bg-surface hover:text-ink"
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <div className="font-medium text-ink">{usuario?.nome}</div>
          <div>{usuario?.papel}</div>
          <button onClick={sair} className="mt-2 flex items-center gap-1 text-primary hover:underline">
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-[max(5rem,calc(3.25rem+env(safe-area-inset-top)))] md:p-6 md:pt-6">
        {precisaEscolherEmpresa ? <Navigate to="/admin/empresas" replace /> : <Outlet />}
      </main>
    </div>
  );
}
