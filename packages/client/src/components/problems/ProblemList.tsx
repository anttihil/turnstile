import type { Component } from 'solid-js';
import { For, Show, createSignal, createMemo } from 'solid-js';
import type { Problem, DisplayMode } from '@turnstile/engine';
import { ProblemCard } from './ProblemCard';
import { Button } from '../ui/Button';

interface ProblemListProps {
  problems: Problem[];
  completedIds?: Set<string>;
  mode?: DisplayMode;
  onSelect?: (problem: Problem) => void;
}

type DifficultyFilter = 'all' | 1 | 2 | 3 | 4 | 5;

export const ProblemList: Component<ProblemListProps> = (props) => {
  const [difficultyFilter, setDifficultyFilter] = createSignal<DifficultyFilter>('all');
  const [typeFilter, setTypeFilter] = createSignal<'all' | 'exercise' | 'derivation'>('all');

  const filteredProblems = createMemo(() => {
    return props.problems.filter((p) => {
      if (difficultyFilter() !== 'all' && p.difficulty !== difficultyFilter()) {
        return false;
      }
      if (typeFilter() !== 'all' && p.type !== typeFilter()) {
        return false;
      }
      return true;
    });
  });

  const completedCount = createMemo(() => {
    return props.problems.filter((p) => props.completedIds?.has(p.id)).length;
  });

  return (
    <div>
      {/* Stats */}
      <div class="mb-6 p-4 bg-slate-50 rounded-lg">
        <div class="text-sm text-slate-600">
          Progress: <span class="font-semibold">{completedCount()}</span> / {props.problems.length} completed
        </div>
        <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
          <div
            class="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount() / props.problems.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div class="mb-6 flex flex-wrap gap-4">
        <div>
          <span class="text-sm text-slate-600 mr-2">Difficulty:</span>
          <div class="inline-flex gap-1">
            <Button
              variant={difficultyFilter() === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setDifficultyFilter('all')}
            >
              All
            </Button>
            {([1, 2, 3, 4, 5] as const).map((d) => (
              <Button
                variant={difficultyFilter() === d ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setDifficultyFilter(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <span class="text-sm text-slate-600 mr-2">Type:</span>
          <div class="inline-flex gap-1">
            <Button
              variant={typeFilter() === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={typeFilter() === 'exercise' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('exercise')}
            >
              Exercises
            </Button>
            <Button
              variant={typeFilter() === 'derivation' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('derivation')}
            >
              Derivations
            </Button>
          </div>
        </div>
      </div>

      {/* Problem Grid */}
      <Show
        when={filteredProblems().length > 0}
        fallback={
          <div class="text-center text-slate-500 py-8">
            No problems match the selected filters
          </div>
        }
      >
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <For each={filteredProblems()}>
            {(problem) => (
              <ProblemCard
                problem={problem}
                mode={props.mode}
                completed={props.completedIds?.has(problem.id)}
                onClick={() => props.onSelect?.(problem)}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
