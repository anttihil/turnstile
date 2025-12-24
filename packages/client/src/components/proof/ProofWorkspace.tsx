import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import type { ProofStep, DisplayMode } from '@turnstile/engine';
import { ProofLine } from './ProofLine';

interface ProofWorkspaceProps {
  steps: ProofStep[];
  mode: DisplayMode;
  selectedLine?: number | null;
  errors?: Map<number, string>;
  onSelectLine?: (lineNumber: number) => void;
}

export const ProofWorkspace: Component<ProofWorkspaceProps> = (props) => {
  const mode = () => props.mode ?? 'utf8';

  return (
    <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <Show
        when={props.steps.length > 0}
        fallback={
          <div class="p-8 text-center text-slate-500">
            <p>No proof steps yet.</p>
            <p class="text-sm mt-1">Add your first step below.</p>
          </div>
        }
      >
        <div class="relative">
          <For each={props.steps}>
            {(step, index) => (
              <ProofLine
                step={step}
                lineNumber={index() + 1}
                depth={step.depth}
                mode={mode()}
                isSelected={props.selectedLine === index() + 1}
                isError={props.errors?.has(index() + 1)}
                errorMessage={props.errors?.get(index() + 1)}
                onSelect={props.onSelectLine}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
