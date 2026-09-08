import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const EXTENSOES_PERMITIDAS = new Set(['csv', 'xlsx', 'xls']);

function extensao(nomeArquivo: string): string {
  return nomeArquivo.toLowerCase().split('.').pop() ?? '';
}

/**
 * Limite de tamanho + validação de extensão *antes* de qualquer parsing —
 * sem isso, um upload gigante ou de tipo arbitrário vai inteiro pra
 * memória e só falha depois de já ter sido processado (ou nem falha,
 * e derruba o processo).
 */
export const OPCOES_UPLOAD_PLANILHA: MulterOptions = {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!EXTENSOES_PERMITIDAS.has(extensao(file.originalname))) {
      callback(new BadRequestException('Envie um arquivo .csv, .xlsx ou .xls.'), false);
      return;
    }
    callback(null, true);
  },
};
