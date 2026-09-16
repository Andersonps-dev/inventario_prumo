import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { Button } from '../../components/Button';
import { Field, Input } from '../../components/Input';
import { ApiError } from '../../api/client';

export function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const usuarioLogado = await entrar(email, senha);
      navigate(usuarioLogado.papel === 'SUPER_ADMIN' ? '/admin/empresas' : '/');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-card border border-stroke bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/favicon.png" alt="" className="mb-2 h-12 w-12 rounded-xl" />
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-ink">In</span>
            <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">vexa</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Senha">
            <div className="relative">
              <Input
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full pr-9"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {erro && <div className="text-sm text-danger">{erro}</div>}

          <Button type="submit" variante="primaria" disabled={carregando} className="mt-2 w-full">
            {carregando ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
