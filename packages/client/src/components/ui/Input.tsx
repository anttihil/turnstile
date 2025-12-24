import type { JSX, Component } from 'solid-js';
import { splitProps } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ['label', 'error', 'class', 'id']);

  const inputId = () => local.id ?? `input-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div class="w-full">
      {local.label && (
        <label for={inputId()} class="block text-sm font-medium text-slate-700 mb-1">
          {local.label}
        </label>
      )}
      <input
        id={inputId()}
        class={`
          w-full px-3 py-2
          border rounded-md
          text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-slate-100 disabled:cursor-not-allowed
          ${local.error ? 'border-red-500' : 'border-slate-300'}
          ${local.class ?? ''}
        `}
        {...rest}
      />
      {local.error && (
        <p class="mt-1 text-sm text-red-600">{local.error}</p>
      )}
    </div>
  );
};

interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: Component<TextareaProps> = (props) => {
  const [local, rest] = splitProps(props, ['label', 'error', 'class', 'id']);

  const inputId = () => local.id ?? `textarea-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div class="w-full">
      {local.label && (
        <label for={inputId()} class="block text-sm font-medium text-slate-700 mb-1">
          {local.label}
        </label>
      )}
      <textarea
        id={inputId()}
        class={`
          w-full px-3 py-2
          border rounded-md
          text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-slate-100 disabled:cursor-not-allowed
          font-mono
          ${local.error ? 'border-red-500' : 'border-slate-300'}
          ${local.class ?? ''}
        `}
        {...rest}
      />
      {local.error && (
        <p class="mt-1 text-sm text-red-600">{local.error}</p>
      )}
    </div>
  );
};
