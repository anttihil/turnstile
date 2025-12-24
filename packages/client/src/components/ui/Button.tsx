import type { JSX, ParentComponent } from 'solid-js';
import { splitProps } from 'solid-js';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'children']);

  const variant = () => local.variant ?? 'primary';
  const size = () => local.size ?? 'md';

  return (
    <button
      class={`
        inline-flex items-center justify-center
        font-medium rounded-md
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant()]}
        ${sizeStyles[size()]}
        ${local.class ?? ''}
      `}
      {...rest}
    >
      {local.children}
    </button>
  );
};
