import type { Component } from 'solid-js';
import { Show } from 'solid-js';
import type { ProofStep, DisplayMode } from '@turnstile/engine';
import { printFormula } from '@turnstile/engine';

interface ProofLineProps {
  step: ProofStep;
  lineNumber: number;
  depth: number;
  mode: DisplayMode;
  isSelected?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onSelect?: (lineNumber: number) => void;
}

export const ProofLine: Component<ProofLineProps> = (props) => {
  const formatJustification = () => {
    if (props.step.rule === 'assumption') {
      return 'Assumption';
    }

    const lines = props.step.justification.join(', ');
    const ruleName = props.step.rule.replace(/_/g, ' ');
    return lines ? `${lines} ${ruleName}` : ruleName;
  };

  const handleClick = () => {
    props.onSelect?.(props.lineNumber);
  };

  return (
    <div
      class={`flex items-center py-2 px-3 border-b border-slate-200 cursor-pointer transition-colors
        ${props.isSelected ? 'bg-blue-100' : 'hover:bg-slate-50'}
        ${props.isError ? 'bg-red-50' : ''}`}
      style={{ 'padding-left': `${props.depth * 24 + 12}px` }}
      onClick={handleClick}
    >
      {/* Subproof indicator lines */}
      <Show when={props.depth > 0}>
        <div
          class="absolute left-0 top-0 bottom-0 border-l-2 border-slate-300"
          style={{ left: `${(props.depth - 1) * 24 + 8}px` }}
        />
      </Show>

      {/* Line number */}
      <span class="w-8 text-sm text-slate-500 font-mono flex-shrink-0">
        {props.lineNumber}.
      </span>

      {/* Formula */}
      <span class="flex-1 font-mono text-lg">
        {printFormula(props.step.formula, props.mode)}
      </span>

      {/* Justification */}
      <span class="text-sm text-slate-600 ml-4 flex-shrink-0">
        {formatJustification()}
      </span>

      {/* Error indicator */}
      <Show when={props.isError}>
        <span class="ml-2 text-red-500" title={props.errorMessage}>
          !
        </span>
      </Show>
    </div>
  );
};
