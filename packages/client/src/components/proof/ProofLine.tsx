import type { Component } from 'solid-js';
import { Show, createEffect } from 'solid-js';
import type { ProofStep, DisplayMode } from '@turnstile/engine';
import { printFormula } from '@turnstile/engine';

interface ProofLineProps {
  step: ProofStep;
  lineNumber: number;
  depth: number;
  mode: DisplayMode;
  isEditing?: boolean;
  isError?: boolean;
  errorMessage?: string;
  editorFormula?: string;
  editorParseError?: string | null;
  onSelect?: (lineNumber: number) => void;
  onEditorFormulaChange?: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

export const ProofLine: Component<ProofLineProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isEditing) inputRef?.focus();
  });

  const formatJustification = () => {
    if (props.step.rule === 'assumption') return 'Assumption';
    const lines = props.step.justification.join(', ');
    const ruleName = props.step.rule.replace(/_/g, ' ');
    return lines ? `${lines} ${ruleName}` : ruleName;
  };

  return (
    <div
      class={`flex items-center py-2 px-3 border-b border-slate-200 transition-colors relative
        ${props.isEditing ? 'bg-blue-50' : props.isError ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50 cursor-pointer'}`}
      style={{ 'padding-left': `${props.depth * 24 + 12}px` }}
      onClick={() => !props.isEditing && props.onSelect?.(props.lineNumber)}
    >
      <Show when={props.depth > 0}>
        <div
          class="absolute left-0 top-0 bottom-0 border-l-2 border-slate-300"
          style={{ left: `${(props.depth - 1) * 24 + 8}px` }}
        />
      </Show>

      <span class="w-8 text-sm text-slate-500 font-mono flex-shrink-0">
        {props.lineNumber}.
      </span>

      <Show
        when={props.isEditing}
        fallback={
          <span class="flex-1 font-mono text-lg">
            {printFormula(props.step.formula, props.mode)}
          </span>
        }
      >
        <div class="flex-1 flex flex-col">
          <input
            ref={inputRef}
            type="text"
            class="flex-1 font-mono text-lg bg-transparent outline-none border-b border-blue-400"
            value={props.editorFormula ?? ''}
            onInput={(e) => props.onEditorFormulaChange?.(e.currentTarget.value)}
            onKeyDown={props.onKeyDown}
          />
          <Show when={props.editorParseError}>
            <span class="text-xs text-red-500 mt-1">{props.editorParseError}</span>
          </Show>
        </div>
      </Show>

      <Show when={!props.isEditing}>
        <span class="text-sm text-slate-600 ml-4 flex-shrink-0">
          {formatJustification()}
        </span>
        <Show when={props.isError}>
          <span class="ml-2 text-red-500" title={props.errorMessage}>!</span>
        </Show>
      </Show>
    </div>
  );
};
