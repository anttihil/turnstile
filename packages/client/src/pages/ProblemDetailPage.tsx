import type { Component } from 'solid-js';
import { createSignal, createEffect, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import type { Problem, ProofStep, DisplayMode } from '@turnstile/engine';
import { useStorage } from '../storage';
import { ProofBuilder } from '../components/proof';
import { Layout } from '../components/layout';
import { Button } from '../components/ui/Button';

// Derive a title from the problem ID
const formatTitle = (id: string): string => {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ProblemDetailPage: Component = () => {
  const params = useParams<{ id: string }>();
  const { storage, isReady } = useStorage();
  const [problem, setProblem] = createSignal<Problem | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [displayMode, setDisplayMode] = createSignal<DisplayMode>('utf8');
  const [completed, setCompleted] = createSignal(false);

  createEffect(async () => {
    if (isReady() && params.id) {
      try {
        const loadedProblem = await storage.getProblem(params.id);
        setProblem(loadedProblem ?? null);

        // Check if already completed
        const submission = await storage.getSubmission(params.id);
        if (submission?.status === 'completed') {
          setCompleted(true);
        }
      } catch (e) {
        console.error('Failed to load problem:', e);
      } finally {
        setLoading(false);
      }
    }
  });

  const handleComplete = async (steps: ProofStep[]) => {
    const prob = problem();
    if (!prob) return;

    setCompleted(true);

    // Save the submission
    await storage.saveSubmission({
      id: `submission-${prob.id}-${Date.now()}`,
      problemId: prob.id,
      proof: steps,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      attempts: 1,
      hintsUsed: 0,
      clientVersion: '0.1.0',
      schemaVersion: 1,
    });
  };

  return (
    <Layout>
      <div class="max-w-4xl mx-auto p-6">
        <Show when={!loading()} fallback={<div class="text-slate-500">Loading...</div>}>
          <Show when={problem()} fallback={
            <div class="text-center py-12">
              <h1 class="text-2xl font-bold text-slate-800 mb-4">Problem Not Found</h1>
              <A href="/problems">
                <Button variant="primary">Back to Problems</Button>
              </A>
            </div>
          }>
            {(prob) => (
              <>
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-4">
                    <A href="/problems" class="text-slate-500 hover:text-slate-700">
                      &larr; Back
                    </A>
                    <h1 class="text-2xl font-bold text-slate-800">
                      {formatTitle(prob().id)}
                    </h1>
                    <Show when={completed()}>
                      <span class="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                        Completed
                      </span>
                    </Show>
                  </div>

                  <div class="flex gap-2">
                    <Button
                      variant={displayMode() === 'utf8' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setDisplayMode('utf8')}
                    >
                      Symbols
                    </Button>
                    <Button
                      variant={displayMode() === 'ascii' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setDisplayMode('ascii')}
                    >
                      ASCII
                    </Button>
                  </div>
                </div>

                <Show when={prob().hint}>
                  <p class="text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg">
                    <span class="font-medium">Hint:</span> {prob().hint}
                  </p>
                </Show>

                <ProofBuilder
                  problem={prob()}
                  mode={displayMode()}
                  onComplete={handleComplete}
                />
              </>
            )}
          </Show>
        </Show>
      </div>
    </Layout>
  );
};

export default ProblemDetailPage;
