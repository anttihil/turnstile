import type { Component } from 'solid-js';
import { A, useLocation } from '@solidjs/router';

export const Header: Component = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-slate-200 text-slate-900'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <header class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-8">
            <A href="/" class="flex items-center gap-2">
              <span class="text-xl font-bold text-slate-800">Turnstile</span>
            </A>

            <nav class="hidden md:flex gap-1">
              <A href="/playground" class={linkClass('/playground')}>
                Playground
              </A>
              <A href="/problems" class={linkClass('/problems')}>
                Problems
              </A>
              <A href="/truth-tables" class={linkClass('/truth-tables')}>
                Truth Tables
              </A>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav class="md:hidden border-t border-slate-100 px-4 py-2 flex gap-2 overflow-x-auto">
        <A href="/playground" class={linkClass('/playground')}>
          Playground
        </A>
        <A href="/problems" class={linkClass('/problems')}>
          Problems
        </A>
        <A href="/truth-tables" class={linkClass('/truth-tables')}>
          Truth Tables
        </A>
      </nav>
    </header>
  );
};
