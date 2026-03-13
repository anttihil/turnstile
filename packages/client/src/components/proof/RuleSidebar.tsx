import type { Component } from 'solid-js';
import type { InferenceRule } from '@turnstile/engine';
import { RulePalette } from './RulePalette';

interface RuleSidebarProps {
  availableRules?: InferenceRule[];
  onRuleClick: (rule: InferenceRule) => void;
}

// Rules and their expected justification counts — exported for use in ProofBuilder and StepModal
export const ruleJustificationCounts: Partial<Record<InferenceRule, number>> = {
  assumption: 0,
  and_intro: 2,
  and_elim_l: 1,
  and_elim_r: 1,
  or_intro_l: 1,
  or_intro_r: 1,
  or_elim: 3,
  implies_intro: 1,
  implies_elim: 2,
  not_intro: 1,
  not_elim: 1,
  iff_intro: 2,
  iff_elim: 2,
  bottom_elim: 1,
  raa: 1,
  theorem: 0,
};

export const RuleSidebar: Component<RuleSidebarProps> = (props) => {
  return (
    <aside class="w-56 xl:w-64 flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
      <div class="p-3">
        <RulePalette onRuleClick={props.onRuleClick} availableRules={props.availableRules} />
      </div>
    </aside>
  );
};
