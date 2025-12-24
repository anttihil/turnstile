import type { ParentComponent } from 'solid-js';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  class?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
};

export const Badge: ParentComponent<BadgeProps> = (props) => {
  const variant = () => props.variant ?? 'default';
  const size = () => props.size ?? 'md';

  return (
    <span
      class={`
        inline-flex items-center
        font-medium rounded-full
        ${variantStyles[variant()]}
        ${sizeStyles[size()]}
        ${props.class ?? ''}
      `}
    >
      {props.children}
    </span>
  );
};

/**
 * Difficulty badge for problems.
 */
export const DifficultyBadge: ParentComponent<{ level: 1 | 2 | 3 | 4 | 5 }> = (props) => {
  const variant = (): BadgeVariant => {
    switch (props.level) {
      case 1: return 'success';
      case 2: return 'info';
      case 3: return 'warning';
      case 4: return 'danger';
      case 5: return 'danger';
    }
  };

  const label = () => {
    switch (props.level) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      case 4: return 'Expert';
      case 5: return 'Master';
    }
  };

  return (
    <Badge variant={variant()} size="sm">
      {label()}
    </Badge>
  );
};
