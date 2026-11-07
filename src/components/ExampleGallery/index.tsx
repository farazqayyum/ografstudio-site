import {useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ExampleTags from '@site/src/components/ExampleTags';
import {EXAMPLE_LEVELS, examples, type Example, type ExampleLevel} from '@site/src/data/examples';
import styles from './styles.module.css';

function ExampleCard({example}: {example: Example}): ReactNode {
  return (
    <Link className={styles.card} to={`/examples/${example.slug}`}>
      <div className={styles.thumb}>
        <img className={styles.thumbImg} src={useBaseUrl(example.image)} alt="" loading="lazy" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{example.title}</h3>
        <p className={styles.summary}>{example.summary}</p>
        <ExampleTags slug={example.slug} />
      </div>
    </Link>
  );
}

const listed = examples.filter((example) => !example.unlisted);

// Simplest first, keeping the listed order within each level.
const byLevel = [...listed].sort(
  (a, b) => EXAMPLE_LEVELS.indexOf(a.level) - EXAMPLE_LEVELS.indexOf(b.level),
);

export default function ExampleGallery(): ReactNode {
  const [level, setLevel] = useState<ExampleLevel | null>(null);
  const choices: {label: string; value: ExampleLevel | null; count: number}[] = [
    {label: 'All', value: null, count: listed.length},
    ...EXAMPLE_LEVELS.map((value) => ({
      label: value,
      value,
      count: listed.filter((example) => example.level === value).length,
    })),
  ];
  return (
    <>
      <div className={styles.filter} role="group" aria-label="Filter examples by level">
        {choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            className={styles.choice}
            aria-pressed={level === choice.value}
            onClick={() => setLevel(choice.value)}>
            {choice.label} <span>{choice.count}</span>
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {byLevel
          .filter((example) => !level || example.level === level)
          .map((example) => (
            <ExampleCard key={example.slug} example={example} />
          ))}
      </div>
    </>
  );
}
