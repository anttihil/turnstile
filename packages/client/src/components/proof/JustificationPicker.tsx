import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { Button } from '../ui/Button';

interface JustificationPickerProps {
  selectedLines: number[];
  maxLines?: number;
  availableLines: number[];
  onLineToggle: (line: number) => void;
  onClear: () => void;
}

export const JustificationPicker: Component<JustificationPickerProps> = (props) => {
  const isSelected = (line: number) => props.selectedLines.includes(line);

  const toggleLine = (line: number) => {
    if (props.maxLines && props.selectedLines.length >= props.maxLines && !isSelected(line)) {
      return;
    }
    props.onLineToggle(line);
  };

  return (
    <div class="bg-white rounded-lg border border-slate-200 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-700">
          Select Justifications
          <Show when={props.maxLines}>
            <span class="text-slate-500 font-normal ml-1">
              ({props.selectedLines.length}/{props.maxLines})
            </span>
          </Show>
        </h3>
        <Show when={props.selectedLines.length > 0}>
          <Button variant="ghost" size="sm" onClick={props.onClear}>
            Clear
          </Button>
        </Show>
      </div>

      <Show
        when={props.availableLines.length > 0}
        fallback={
          <p class="text-sm text-slate-500">No lines available for justification.</p>
        }
      >
        <div class="flex flex-wrap gap-2">
          <For each={props.availableLines}>
            {(line) => (
              <button
                class={`w-8 h-8 rounded text-sm font-mono transition-colors
                  ${
                    isSelected(line)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                onClick={() => toggleLine(line)}
              >
                {line}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.selectedLines.length > 0}>
        <div class="mt-3 pt-3 border-t border-slate-200">
          <span class="text-sm text-slate-600">
            Selected: {props.selectedLines.sort((a, b) => a - b).join(', ')}
          </span>
        </div>
      </Show>
    </div>
  );
};
