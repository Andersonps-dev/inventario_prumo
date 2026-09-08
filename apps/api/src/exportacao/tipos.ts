export interface Coluna {
  chave: string;
  titulo: string;
}

export interface Planilha {
  nome: string;
  colunas: Coluna[];
  linhas: Record<string, unknown>[];
}

export interface DadosExportacao {
  nomeArquivo: string;
  planilhas: Planilha[];
  /** Estrutura aninhada opcional usada apenas na exportação JSON (ex.: escopo → itens → contagens). */
  jsonAninhado?: unknown;
}
