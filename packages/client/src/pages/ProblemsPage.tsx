import type { Component } from 'solid-js';
import { createSignal, createEffect, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import type { Problem } from '@turnstile/engine';
import { useStorage } from '../storage';
import { ProblemList } from '../components/problems';
import { Layout } from '../components/layout';

const ProblemsPage: Component = () => {
  const navigate = useNavigate();
  const { storage, isReady } = useStorage();
  const [problems, setProblems] = createSignal<Problem[]>([]);
  const [completedIds, setCompletedIds] = createSignal<Set<string>>(new Set());
  const [loading, setLoading] = createSignal(true);

  createEffect(async () => {
    if (isReady()) {
      try {
        const loadedProblems = await storage.getProblems();
        setProblems(loadedProblems);

        const submissions = await storage.getAllSubmissions();
        const completed = new Set(
          submissions
            .filter((s) => s.status === 'completed')
            .map((s) => s.problemId)
        );
        setCompletedIds(completed);
      } catch (e) {
        console.error('Failed to load problems:', e);
      } finally {
        setLoading(false);
      }
    }
  });

  const handleSelect = (problem: Problem) => {
    navigate(`/problems/${problem.id}`);
  };

  return (
    <Layout>
      <div class="p-6">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-2xl font-bold mb-6">Problems</h1>

          <Show when={!loading()} fallback={<div class="text-slate-500">Loading problems...</div>}>
            <ProblemList
              problems={problems()}
              completedIds={completedIds()}
              onSelect={handleSelect}
            />
          </Show>
        </div>
      </div>
    </Layout>
  );
};

export default ProblemsPage;
