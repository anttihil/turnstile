import type { Component } from 'solid-js';
import { For } from 'solid-js';
import type { ProofStep, DisplayMode } from '@turnstile/engine';
import { ProofLine } from './ProofLine';
import { NewStepRow } from './NewStepRow';

interface ProofWorkspaceProps {
  ref?: (el: HTMLDivElement) => void;
  steps: ProofStep[];
  mode: DisplayMode;
  errors?: Map<number, string>;
  editingLineIndex: number | null;
  editorFormula: string;
  editorParseError: string | null;
  currentDepth: number;
  onSelectLine?: (index: number) => void;
  onEditorFormulaChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export const ProofWorkspace: Component<ProofWorkspaceProps> = (props) => {
  const mode = () => props.mode ?? 'utf8';

  return (
    <div
      ref={props.ref}
      tabIndex={0}
      class="flex-1 overflow-y-auto bg-white outline-none focus:ring-2 focus:ring-blue-200 focus:ring-inset"
      onKeyDown={props.onKeyDown}
    >
      <div class="relative">
        <For each={props.steps}>
          {(step, index) => (
            <ProofLine
              step={step}
              lineNumber={index() + 1}
              depth={step.depth}
              mode={mode()}
              isEditing={props.editingLineIndex === index()}
              isError={props.errors?.has(index() + 1)}
              errorMessage={props.errors?.get(index() + 1)}
              editorFormula={props.editorFormula}
              editorParseError={props.editorParseError}
              onSelect={(lineNumber) => props.onSelectLine?.(lineNumber - 1)}
              onEditorFormulaChange={props.onEditorFormulaChange}
              onKeyDown={props.onKeyDown}
            />
          )}
        </For>
        <NewStepRow
          isEditing={props.editingLineIndex === props.steps.length}
          editorFormula={props.editorFormula}
          editorParseError={props.editorParseError}
          onActivate={() => props.onSelectLine?.(props.steps.length)}
          onEditorFormulaChange={props.onEditorFormulaChange}
          onKeyDown={props.onKeyDown}
        />
      </div>
    </div>
  );
};
