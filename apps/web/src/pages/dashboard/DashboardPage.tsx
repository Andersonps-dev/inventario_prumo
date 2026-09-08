import { useState } from 'react';
import { FiltrosGlobais } from './FiltrosGlobais';
import { BlocoSaude } from './BlocoSaude';
import { BlocoQualidade } from './BlocoQualidade';
import { BlocoOperacao } from './BlocoOperacao';
import { OnboardingChecklist } from './OnboardingChecklist';
import { ExportButton } from '../../components/ExportButton';
import type { FiltrosDashboard } from '../../api/hooks';

export function DashboardPage() {
  const [filtros, setFiltros] = useState<FiltrosDashboard>({});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-aco">Dashboard</h1>
        <ExportButton tipo="dashboard" filtros={filtros} />
      </div>
      <OnboardingChecklist />
      <FiltrosGlobais filtros={filtros} onChange={setFiltros} />
      <BlocoSaude filtros={filtros} />
      <BlocoQualidade filtros={filtros} />
      <BlocoOperacao filtros={filtros} />
    </div>
  );
}
