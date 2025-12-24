import type { Component } from 'solid-js';
import { For } from 'solid-js';
import type { InferenceRule } from '@turnstile/engine';
import { Button } from '../ui/Button';

interface RulePaletteProps {
  onSelectRule: (rule: InferenceRule) => void;
  availableRules?: InferenceRule[];
  selectedRule?: InferenceRule | null;
}

interface RuleGroup {
  name: string;
  rules: { rule: InferenceRule; label: string; symbol: string }[];
}

const ruleGroups: RuleGroup[] = [
  {
    name: 'Subproofs',
    rules: [
      { rule: 'assumption', label: 'Assumption', symbol: '[' },
    ],
  },
  {
    name: 'Conjunction',
    rules: [
      { rule: 'and_intro', label: 'And Intro', symbol: '∧I' },
      { rule: 'and_elim_l', label: 'And Elim L', symbol: '∧E₁' },
      { rule: 'and_elim_r', label: 'And Elim R', symbol: '∧E₂' },
    ],
  },
  {
    name: 'Disjunction',
    rules: [
      { rule: 'or_intro_l', label: 'Or Intro L', symbol: '∨I₁' },
      { rule: 'or_intro_r', label: 'Or Intro R', symbol: '∨I₂' },
      { rule: 'or_elim', label: 'Or Elim', symbol: '∨E' },
    ],
  },
  {
    name: 'Implication',
    rules: [
      { rule: 'implies_intro', label: 'Implies Intro', symbol: '→I' },
      { rule: 'implies_elim', label: 'Implies Elim', symbol: '→E' },
    ],
  },
  {
    name: 'Negation',
    rules: [
      { rule: 'not_intro', label: 'Not Intro', symbol: '¬I' },
      { rule: 'not_elim', label: 'Not Elim', symbol: '¬E' },
      { rule: 'raa', label: 'RAA', symbol: 'RAA' },
    ],
  },
  {
    name: 'Biconditional',
    rules: [
      { rule: 'iff_intro', label: 'Iff Intro', symbol: '↔I' },
      { rule: 'iff_elim', label: 'Iff Elim', symbol: '↔E' },
    ],
  },
  {
    name: 'Bottom',
    rules: [
      { rule: 'bottom_elim', label: 'Bottom Elim', symbol: '⊥E' },
    ],
  },
];

export const RulePalette: Component<RulePaletteProps> = (props) => {
  const isRuleAvailable = (rule: InferenceRule) => {
    if (!props.availableRules) return true;
    return props.availableRules.includes(rule);
  };

  return (
    <div class="bg-white rounded-lg border border-slate-200 p-4">
      <h3 class="text-sm font-semibold text-slate-700 mb-3">Inference Rules</h3>
      <div class="space-y-4">
        <For each={ruleGroups}>
          {(group) => (
            <div>
              <h4 class="text-xs font-medium text-slate-500 mb-2">{group.name}</h4>
              <div class="flex flex-wrap gap-1">
                <For each={group.rules}>
                  {(ruleInfo) => (
                    <Button
                      variant={props.selectedRule === ruleInfo.rule ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => props.onSelectRule(ruleInfo.rule)}
                      disabled={!isRuleAvailable(ruleInfo.rule)}
                      title={ruleInfo.label}
                    >
                      {ruleInfo.symbol}
                    </Button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
