import { Navigate, Route, Routes } from 'react-router-dom';
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
import { EmpresasPage } from '../pages/admin/EmpresasPage';
import { UsuariosPage } from '../pages/admin/UsuariosPage';
import { AuditoriaPage } from '../pages/admin/AuditoriaPage';

export function App() {
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
