import type { ElementType, HTMLAttributes } from 'react';

export function Card({
  as: Tag = 'div',
  className = '',
  padding = 'p-4',
  ...props
}: HTMLAttributes<HTMLElement> & { padding?: string; as?: ElementType }) {
  return <Tag className={`rounded-lg border border-nevoa/30 bg-white ${padding} ${className}`} {...props} />;
}
