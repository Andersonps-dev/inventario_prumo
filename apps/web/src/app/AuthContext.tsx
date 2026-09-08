import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../api/client';

export type Papel = 'CONTADOR' | 'SUPERVISOR' | 'ADMIN' | 'SUPER_ADMIN';

export interface UsuarioAutenticado {
  sub: number;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: number | null;
}

export interface EmpresaSelecionada {
  id: number;
  nome: string;
}

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  entrar: (email: string, senha: string) => Promise<UsuarioAutenticado>;
  sair: () => void;
  temPapel: (...papeis: Papel[]) => boolean;
  /** Empresa em que o SUPER_ADMIN "entrou" para operar (via X-Empresa-Id). Sempre nula para os demais papéis. */
  empresaSelecionada: EmpresaSelecionada | null;
  selecionarEmpresa: (empresa: EmpresaSelecionada) => void;
  sairDaEmpresa: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function carregarUsuario(): UsuarioAutenticado | null {
  const bruto = localStorage.getItem('prumo:usuario');
  return bruto ? (JSON.parse(bruto) as UsuarioAutenticado) : null;
}

function carregarEmpresaSelecionada(): EmpresaSelecionada | null {
  const bruto = localStorage.getItem('prumo:empresaSelecionada');
  return bruto ? (JSON.parse(bruto) as EmpresaSelecionada) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(carregarUsuario);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaSelecionada | null>(carregarEmpresaSelecionada);

  const entrar = async (email: string, senha: string) => {
    const resposta = await apiFetch<{ accessToken: string; usuario: UsuarioAutenticado }>('/auth/login', {
      method: 'POST',
      body: { email, senha },
    });
    localStorage.setItem('prumo:token', resposta.accessToken);
    localStorage.setItem('prumo:usuario', JSON.stringify(resposta.usuario));
    localStorage.removeItem('prumo:empresaSelecionada');
    setEmpresaSelecionada(null);
    setUsuario(resposta.usuario);
    return resposta.usuario;
  };

  const sair = () => {
    localStorage.removeItem('prumo:token');
    localStorage.removeItem('prumo:usuario');
    localStorage.removeItem('prumo:empresaSelecionada');
    setUsuario(null);
    setEmpresaSelecionada(null);
  };

  const temPapel = (...papeis: Papel[]) => !!usuario && (usuario.papel === 'SUPER_ADMIN' || papeis.includes(usuario.papel));

  const selecionarEmpresa = (empresa: EmpresaSelecionada) => {
    localStorage.setItem('prumo:empresaSelecionada', JSON.stringify(empresa));
    setEmpresaSelecionada(empresa);
  };

  const sairDaEmpresa = () => {
    localStorage.removeItem('prumo:empresaSelecionada');
    setEmpresaSelecionada(null);
  };

  const value = useMemo(
    () => ({ usuario, entrar, sair, temPapel, empresaSelecionada, selecionarEmpresa, sairDaEmpresa }),
    [usuario, empresaSelecionada],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return ctx;
}
