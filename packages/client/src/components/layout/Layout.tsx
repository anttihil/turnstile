import type { Component, JSX } from 'solid-js';
import { Header } from './Header';

interface LayoutProps {
  children: JSX.Element;
}

export const Layout: Component<LayoutProps> = (props) => {
  return (
    <div class="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main class="flex-1">
        {props.children}
      </main>
    </div>
  );
};
