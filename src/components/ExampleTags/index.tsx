import type {ReactNode} from 'react';
import {examples, type ExampleLevel} from '@site/src/data/examples';
import styles from './styles.module.css';

const LEVEL_CLASS: Record<ExampleLevel, string> = {
  Basic: styles.basic,
  Intermediate: styles.intermediate,
  Advanced: styles.advanced,
};

/** How much a graphic asks of whoever opens it in Studio. */
export function LevelTag({level}: {level: ExampleLevel}): ReactNode {
  return <span className={`${styles.level} ${LEVEL_CLASS[level]}`}>{level}</span>;
}

/** The level and feature tags at the top of an example's page. */
export default function ExampleTags({slug}: {slug: string}): ReactNode {
  const example = examples.find((item) => item.slug === slug);
  if (!example) throw new Error(`No example called ${slug} in src/data/examples.ts`);
  return (
    <ul className={styles.tags} aria-label="Tags">
      <li>
        <LevelTag level={example.level} />
      </li>
      {example.tags.map((tag) => (
        <li key={tag} className={styles.tag}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
