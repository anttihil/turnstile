import type { Component } from 'solid-js';
import { createEffect, Show, lazy } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { StorageProvider, useStorage } from './storage';
import { seedDatabase } from './data/loader';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage'));
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'));
const ProblemDetailPage = lazy(() => import('./pages/ProblemDetailPage'));

/**
 * App initialization wrapper that handles database seeding.
 */
const AppInitializer: Component<{ children: any }> = (props) => {
  const { storage, isReady, error } = useStorage();

  createEffect(async () => {
    if (isReady()) {
      try {
        await seedDatabase(storage);
      } catch (e) {
        console.error('Failed to seed database:', e);
      }
    }
  });

  return (
    <Show
      when={!error()}
      fallback={
        <div class="min-h-screen flex items-center justify-center bg-red-50">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-red-800 mb-2">Error</h1>
            <p class="text-red-600">{error()}</p>
          </div>
        </div>
      }
    >
      <Show
        when={isReady()}
        fallback={
          <div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p class="text-slate-600">Loading...</p>
            </div>
          </div>
        }
      >
        {props.children}
      </Show>
    </Show>
  );
};

const App: Component = () => {
  return (
    <StorageProvider>
      <AppInitializer>
        <Router>
          <Route path="/" component={HomePage} />
          <Route path="/playground" component={PlaygroundPage} />
          <Route path="/problems" component={ProblemsPage} />
          <Route path="/problems/:id" component={ProblemDetailPage} />
          <Route path="/truth-tables" component={PlaygroundPage} />
        </Router>
      </AppInitializer>
    </StorageProvider>
  );
};

export default App;
