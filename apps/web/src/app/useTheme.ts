import { useCallback, useEffect, useState } from 'react';

type Tema = 'light' | 'dark';

const CHAVE = 'invexa-theme';

function lerTemaSalvo(): Tema | null {
  const salvo = localStorage.getItem(CHAVE);
  return salvo === 'light' || salvo === 'dark' ? salvo : null;
}

function temaAtual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Espelha o script inline do index.html: aquele evita o flash no primeiro
 * paint aplicando a classe antes do React montar; este hook só lê o estado
 * já aplicado e oferece a alternância.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Tema>(() => lerTemaSalvo() ?? temaAtual());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem(CHAVE, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
