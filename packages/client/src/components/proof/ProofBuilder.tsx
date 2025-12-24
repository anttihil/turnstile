import type { Component } from 'solid-js';
import { createSignal, createMemo, createEffect, For } from 'solid-js';
import type { Problem, ProofStep, Formula, InferenceRule, DisplayMode } from '@turnstile/engine';
import { checkProof } from '@turnstile/engine';
import { ProofWorkspace } from './ProofWorkspace';
import { StepEditor } from './StepEditor';
import { ValidationFeedback } from './ValidationFeedback';
import { Button } from '../ui/Button';
import { FormulaDisplay } from '../playground/FormulaDisplay';

interface ProofBuilderProps {
  problem: Problem;
  mode?: DisplayMode;
  onComplete?: (steps: ProofStep[]) => void;
}

// Generate a unique ID for proof steps
let stepCounter = 0;
const generateStepId = () => `step-${++stepCounter}`;

export const ProofBuilder: Component<ProofBuilderProps> = (props) => {
  const [steps, setSteps] = createSignal<ProofStep[]>([]);
  const [selectedLine, setSelectedLine] = createSignal<number | null>(null);

  const mode = () => props.mode ?? 'utf8';

  // Calculate current subproof depth
  const currentDepth = createMemo(() => {
    const proofSteps = steps();
    if (proofSteps.length === 0) return 0;
    const lastStep = proofSteps[proofSteps.length - 1];
    return lastStep ? lastStep.depth : 0;
  });

  // Create a map from line numbers to step IDs
  const lineToIdMap = createMemo(() => {
    const map = new Map<number, string>();
    steps().forEach((step, index) => {
      map.set(index + 1, step.id);
    });
    return map;
  });

  // Create a map from step IDs to line numbers
  const idToLineMap = createMemo(() => {
    const map = new Map<string, number>();
    steps().forEach((step, index) => {
      map.set(step.id, index + 1);
    });
    return map;
  });

  // Validate the proof
  const validationResult = createMemo(() => {
    const proofSteps = steps();
    if (proofSteps.length === 0) {
      return { isValid: true, errors: [], isComplete: false };
    }

    const result = checkProof(proofSteps, props.problem.premises, props.problem.conclusion);

    // Convert validation errors to include line numbers
    const errors: { lineNumber: number; message: string }[] = [];
    for (const error of result.errors) {
      const lineNumber = idToLineMap().get(error.stepId) ?? 0;
      errors.push({ lineNumber, message: error.message });
    }

    return {
      isValid: result.valid,
      errors,
      isComplete: result.complete,
    };
  });

  // Get available lines for justification (lines at accessible depth)
  const availableLines = createMemo(() => {
    const proofSteps = steps();
    const available: number[] = [];
    const depth = currentDepth();

    for (let i = 0; i < proofSteps.length; i++) {
      const step = proofSteps[i];
      if (step && step.depth <= depth) {
        available.push(i + 1);
      }
    }

    return available;
  });

  // Convert validation errors to a Map for the workspace
  const errorMap = createMemo(() => {
    const map = new Map<number, string>();
    for (const error of validationResult().errors) {
      map.set(error.lineNumber, error.message);
    }
    return map;
  });

  const handleAddStep = (formula: Formula, rule: InferenceRule, justificationLines: number[]) => {
    const newDepth = rule === 'assumption' ? currentDepth() + 1 : currentDepth();

    // Convert line numbers to step IDs
    const justificationIds = justificationLines.map((line) => lineToIdMap().get(line) ?? '');

    const newStep: ProofStep = {
      id: generateStepId(),
      formula,
      rule,
      justification: justificationIds,
      depth: newDepth,
    };

    setSteps([...steps(), newStep]);
  };

  const handleUndo = () => {
    const proofSteps = steps();
    if (proofSteps.length > 0) {
      setSteps(proofSteps.slice(0, -1));
    }
  };

  const handleReset = () => {
    setSteps([]);
    setSelectedLine(null);
  };

  // Notify parent when proof is complete
  createEffect(() => {
    const result = validationResult();
    if (result.isComplete && result.isValid) {
      props.onComplete?.(steps());
    }
  });

  return (
    <div class="space-y-6">
      {/* Problem Statement */}
      <div class="bg-slate-50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-2">Prove:</h3>
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-500">Premises:</span>
            <div class="flex flex-wrap gap-2">
              <For each={props.problem.premises}>
                {(premise) => (
                  <span class="font-mono bg-white px-2 py-1 rounded border border-slate-200">
                    <FormulaDisplay formula={premise} mode={mode()} />
                  </span>
                )}
              </For>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-500">Conclusion:</span>
            <span class="font-mono bg-white px-2 py-1 rounded border border-slate-200 font-semibold">
              <FormulaDisplay formula={props.problem.conclusion} mode={mode()} />
            </span>
          </div>
        </div>
      </div>

      {/* Proof Workspace */}
      <ProofWorkspace
        steps={steps()}
        mode={mode()}
        selectedLine={selectedLine()}
        errors={errorMap()}
        onSelectLine={setSelectedLine}
      />

      {/* Controls */}
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" onClick={handleUndo} disabled={steps().length === 0}>
          Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={steps().length === 0}>
          Reset
        </Button>
        <div class="flex-1" />
        <span class="text-sm text-slate-500 self-center">
          Depth: {currentDepth()}
        </span>
      </div>

      {/* Validation Feedback */}
      <ValidationFeedback
        errors={validationResult().errors}
        isValid={validationResult().isValid}
        isComplete={validationResult().isComplete}
      />

      {/* Step Editor */}
      <StepEditor
        availableLines={availableLines()}
        currentDepth={currentDepth()}
        onAddStep={handleAddStep}
      />
    </div>
  );
};
