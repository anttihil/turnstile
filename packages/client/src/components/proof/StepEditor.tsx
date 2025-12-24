import type { Component } from 'solid-js';
import { createSignal, createEffect, Show } from 'solid-js';
import type { Formula, InferenceRule, ParseResult } from '@turnstile/engine';
import { FormulaInput } from '../playground/FormulaInput';
import { RulePalette } from './RulePalette';
import { JustificationPicker } from './JustificationPicker';
import { Button } from '../ui/Button';

interface StepEditorProps {
  availableLines: number[];
  availableRules?: InferenceRule[];
  currentDepth: number;
  onAddStep: (formula: Formula, rule: InferenceRule, justification: number[]) => void;
  onCancel?: () => void;
}

// Rules and their expected justification counts
const ruleJustificationCounts: Partial<Record<InferenceRule, number>> = {
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

export const StepEditor: Component<StepEditorProps> = (props) => {
  const [formulaInput, setFormulaInput] = createSignal('');
  const [parsedFormula, setParsedFormula] = createSignal<Formula | null>(null);
  const [selectedRule, setSelectedRule] = createSignal<InferenceRule | null>(null);
  const [selectedLines, setSelectedLines] = createSignal<number[]>([]);

  // Reset selections when rule changes
  createEffect(() => {
    const rule = selectedRule();
    if (rule) {
      setSelectedLines([]);
    }
  });

  const handleParsed = (result: ParseResult<Formula>) => {
    if (result.success) {
      setParsedFormula(result.value);
    } else {
      setParsedFormula(null);
    }
  };

  const handleLineToggle = (line: number) => {
    const current = selectedLines();
    if (current.includes(line)) {
      setSelectedLines(current.filter((l) => l !== line));
    } else {
      setSelectedLines([...current, line]);
    }
  };

  const handleClearLines = () => {
    setSelectedLines([]);
  };

  const getMaxJustifications = () => {
    const rule = selectedRule();
    if (!rule) return undefined;
    return ruleJustificationCounts[rule];
  };

  const canSubmit = () => {
    const formula = parsedFormula();
    const rule = selectedRule();
    if (!formula || !rule) return false;

    const expectedCount = ruleJustificationCounts[rule];
    if (expectedCount !== undefined && selectedLines().length !== expectedCount) {
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    const formula = parsedFormula();
    const rule = selectedRule();
    if (!formula || !rule) return;

    props.onAddStep(formula, rule, selectedLines());

    // Reset form
    setFormulaInput('');
    setParsedFormula(null);
    setSelectedRule(null);
    setSelectedLines([]);
  };

  return (
    <div class="bg-slate-50 rounded-lg p-4 space-y-4">
      <h3 class="text-sm font-semibold text-slate-700">Add Proof Step</h3>

      <div>
        <FormulaInput
          value={formulaInput()}
          onValueChange={setFormulaInput}
          onParsed={handleParsed}
          label="Formula"
          placeholder="Enter formula..."
        />
      </div>

      <RulePalette
        onSelectRule={setSelectedRule}
        selectedRule={selectedRule()}
        availableRules={props.availableRules}
      />

      <Show when={selectedRule() && selectedRule() !== 'assumption' && selectedRule() !== 'theorem'}>
        <JustificationPicker
          selectedLines={selectedLines()}
          maxLines={getMaxJustifications()}
          availableLines={props.availableLines}
          onLineToggle={handleLineToggle}
          onClear={handleClearLines}
        />
      </Show>

      <div class="flex gap-2 pt-2">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit()}
        >
          Add Step
        </Button>
        <Show when={props.onCancel}>
          <Button variant="ghost" onClick={props.onCancel}>
            Cancel
          </Button>
        </Show>
      </div>

      <Show when={selectedRule() === 'assumption'}>
        <p class="text-sm text-slate-500">
          This will start a new subproof at depth {props.currentDepth + 1}.
        </p>
      </Show>
    </div>
  );
};
