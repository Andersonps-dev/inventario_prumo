import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent, LabelHTMLAttributes, OptionHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function Field({ label, children, ...props }: { label: string; children: React.ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink" {...props}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border border-stroke bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary ${props.className ?? ''}`}
    />
  );
}

interface Opcao {
  valor: string;
  rotulo: string;
}

// <option>SKU — {nome}</option> compila pra um array de children (texto +
// expressão), não uma string única — precisa juntar tudo, não só aceitar
// o caso de um filho único.
function textoDeChildren(children: ReactNode): string {
  return Children.toArray(children)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join('');
}

// <Select> aceita os mesmos <option> de sempre como children — só extrai
// {value, texto} de cada um pra alimentar a lista filtrável abaixo. Isso
// mantém toda tela existente funcionando sem tocar em nenhum call site.
function extrairOpcoes(children: ReactNode): Opcao[] {
  const opcoes: Opcao[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    const props = child.props as OptionHTMLAttributes<HTMLOptionElement>;
    opcoes.push({ valor: props.value !== undefined ? String(props.value) : '', rotulo: textoDeChildren(props.children) });
  });
  return opcoes;
}

/**
 * Visualmente e funcionalmente um <select>, mas digitável — sem isso, uma
 * lista longa (produtos, endereços, escopos) só dava pra navegar rolando
 * opção por opção. Digitar filtra a lista; selecionar (clique, Enter ou
 * Tab) é o que efetivamente muda o valor — não dá pra "submeter" um texto
 * livre que não corresponda a nenhuma opção real.
 */
export function Select({
  value,
  onChange,
  children,
  className = '',
  placeholder,
  disabled,
  ...rest
}: {
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: ReactNode;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
}) {
  const opcoes = useMemo(() => extrairOpcoes(children), [children]);
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [destaque, setDestaque] = useState(0);
  const raizRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const valorAtual = value === undefined || value === null ? '' : String(value);
  const opcaoSelecionada = opcoes.find((o) => o.valor === valorAtual);

  const opcoesFiltradas = useMemo(() => {
    if (!filtro.trim()) return opcoes;
    const termo = filtro.trim().toLowerCase();
    return opcoes.filter((o) => o.rotulo.toLowerCase().includes(termo));
  }, [opcoes, filtro]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const abrir = () => {
    if (disabled) return;
    setFiltro('');
    setDestaque(Math.max(0, opcoesFiltradas.findIndex((o) => o.valor === valorAtual)));
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setFiltro('');
  };

  const selecionar = (opcao: Opcao) => {
    onChange?.({ target: { value: opcao.valor } });
    fechar();
    inputRef.current?.blur();
  };

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!aberto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestaque((d) => Math.min(d + 1, opcoesFiltradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opcao = opcoesFiltradas[destaque];
      if (opcao) selecionar(opcao);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
    } else if (e.key === 'Tab') {
      // Tab confirma a opção em destaque em vez de simplesmente sair
      // deixando o filtro digitado pendurado sem nada selecionado.
      const opcao = opcoesFiltradas[destaque];
      if (opcao) selecionar(opcao);
      else fechar();
    }
  };

  return (
    <div ref={raizRef} className={`relative ${className}`}>
      <input
        {...rest}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        value={aberto ? filtro : (opcaoSelecionada?.rotulo ?? '')}
        placeholder={aberto ? (opcaoSelecionada?.rotulo ?? placeholder) : placeholder}
        onFocus={abrir}
        onClick={abrir}
        onChange={(e) => {
          setFiltro(e.target.value);
          setDestaque(0);
          if (!aberto) setAberto(true);
        }}
        onKeyDown={aoTeclar}
        title={!aberto ? opcaoSelecionada?.rotulo : undefined}
        className="w-full min-w-[9rem] truncate rounded-md border border-stroke bg-card py-2 pl-3 pr-6 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface disabled:text-muted"
      />
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
      {aberto && (
        // Sem min-w-max de propósito: opção com texto longo ("SKU — Nome —
        // Posição (disp. X)") quebra em 2 linhas dentro da largura do
        // input, em vez de esticar a lista pra fora do modal — isso já
        // vazou visualmente uma vez (texto cortado sem aviso, achando que
        // "sumiu" um valor) quando o modal ganhou overflow-x-hidden.
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-stroke bg-card py-1 text-sm shadow-lg"
        >
          {opcoesFiltradas.length === 0 && <li className="px-3 py-1.5 text-muted">Nenhuma opção encontrada.</li>}
          {opcoesFiltradas.map((o, i) => (
            <li
              key={o.valor}
              role="option"
              aria-selected={o.valor === valorAtual}
              onMouseDown={(e) => {
                e.preventDefault();
                selecionar(o);
              }}
              onMouseEnter={() => setDestaque(i)}
              className={`cursor-pointer px-3 py-1.5 leading-snug ${i === destaque ? 'bg-primary/10' : ''} ${o.valor === valorAtual ? 'font-semibold text-ink' : 'text-ink'}`}
            >
              {o.rotulo || <span className="text-muted">—</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
