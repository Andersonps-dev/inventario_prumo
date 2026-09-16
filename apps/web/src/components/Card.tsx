import type { ElementType, HTMLAttributes } from 'react';

export function Card({
  as: Tag = 'div',
  className = '',
  padding = 'p-4',
  ...props
}: HTMLAttributes<HTMLElement> & { padding?: string; as?: ElementType }) {
  return <Tag className={`rounded-card border border-stroke bg-card ${padding} ${className}`} {...props} />;
}
