import { Field, Input, Select } from '../../components/Input';
import { Card } from '../../components/Card';
import { useDepositos } from '../../api/hooks';
import type { FiltrosDashboard } from '../../api/hooks';

export function FiltrosGlobais({ filtros, onChange }: { filtros: FiltrosDashboard; onChange: (f: FiltrosDashboard) => void }) {
  const { data: depositos } = useDepositos();

  return (
    <Card padding="p-3" className="flex flex-wrap items-end gap-3">
      <Field label="Depósito">
        <Select
          value={filtros.depositoId ?? ''}
          onChange={(e) => onChange({ ...filtros, depositoId: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Todos</option>
          {depositos?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="De">
        <Input type="date" value={filtros.dataInicio ?? ''} onChange={(e) => onChange({ ...filtros, dataInicio: e.target.value || undefined })} />
      </Field>
      <Field label="Até">
        <Input type="date" value={filtros.dataFim ?? ''} onChange={(e) => onChange({ ...filtros, dataFim: e.target.value || undefined })} />
      </Field>
      {(filtros.depositoId || filtros.dataInicio || filtros.dataFim) && (
        <button className="text-xs text-primary hover:underline" onClick={() => onChange({})}>
          Limpar filtros
        </button>
      )}
    </Card>
  );
}
