import type { Component } from 'solid-js';
import { Playground } from '../components/playground';
import { Layout } from '../components/layout';

const PlaygroundPage: Component = () => {
  return (
    <Layout>
      <Playground />
    </Layout>
  );
};

export default PlaygroundPage;
