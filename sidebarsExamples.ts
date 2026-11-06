import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import {examples} from './src/data/examples';

const sidebars: SidebarsConfig = {
  examples: [
    {
      type: 'category',
      label: 'Gallery',
      link: {type: 'doc', id: 'index'},
      collapsible: false,
      items: examples.map((example) => example.slug),
    },
  ],
};

export default sidebars;
