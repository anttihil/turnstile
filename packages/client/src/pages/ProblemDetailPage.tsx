import type { Component } from 'solid-js';
import { createSignal, createEffect, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import type { Problem, ProofStep } from '@turnstile/engine';
import { useStorage } from '../storage';
import { ProofBuilder } from '../components/proof';
import { Layout } from '../components/layout';
import { Button } from '../components/ui/Button';

const ProblemDetailPage: Component = () => {
  const params = useParams<{ id: string }>();
  const { storage, isReady } = useStorage();
  const [problem, setProblem] = createSignal<Problem | null>(null);
  const [loading, setLoading] = createSignal(true);

  createEffect(async () => {
    if (isReady() && params.id) {
      try {
        const loadedProblem = await storage.getProblem(params.id);
        setProblem(loadedProblem ?? null);
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
      <Show when={!loading()} fallback={<div class="p-6 text-slate-500">Loading...</div>}>
        <Show
          when={problem()}
          fallback={
            <div class="text-center py-12">
              <h1 class="text-2xl font-bold text-slate-800 mb-4">Problem Not Found</h1>
              <A href="/problems">
                <Button variant="primary">Back to Problems</Button>
              </A>
            </div>
          }
        >
          {(prob) => <ProofBuilder problem={prob()} onComplete={handleComplete} />}
        </Show>
      </Show>
    </Layout>
  );
};

export default ProblemDetailPage;
