import { useEffect } from 'react';

/**
 * Atalhos de teclado globais. `Escape` sempre dispara, mesmo com foco num
 * campo de texto (para permitir cancelar a ação em andamento); as demais
 * teclas são ignoradas enquanto o usuário digita em input/textarea/select.
 */
export function useAtalhos(mapa: Record<string, () => void>) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && mapa.Escape) {
        mapa.Escape();
        return;
      }
      const alvo = evento.target as HTMLElement;
      const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
      if (digitando) return;

      const acao = mapa[evento.key];
      if (acao) {
        evento.preventDefault();
        acao();
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [mapa]);
}
