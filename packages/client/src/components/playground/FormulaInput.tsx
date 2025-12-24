import type { Component } from 'solid-js';
import { createSignal, createEffect } from 'solid-js';
import { parseFormula } from '@turnstile/engine';
import type { Formula, ParseResult } from '@turnstile/engine';
import { Textarea } from '../ui/Input';

interface FormulaInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onParsed?: (result: ParseResult<Formula>) => void;
  placeholder?: string;
  label?: string;
}

export const FormulaInput: Component<FormulaInputProps> = (props) => {
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const input = props.value.trim();
    if (!input) {
      setError(null);
      props.onParsed?.({ success: true, value: { kind: 'var', name: '' } });
      return;
    }

    const result = parseFormula(input);
    if (result.success) {
      setError(null);
    } else {
      setError(`Position ${result.error.position}: ${result.error.message}`);
    }
    props.onParsed?.(result);
  });

  return (
    <Textarea
      label={props.label}
      placeholder={props.placeholder ?? 'Enter a formula (e.g., P -> Q, P /\\ Q)'}
      value={props.value}
      onInput={(e) => props.onValueChange(e.currentTarget.value)}
      error={error() ?? undefined}
      rows={2}
      class="font-mono"
    />
  );
};
