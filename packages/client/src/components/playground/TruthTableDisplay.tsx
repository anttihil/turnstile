import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { generateTruthTable, printFormula } from '@turnstile/engine';
import type { Formula, DisplayMode } from '@turnstile/engine';

interface TruthTableDisplayProps {
  formula: Formula;
  mode?: DisplayMode;
}

export const TruthTableDisplay: Component<TruthTableDisplayProps> = (props) => {
  const mode = () => props.mode ?? 'utf8';
  const table = () => generateTruthTable(props.formula);

  const formatBool = (val: boolean) => (val ? 'T' : 'F');

  return (
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse">
        <thead>
          <tr class="bg-slate-100">
            <For each={table().variables}>
              {(variable) => (
                <th class="px-4 py-2 border border-slate-300 font-mono font-medium">
                  {variable}
                </th>
              )}
            </For>
            <th class="px-4 py-2 border border-slate-300 font-mono font-medium bg-slate-200">
              {printFormula(props.formula, mode())}
            </th>
          </tr>
        </thead>
        <tbody>
          <For each={table().rows}>
            {(row) => (
              <tr class="hover:bg-slate-50">
                <For each={table().variables}>
                  {(variable) => (
                    <td class="px-4 py-2 border border-slate-300 text-center font-mono">
                      {formatBool(row.inputs[variable]!)}
                    </td>
                  )}
                </For>
                <td
                  class={`px-4 py-2 border border-slate-300 text-center font-mono font-bold
                    ${row.result ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatBool(row.result)}
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <div class="mt-4 flex gap-4 text-sm">
        <Show when={table().isTautology}>
          <span class="text-green-600 font-medium">Tautology (always true)</span>
        </Show>
        <Show when={table().isContradiction}>
          <span class="text-red-600 font-medium">Contradiction (always false)</span>
        </Show>
        <Show when={!table().isTautology && !table().isContradiction}>
          <span class="text-slate-600">Contingent (satisfiable but not a tautology)</span>
        </Show>
      </div>
    </div>
  );
};
