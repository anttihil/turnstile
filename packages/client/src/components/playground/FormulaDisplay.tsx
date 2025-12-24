import type { Component } from 'solid-js';
import { Show } from 'solid-js';
import { printFormula } from '@turnstile/engine';
import type { Formula, DisplayMode } from '@turnstile/engine';

interface FormulaDisplayProps {
  formula: Formula;
  mode?: DisplayMode;
  class?: string;
}

export const FormulaDisplay: Component<FormulaDisplayProps> = (props) => {
  const mode = () => props.mode ?? 'utf8';

  return (
    <span class={`font-mono ${props.class ?? ''}`}>
      {printFormula(props.formula, mode())}
    </span>
  );
};

interface FormulaOrErrorProps {
  formula: Formula | null;
  error: string | null;
  mode?: DisplayMode;
  class?: string;
}

export const FormulaOrError: Component<FormulaOrErrorProps> = (props) => {
  return (
    <Show
      when={props.formula && !props.error}
      fallback={
        <span class={`text-red-600 ${props.class ?? ''}`}>
          {props.error ?? 'No formula'}
        </span>
      }
    >
      <FormulaDisplay formula={props.formula!} mode={props.mode} class={props.class} />
    </Show>
  );
};
