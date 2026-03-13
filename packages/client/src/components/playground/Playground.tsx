import type { Component } from 'solid-js';
import { createSignal, Show } from 'solid-js';
import type { Formula, ParseResult } from '@turnstile/engine';
import { FormulaInput } from './FormulaInput';
import { FormulaDisplay } from './FormulaDisplay';
import { TruthTableDisplay } from './TruthTableDisplay';
import { Button } from '../ui/Button';

export const Playground: Component = () => {
  const [input, setInput] = createSignal('');
  const [formula, setFormula] = createSignal<Formula | null>(null);
  const [showTruthTable, setShowTruthTable] = createSignal(true);

  const handleParsed = (result: ParseResult<Formula>) => {
    if (result.success && input().trim()) {
      setFormula(result.value);
    } else {
      setFormula(null);
    }
  };

  return (
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-2xl font-bold mb-6">Formula Playground</h1>

      <div class="mb-6">
        <FormulaInput
          value={input()}
          onValueChange={setInput}
          onParsed={handleParsed}
          label="Enter a formula"
        />
      </div>

      <Show when={formula()}>
        <div class="mb-6 p-4 bg-slate-50 rounded-lg">
          <h2 class="text-lg font-semibold mb-2">Parsed Formula</h2>
          <div class="text-2xl font-mono">
            <FormulaDisplay formula={formula()!} />
          </div>
        </div>

        <div class="mb-4 flex gap-2">
          <Button
            variant={showTruthTable() ? 'primary' : 'ghost'}
            onClick={() => setShowTruthTable(!showTruthTable())}
          >
            {showTruthTable() ? 'Hide' : 'Show'} Truth Table
          </Button>
        </div>

        <Show when={showTruthTable()}>
          <div class="p-4 bg-white rounded-lg border border-slate-200">
            <h2 class="text-lg font-semibold mb-4">Truth Table</h2>
            <TruthTableDisplay formula={formula()!} />
          </div>
        </Show>
      </Show>

      <Show when={!formula() && input().trim()}>
        <div class="p-4 bg-red-50 rounded-lg border border-red-200">
          <p class="text-red-700">Unable to parse formula. Please check the syntax.</p>
        </div>
      </Show>

      <Show when={!input().trim()}>
        <div class="p-4 bg-slate-50 rounded-lg">
          <h2 class="text-lg font-semibold mb-2">Quick Reference</h2>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 class="font-medium mb-1">Operators</h3>
              <ul class="space-y-1 text-slate-600">
                <li><code class="bg-slate-200 px-1 rounded">&amp;</code> or <code class="bg-slate-200 px-1 rounded">and</code> — AND (∧)</li>
                <li><code class="bg-slate-200 px-1 rounded">or</code> or <code class="bg-slate-200 px-1 rounded">v</code> — OR (∨)</li>
                <li><code class="bg-slate-200 px-1 rounded">~</code> or <code class="bg-slate-200 px-1 rounded">not</code> — NOT (¬)</li>
                <li><code class="bg-slate-200 px-1 rounded">-&gt;</code> or <code class="bg-slate-200 px-1 rounded">implies</code> — IMPLIES (→)</li>
                <li><code class="bg-slate-200 px-1 rounded">&lt;-&gt;</code> or <code class="bg-slate-200 px-1 rounded">iff</code> — IFF (↔)</li>
                <li><code class="bg-slate-200 px-1 rounded">_|_</code> — FALSE (⊥)</li>
              </ul>
            </div>
            <div>
              <h3 class="font-medium mb-1">Examples</h3>
              <ul class="space-y-1 text-slate-600 font-mono">
                <li>P &amp; Q</li>
                <li>P or Q</li>
                <li>P -&gt; Q</li>
                <li>~(P &amp; Q)</li>
                <li>(P -&gt; Q) &amp; (Q -&gt; P)</li>
              </ul>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
