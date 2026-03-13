import type { Component } from 'solid-js';
import { Show, createEffect } from 'solid-js';

interface NewStepRowProps {
  isEditing: boolean;
  editorFormula: string;
  editorParseError: string | null;
  onActivate: () => void;
  onEditorFormulaChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export const NewStepRow: Component<NewStepRowProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.isEditing) inputRef?.focus();
  });

  return (
    <div
      class={`flex items-center py-2 px-3 border-b border-slate-200 transition-colors
        ${props.isEditing ? 'bg-blue-50' : 'hover:bg-slate-50 cursor-pointer'}`}
      onClick={() => !props.isEditing && props.onActivate()}
    >
      <span class="w-8 text-sm font-mono flex-shrink-0 text-slate-400">+</span>
      <Show
        when={props.isEditing}
        fallback={<span class="text-sm text-slate-400 italic">new step</span>}
      >
        <div class="flex-1 flex flex-col">
          <input
            ref={inputRef}
            type="text"
            class="flex-1 font-mono text-lg bg-transparent outline-none border-b border-blue-400"
            value={props.editorFormula}
            placeholder="Enter formula..."
            onInput={(e) => props.onEditorFormulaChange(e.currentTarget.value)}
            onKeyDown={props.onKeyDown}
          />
          <Show when={props.editorParseError}>
            <span class="text-xs text-red-500 mt-1">{props.editorParseError}</span>
          </Show>
        </div>
      </Show>
    </div>
  );
};
