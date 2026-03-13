import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import type { Problem, DisplayMode } from '@turnstile/engine';
import { printFormula } from '@turnstile/engine';
import { Button } from '../ui/Button';

interface ValidationResult {
  isValid: boolean;
  isComplete: boolean;
  errors: { lineNumber: number; message: string }[];
}

interface ProofHeaderProps {
  problem: Problem;
  mode: DisplayMode;
  currentDepth: number;
  validationResult: ValidationResult;
  stepsLength: number;
  onUndo: () => void;
  onReset: () => void;
}

export const ProofHeader: Component<ProofHeaderProps> = (props) => {
  const statusBadge = () => {
    const r = props.validationResult;
    if (r.isComplete) return { text: '✓ Complete', cls: 'bg-green-100 text-green-700' };
    if (r.errors.length > 0)
      return {
        text: `! ${r.errors.length} error${r.errors.length > 1 ? 's' : ''}`,
        cls: 'bg-red-100 text-red-700',
      };
    return { text: '→ In progress', cls: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div class="border-b border-slate-200 bg-white px-4 py-3 flex flex-col gap-2 flex-shrink-0">
      <div class="flex items-center gap-3 flex-wrap">
        <A href="/problems" class="text-slate-500 hover:text-slate-700 text-sm flex-shrink-0">
          ← Back
        </A>
        <div class="flex items-center gap-1 flex-1 font-mono text-sm min-w-0 flex-wrap">
          <For each={props.problem.premises}>
            {(premise, i) => (
              <>
                <Show when={i() > 0}>
                  <span class="text-slate-400">,</span>
                </Show>
                <span class="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {printFormula(premise, props.mode)}
                </span>
              </>
            )}
          </For>
          <span class="text-slate-500 px-1">⊢</span>
          <span class="bg-slate-800 text-white px-2 py-0.5 rounded">
            {printFormula(props.problem.conclusion, props.mode)}
          </span>
        </div>
        <span class={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${statusBadge().cls}`}>
          {statusBadge().text}
        </span>
        <Button variant="ghost" size="sm" onClick={props.onUndo} disabled={props.stepsLength === 0}>
          Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={props.onReset} disabled={props.stepsLength === 0}>
          Reset
        </Button>
        <Show when={props.currentDepth > 0}>
          <span class="text-xs text-slate-500">Depth: {props.currentDepth}</span>
        </Show>
      </div>
      <Show when={props.problem.hint}>
        <p class="text-sm text-slate-500">
          <span class="font-medium">Hint:</span> {props.problem.hint}
        </p>
      </Show>
    </div>
  );
};
