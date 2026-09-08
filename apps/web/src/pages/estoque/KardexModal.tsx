import { Modal } from '../../components/Modal';
import { Table, Th, Td } from '../../components/Table';
import { useKardex } from '../../api/hooks';
import { ExportButton } from '../../components/ExportButton';

export function KardexModal({ produtoId, nome, onClose }: { produtoId: number; nome: string; onClose: () => void }) {
  const { data: movimentos, isLoading } = useKardex(produtoId);

  return (
    <Modal title={`Kardex — ${nome}`} onClose={onClose} largura="max-w-4xl">
      <div className="mb-3 flex justify-end">
        <ExportButton tipo="kardex" filtros={{ produtoId }} />
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Data/hora</Th>
            <Th>Tipo</Th>
            <Th>Qtd.</Th>
            <Th>Saldo</Th>
            <Th>Endereço</Th>
            <Th>Origem</Th>
            <Th>Usuário</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <Td className="text-nevoa">Carregando…</Td>
            </tr>
          )}
          {movimentos?.map((m) => (
            <tr key={m.id}>
              <Td className="text-xs">{new Date(m.criadoEm).toLocaleString('pt-BR')}</Td>
              <Td>{m.tipo}</Td>
              <Td className={Number(m.quantidade) < 0 ? 'text-divergente' : 'text-conforme'}>{m.quantidade}</Td>
              <Td>{m.saldoPosterior}</Td>
              <Td className="font-mono text-xs text-nevoa">{m.endereco.interno ? '—' : m.endereco.codigo}</Td>
              <Td className="max-w-[200px] text-xs">
                {m.origemTipo ?? '—'} {m.origemId ? `#${m.origemId}` : ''}
                {m.motivo && (
                  <div className="truncate italic text-nevoa" title={m.motivo}>
                    {m.motivo}
                  </div>
                )}
              </Td>
              <Td className="max-w-[140px] truncate">
                <span title={m.usuario.nome}>{m.usuario.nome}</span>
              </Td>
            </tr>
          ))}
          {movimentos && movimentos.length === 0 && (
            <tr>
              <Td className="text-nevoa">Sem movimentações.</Td>
            </tr>
          )}
        </tbody>
      </Table>
    </Modal>
  );
}
