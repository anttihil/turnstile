import type { Component } from 'solid-js';
import { Show, createEffect } from 'solid-js';
import type { InferenceRule } from '@turnstile/engine';
import { Button } from '../ui/Button';
import { JustificationPicker } from './JustificationPicker';
import { ruleJustificationCounts } from './RuleSidebar';

interface StepModalProps {
  rule: InferenceRule;
  isNewStep: boolean;
  formula: string;
  parseError: string | null;
  justifications: number[];
  availableLines: number[];
  canCommit: boolean;
  onFormulaChange: (formula: string) => void;
  onLineToggle: (line: number) => void;
  onClearLines: () => void;
  onCommit: () => void;
  onCancel: () => void;
}

const ruleInfo: Record<InferenceRule, { label: string; symbol: string }> = {
  assumption: { label: 'Assumption', symbol: '[' },
  and_intro: { label: 'And Introduction', symbol: '∧I' },
  and_elim_l: { label: 'And Elimination Left', symbol: '∧E₁' },
  and_elim_r: { label: 'And Elimination Right', symbol: '∧E₂' },
  or_intro_l: { label: 'Or Introduction Left', symbol: '∨I₁' },
  or_intro_r: { label: 'Or Introduction Right', symbol: '∨I₂' },
  or_elim: { label: 'Or Elimination', symbol: '∨E' },
  implies_intro: { label: 'Implies Introduction', symbol: '→I' },
  implies_elim: { label: 'Implies Elimination', symbol: '→E' },
  not_intro: { label: 'Not Introduction', symbol: '¬I' },
  not_elim: { label: 'Not Elimination', symbol: '¬E' },
  iff_intro: { label: 'Iff Introduction', symbol: '↔I' },
  iff_elim: { label: 'Iff Elimination', symbol: '↔E' },
  bottom_elim: { label: 'Bottom Elimination', symbol: '⊥E' },
  raa: { label: 'Reductio ad Absurdum', symbol: 'RAA' },
  theorem: { label: 'Theorem', symbol: 'Thm' },
};

export const StepModal: Component<StepModalProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    inputRef?.focus();
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && props.canCommit) {
      e.preventDefault();
      props.onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      props.onCancel();
    }
  };

  const info = () => ruleInfo[props.rule] ?? { label: props.rule, symbol: '?' };
  const needsJustifications = () => (ruleJustificationCounts[props.rule] ?? 0) > 0;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
      onKeyDown={handleKeyDown}
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200">
          <h2 class="text-lg font-semibold text-slate-800">
            <span class="font-mono text-blue-600 mr-2">{info().symbol}</span>
            {info().label}
          </h2>
        </div>

        <div class="px-6 py-4 space-y-4">
          <Show when={needsJustifications()}>
            <JustificationPicker
              selectedLines={props.justifications}
              maxLines={ruleJustificationCounts[props.rule]}
              availableLines={props.availableLines}
              onLineToggle={props.onLineToggle}
              onClear={props.onClearLines}
            />
          </Show>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Formula</label>
            <input
              ref={inputRef}
              type="text"
              class="w-full px-3 py-2 font-mono text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={props.formula}
              onInput={(e) => props.onFormulaChange(e.currentTarget.value)}
              placeholder="e.g. P ∧ Q"
            />
            <Show when={props.parseError}>
              <p class="mt-1 text-sm text-red-600">{props.parseError}</p>
            </Show>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="ghost" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!props.canCommit} onClick={props.onCommit}>
            {props.isNewStep ? 'Add step' : 'Update step'}
          </Button>
        </div>
      </div>
    </div>
  );
};
