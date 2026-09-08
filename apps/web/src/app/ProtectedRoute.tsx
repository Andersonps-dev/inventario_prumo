import { Navigate } from 'react-router-dom';
import { useAuth, type Papel } from './AuthContext';
import { VoltarLink } from '../components/VoltarLink';
import { Card } from '../components/Card';

export function ProtectedRoute({ children, papeis }: { children: React.ReactNode; papeis?: Papel[] }) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/login" replace />;
  if (papeis && usuario.papel !== 'SUPER_ADMIN' && !papeis.includes(usuario.papel)) {
    return (
      <div className="flex flex-col items-start">
        <VoltarLink to="/" label="Início" />
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-divergente/10 text-lg text-divergente" aria-hidden>
            🔒
          </div>
          <div>
            <div className="text-sm font-semibold text-aco">Acesso restrito</div>
            <p className="text-sm text-nevoa">Seu papel ({usuario.papel}) não tem acesso a esta página.</p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
