import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProdutosPage } from '../pages/produtos/ProdutosPage';
import { DepositosPage } from '../pages/admin/DepositosPage';
import { EtiquetasPage } from '../pages/produtos/EtiquetasPage';
import { EnderecosPage } from '../pages/enderecos/EnderecosPage';
import { EnderecosEtiquetasPage } from '../pages/enderecos/EnderecosEtiquetasPage';
import { EstoquePage } from '../pages/estoque/EstoquePage';
import { EscoposListPage } from '../pages/escopos/EscoposListPage';
import { EscopoDetailPage } from '../pages/escopos/EscopoDetailPage';
import { RelatorioInventarioPage } from '../pages/relatorios/RelatorioInventarioPage';
import { ComparacaoEstoquePage } from '../pages/relatorios/ComparacaoEstoquePage';
import { FeirasPage } from '../pages/feiras/FeirasPage';
import { FeiraDetailPage } from '../pages/feiras/FeiraDetailPage';
import { TransferenciasListPage } from '../pages/transferencias/TransferenciasListPage';
import { TransferenciaDetailPage } from '../pages/transferencias/TransferenciaDetailPage';
import { EmpresasPage } from '../pages/admin/EmpresasPage';
import { UsuariosPage } from '../pages/admin/UsuariosPage';
import { AuditoriaPage } from '../pages/admin/AuditoriaPage';

// Título da aba = nome da tela + marca — mapeado por rota em vez de cada
// página chamar um hook próprio, pra não esquecer nenhuma. Rotas com :id
// (feira/inventário específico) caem no prefixo genérico.
const TITULOS_POR_ROTA: Record<string, string> = {
  '/login': 'Entrar',
  '/': 'Dashboard',
  '/produtos': 'Produtos',
  '/produtos/etiquetas': 'Etiquetas de produtos',
  '/depositos': 'Depósitos',
  '/enderecos': 'Endereços',
  '/enderecos/etiquetas': 'Etiquetas de endereços',
  '/estoque': 'Estoque',
  '/feiras': 'Grêmio',
  '/transferencias': 'Transferências',
  '/escopos': 'Inventários',
  '/relatorios/inventario': 'Relatório de inventário',
  '/relatorios/comparacao-estoque': 'Comparação de estoque',
  '/admin/usuarios': 'Usuários',
  '/admin/empresas': 'Empresas',
  '/admin/auditoria': 'Log de Execuções',
};

const PREFIXOS_POR_ROTA: [string, string][] = [
  ['/escopos/', 'Inventário'],
  ['/feiras/', 'Grêmio'],
  ['/transferencias/', 'Transferência'],
];

function tituloDaRota(pathname: string): string | undefined {
  if (TITULOS_POR_ROTA[pathname]) return TITULOS_POR_ROTA[pathname];
  return PREFIXOS_POR_ROTA.find(([prefixo]) => pathname.startsWith(prefixo))?.[1];
}

function useTituloDaAba() {
  const location = useLocation();
  useEffect(() => {
    const titulo = tituloDaRota(location.pathname);
    document.title = titulo ? `${titulo} — Invexa` : 'Invexa — inventário exato';
  }, [location.pathname]);
}

export function App() {
  useTituloDaAba();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/produtos" element={<ProdutosPage />} />
        <Route path="/produtos/etiquetas" element={<EtiquetasPage />} />
        <Route
          path="/depositos"
          element={
            <ProtectedRoute papeis={['ADMIN']}>
              <DepositosPage />
            </ProtectedRoute>
          }
        />
        <Route path="/enderecos" element={<EnderecosPage />} />
        <Route path="/enderecos/etiquetas" element={<EnderecosEtiquetasPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/feiras" element={<FeirasPage />} />
        <Route path="/feiras/:id" element={<FeiraDetailPage />} />
        <Route path="/transferencias" element={<TransferenciasListPage />} />
        <Route path="/transferencias/:id" element={<TransferenciaDetailPage />} />
        <Route path="/escopos" element={<EscoposListPage />} />
        <Route path="/escopos/:id" element={<EscopoDetailPage />} />
        <Route
          path="/relatorios/inventario"
          element={
            <ProtectedRoute papeis={['ADMIN', 'SUPERVISOR']}>
              <RelatorioInventarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios/comparacao-estoque"
          element={
            <ProtectedRoute papeis={['ADMIN', 'SUPERVISOR']}>
              <ComparacaoEstoquePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute papeis={['ADMIN']}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/empresas"
          element={
            <ProtectedRoute papeis={['SUPER_ADMIN']}>
              <EmpresasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/auditoria"
          element={
            <ProtectedRoute papeis={['ADMIN']}>
              <AuditoriaPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
