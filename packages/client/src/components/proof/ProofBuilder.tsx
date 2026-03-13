import type { Component } from 'solid-js';
import { createSignal, createMemo, createEffect, Show } from 'solid-js';
import type { Problem, ProofStep, Formula, InferenceRule, DisplayMode } from '@turnstile/engine';
import { checkProof, parseFormula, printFormula } from '@turnstile/engine';
import { ProofWorkspace } from './ProofWorkspace';
import { ProofHeader } from './ProofHeader';
import { RuleSidebar, ruleJustificationCounts } from './RuleSidebar';
import { StepModal } from './StepModal';

interface ProofBuilderProps {
  problem: Problem;
  mode?: DisplayMode;
  onComplete?: (steps: ProofStep[]) => void;
}

let stepCounter = 0;
const generateStepId = () => `step-${++stepCounter}`;

export const ProofBuilder: Component<ProofBuilderProps> = (props) => {
  const [steps, setSteps] = createSignal<ProofStep[]>([]);
  const [editingLineIndex, setEditingLineIndex] = createSignal<number | null>(null);
  const [editorFormula, setEditorFormula] = createSignal('');
  const [editorParsedFormula, setEditorParsedFormula] = createSignal<Formula | null>(null);
  const [editorParseError, setEditorParseError] = createSignal<string | null>(null);
  const [editorRule, setEditorRule] = createSignal<InferenceRule | null>(null);
  const [editorJustifications, setEditorJustifications] = createSignal<number[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = createSignal(false);
  const [modalRule, setModalRule] = createSignal<InferenceRule | null>(null);
  const [modalTargetIndex, setModalTargetIndex] = createSignal<number | null>(null);
  const [modalFormula, setModalFormula] = createSignal('');
  const [modalParsedFormula, setModalParsedFormula] = createSignal<Formula | null>(null);
  const [modalParseError, setModalParseError] = createSignal<string | null>(null);
  const [modalJustifications, setModalJustifications] = createSignal<number[]>([]);

  let workspaceRef: HTMLDivElement | undefined;

  const mode = () => props.mode ?? 'utf8';

  const currentDepth = createMemo(() => {
    const proofSteps = steps();
    if (proofSteps.length === 0) return 0;
    const lastStep = proofSteps[proofSteps.length - 1];
    return lastStep ? lastStep.depth : 0;
  });

  const lineToIdMap = createMemo(() => {
    const map = new Map<number, string>();
    steps().forEach((step, index) => map.set(index + 1, step.id));
    return map;
  });

  const idToLineMap = createMemo(() => {
    const map = new Map<string, number>();
    steps().forEach((step, index) => map.set(step.id, index + 1));
    return map;
  });

  const validationResult = createMemo(() => {
    const proofSteps = steps();
    if (proofSteps.length === 0) return { isValid: true, errors: [], isComplete: false };
    const result = checkProof(proofSteps, props.problem.premises, props.problem.conclusion);
    const errors: { lineNumber: number; message: string }[] = [];
    for (const error of result.errors) {
      const lineNumber = idToLineMap().get(error.stepId) ?? 0;
      errors.push({ lineNumber, message: error.message });
    }
    return { isValid: result.valid, errors, isComplete: result.complete };
  });

  const errorMap = createMemo(() => {
    const map = new Map<number, string>();
    for (const error of validationResult().errors) map.set(error.lineNumber, error.message);
    return map;
  });

  const canCommitEdit = createMemo(() => {
    const formula = editorParsedFormula();
    const rule = editorRule();
    if (!formula || !rule) return false;
    const expected = ruleJustificationCounts[rule];
    return expected === undefined || editorJustifications().length === expected;
  });

  const modalAvailableLines = createMemo(() => {
    const idx = modalTargetIndex();
    const proofSteps = steps();
    const isNewStep = idx === null || idx >= proofSteps.length;
    const depth = isNewStep ? currentDepth() : (proofSteps[idx!]?.depth ?? currentDepth());
    const limit = isNewStep ? proofSteps.length : idx!;
    const available: number[] = [];
    for (let i = 0; i < limit; i++) {
      const step = proofSteps[i];
      if (step && step.depth <= depth) available.push(i + 1);
    }
    return available;
  });

  const canCommitModal = createMemo(() => {
    const formula = modalParsedFormula();
    const rule = modalRule();
    if (!formula || !rule) return false;
    const expected = ruleJustificationCounts[rule];
    return expected === undefined || modalJustifications().length === expected;
  });

  const clearEditor = () => {
    setEditorFormula('');
    setEditorParsedFormula(null);
    setEditorParseError(null);
    setEditorRule(null);
    setEditorJustifications([]);
  };

  // Pre-populate editor when entering edit mode on an existing step
  createEffect(() => {
    const idx = editingLineIndex();
    if (idx === null || idx === steps().length) {
      clearEditor();
      return;
    }
    const step = steps()[idx];
    if (!step) return;
    setEditorFormula(printFormula(step.formula, mode()));
    setEditorParsedFormula(step.formula);
    setEditorRule(step.rule);
    setEditorJustifications(
      step.justification.map((id) => idToLineMap().get(id) ?? 0).filter(Boolean)
    );
  });

  // Live formula parsing for inline editor
  createEffect(() => {
    const text = editorFormula();
    if (!text) {
      setEditorParsedFormula(null);
      setEditorParseError(null);
      return;
    }
    const result = parseFormula(text);
    if (result.success) {
      setEditorParsedFormula(result.value);
      setEditorParseError(null);
    } else {
      setEditorParsedFormula(null);
      setEditorParseError(result.error.message);
    }
  });

  // Live formula parsing for modal
  createEffect(() => {
    const text = modalFormula();
    if (!text) {
      setModalParsedFormula(null);
      setModalParseError(null);
      return;
    }
    const result = parseFormula(text);
    if (result.success) {
      setModalParsedFormula(result.value);
      setModalParseError(null);
    } else {
      setModalParsedFormula(null);
      setModalParseError(result.error.message);
    }
  });

  // Notify parent when complete
  createEffect(() => {
    const result = validationResult();
    if (result.isComplete && result.isValid) props.onComplete?.(steps());
  });

  const handleAddStep = (formula: Formula, rule: InferenceRule, justificationLines: number[]) => {
    const newDepth = rule === 'assumption' ? currentDepth() + 1 : currentDepth();
    const justificationIds = justificationLines.map((line) => lineToIdMap().get(line) ?? '');
    setSteps([
      ...steps(),
      { id: generateStepId(), formula, rule, justification: justificationIds, depth: newDepth },
    ]);
  };

  const handleUpdateStep = (
    index: number,
    formula: Formula,
    rule: InferenceRule,
    justificationLines: number[]
  ) => {
    const current = steps()[index];
    if (!current) return;
    const justificationIds = justificationLines.map((line) => lineToIdMap().get(line) ?? '');
    setSteps(
      steps().map((s, i) =>
        i === index ? { ...current, formula, rule, justification: justificationIds } : s
      )
    );
  };

  const handleUndo = () => {
    const proofSteps = steps();
    if (proofSteps.length > 0) {
      setSteps(proofSteps.slice(0, -1));
      setEditingLineIndex(null);
    }
  };

  const handleReset = () => {
    setSteps([]);
    setEditingLineIndex(null);
    clearEditor();
  };

  const enterEditMode = (index: number) => setEditingLineIndex(index);

  const cancelEdit = () => {
    setEditingLineIndex(null);
    workspaceRef?.focus();
  };

  const commitEdit = () => {
    if (!canCommitEdit()) return;
    const idx = editingLineIndex()!;
    if (idx === steps().length) {
      handleAddStep(editorParsedFormula()!, editorRule()!, editorJustifications());
      clearEditor();
      // Stay on new-step row for next entry
    } else {
      handleUpdateStep(idx, editorParsedFormula()!, editorRule()!, editorJustifications());
      setEditingLineIndex(null);
      workspaceRef?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const idx = editingLineIndex();
    const max = steps().length;
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      enterEditMode(idx === null ? 0 : Math.min(idx + 1, max));
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      enterEditMode(idx === null ? max : Math.max(idx - 1, 0));
    } else if (e.key === 'Enter' && idx !== null) {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const openModal = (rule: InferenceRule, targetIndex?: number) => {
    const idx = targetIndex ?? null;
    setModalRule(rule);
    setModalTargetIndex(idx);
    setModalJustifications([]);
    if (idx !== null && idx < steps().length) {
      const step = steps()[idx];
      if (step) {
        setModalFormula(printFormula(step.formula, mode()));
        setModalJustifications(
          step.justification.map((id) => idToLineMap().get(id) ?? 0).filter(Boolean)
        );
      } else {
        setModalFormula('');
      }
    } else {
      setModalFormula('');
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalRule(null);
    setModalTargetIndex(null);
    setModalFormula('');
    setModalParsedFormula(null);
    setModalParseError(null);
    setModalJustifications([]);
  };

  const commitModal = () => {
    if (!canCommitModal()) return;
    const idx = modalTargetIndex();
    if (idx === null || idx >= steps().length) {
      handleAddStep(modalParsedFormula()!, modalRule()!, modalJustifications());
    } else {
      handleUpdateStep(idx, modalParsedFormula()!, modalRule()!, modalJustifications());
    }
    closeModal();
  };

  const handleModalLineToggle = (line: number) => {
    const current = modalJustifications();
    if (current.includes(line)) {
      setModalJustifications(current.filter((l) => l !== line));
    } else {
      setModalJustifications([...current, line]);
    }
  };

  return (
    <div class="flex flex-col h-[calc(100vh-4rem)]">
      <ProofHeader
        problem={props.problem}
        mode={mode()}
        currentDepth={currentDepth()}
        validationResult={validationResult()}
        stepsLength={steps().length}
        onUndo={handleUndo}
        onReset={handleReset}
      />
      <div class="flex flex-1 min-h-0">
        <ProofWorkspace
          ref={(el) => (workspaceRef = el)}
          steps={steps()}
          mode={mode()}
          errors={errorMap()}
          editingLineIndex={editingLineIndex()}
          editorFormula={editorFormula()}
          editorParseError={editorParseError()}
          currentDepth={currentDepth()}
          onSelectLine={enterEditMode}
          onEditorFormulaChange={setEditorFormula}
          onKeyDown={handleKeyDown}
        />
        <RuleSidebar
          onRuleClick={(rule) => openModal(rule, editingLineIndex() ?? undefined)}
        />
      </div>
      <Show when={modalOpen() && modalRule() !== null}>
        <StepModal
          rule={modalRule()!}
          isNewStep={modalTargetIndex() === null || modalTargetIndex()! >= steps().length}
          formula={modalFormula()}
          parseError={modalParseError()}
          justifications={modalJustifications()}
          availableLines={modalAvailableLines()}
          canCommit={canCommitModal()}
          onFormulaChange={setModalFormula}
          onLineToggle={handleModalLineToggle}
          onClearLines={() => setModalJustifications([])}
          onCommit={commitModal}
          onCancel={closeModal}
        />
      </Show>
    </div>
  );
};
