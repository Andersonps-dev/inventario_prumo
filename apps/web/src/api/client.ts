const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  return localStorage.getItem('prumo:token');
}

/** Empresa em que o SUPER_ADMIN "entrou" para operar — vai em todo request como X-Empresa-Id. */
function getEmpresaSelecionadaId(): number | null {
  const bruto = localStorage.getItem('prumo:empresaSelecionada');
  if (!bruto) return null;
  try {
    return (JSON.parse(bruto) as { id: number }).id;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const empresaId = getEmpresaSelecionadaId();
  if (empresaId) headers['X-Empresa-Id'] = String(empresaId);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (response.status === 401) {
    localStorage.removeItem('prumo:token');
    localStorage.removeItem('prumo:usuario');
    window.location.href = '/login';
    throw new ApiError(401, 'Sessão expirada.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, payload.message ?? 'Erro inesperado.');
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

function acionarDownloadBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function baixarArquivo(path: string, nomeSugerido: string): Promise<void> {
  const token = getToken();
  const empresaId = getEmpresaSelecionadaId();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers['X-Empresa-Id'] = String(empresaId);
  const response = await fetch(`${BASE_URL}${path}`, { headers });
  if (!response.ok) throw new ApiError(response.status, 'Não foi possível gerar o arquivo.');
  acionarDownloadBlob(await response.blob(), nomeSugerido);
}

function nomeArquivoDoHeader(response: Response, fallback: string): string {
  const disposicao = response.headers.get('content-disposition') ?? '';
  const match = disposicao.match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

/**
 * Dispara uma exportação (POST /exportacoes/:tipo/:formato). Se o backend
 * decidir gerar em segundo plano (dataset grande), faz polling do status até
 * concluir e então baixa o arquivo pronto.
 */
export async function solicitarExportacao(
  tipo: string,
  formato: string,
  filtros: object,
  aoAtualizarStatus?: (status: 'gerando' | 'baixando') => void,
): Promise<void> {
  const token = getToken();
  const empresaId = getEmpresaSelecionadaId();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers['X-Empresa-Id'] = String(empresaId);

  aoAtualizarStatus?.('gerando');
  const response = await fetch(`${BASE_URL}/exportacoes/${tipo}/${formato}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(filtros),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, payload.message ?? 'Não foi possível exportar.');
  }

  if (response.status === 202) {
    const { jobId } = (await response.json()) as { jobId: number };
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const statusResp = await apiFetch<{ status: string; caminho: string | null; erro: string | null }>(
        `/exportacoes/${jobId}`,
      );
      if (statusResp.status === 'CONCLUIDO') break;
      if (statusResp.status === 'ERRO') throw new ApiError(500, statusResp.erro ?? 'Falha ao gerar a exportação.');
    }
    aoAtualizarStatus?.('baixando');
    await baixarArquivo(`/exportacoes/${jobId}/arquivo`, `exportacao.${formato.toLowerCase()}`);
    return;
  }

  const nomeArquivo = nomeArquivoDoHeader(response, `exportacao.${formato.toLowerCase()}`);
  acionarDownloadBlob(await response.blob(), nomeArquivo);
}
