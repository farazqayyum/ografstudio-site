import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {examples, type Example} from '@site/src/data/examples';
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
        <ul className={styles.tags} aria-label="Tags">
          {example.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </Link>
  );
}

export default function ExampleGallery({limit}: {limit?: number}): ReactNode {
  const shown = limit ? examples.slice(0, limit) : examples;
  return (
    <div className={styles.grid}>
      {shown.map((example) => (
        <ExampleCard key={example.slug} example={example} />
      ))}
    </div>
  );
}
