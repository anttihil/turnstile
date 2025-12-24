import type { Component } from 'solid-js';
import { A } from '@solidjs/router';
import { Button } from '../components/ui/Button';

const HomePage: Component = () => {
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div class="text-center max-w-2xl mx-auto px-6">
        <h1 class="text-5xl font-bold text-slate-800 mb-4">
          Turnstile
        </h1>
        <p class="text-xl text-slate-600 mb-8">
          Learn symbolic logic through interactive proofs
        </p>

        <div class="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <A href="/playground">
            <Button variant="primary" size="lg">
              Formula Playground
            </Button>
          </A>
          <A href="/problems">
            <Button variant="secondary" size="lg">
              Problem Sets
            </Button>
          </A>
          <A href="/truth-tables">
            <Button variant="ghost" size="lg">
              Truth Tables
            </Button>
          </A>
        </div>

        <div class="mt-12 text-sm text-slate-500">
          <p>No account required. All progress saved locally.</p>
        </div>

        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div class="p-6 bg-white rounded-lg shadow-sm">
            <h3 class="font-semibold text-lg mb-2">Interactive Proofs</h3>
            <p class="text-slate-600 text-sm">
              Build natural deduction proofs step by step with instant validation and helpful hints.
            </p>
          </div>
          <div class="p-6 bg-white rounded-lg shadow-sm">
            <h3 class="font-semibold text-lg mb-2">Truth Tables</h3>
            <p class="text-slate-600 text-sm">
              Generate truth tables instantly and understand semantic properties of formulas.
            </p>
          </div>
          <div class="p-6 bg-white rounded-lg shadow-sm">
            <h3 class="font-semibold text-lg mb-2">Progressive Learning</h3>
            <p class="text-slate-600 text-sm">
              Unlock derived rules by proving them yourself. Build your own theorem library.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
