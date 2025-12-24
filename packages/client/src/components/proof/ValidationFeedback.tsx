import type { Component } from 'solid-js';
import { Show, For } from 'solid-js';

interface ValidationError {
  lineNumber: number;
  message: string;
}

interface ValidationFeedbackProps {
  errors: ValidationError[];
  isValid: boolean;
  isComplete: boolean;
}

export const ValidationFeedback: Component<ValidationFeedbackProps> = (props) => {
  return (
    <div class="rounded-lg p-4">
      <Show when={props.isComplete && props.isValid}>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center gap-2">
            <span class="text-green-600 text-xl">&#10003;</span>
            <span class="text-green-700 font-medium">Proof Complete!</span>
          </div>
          <p class="text-green-600 text-sm mt-1">
            Your proof is valid. The conclusion follows from the premises.
          </p>
        </div>
      </Show>

      <Show when={props.errors.length > 0}>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-red-600 text-xl">!</span>
            <span class="text-red-700 font-medium">Validation Errors</span>
          </div>
          <ul class="space-y-1">
            <For each={props.errors}>
              {(error) => (
                <li class="text-red-600 text-sm">
                  <span class="font-mono">Line {error.lineNumber}:</span> {error.message}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={!props.isComplete && props.isValid && props.errors.length === 0}>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center gap-2">
            <span class="text-blue-600 text-xl">&#8594;</span>
            <span class="text-blue-700 font-medium">In Progress</span>
          </div>
          <p class="text-blue-600 text-sm mt-1">
            Your proof is valid so far. Continue adding steps to reach the conclusion.
          </p>
        </div>
      </Show>
    </div>
  );
};
