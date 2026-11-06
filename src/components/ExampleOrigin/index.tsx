import type {ReactNode} from 'react';
import {examples, type ExampleOrigin as Origin} from '@site/src/data/examples';
import styles from './styles.module.css';

/** The model, the generation time and the prompts, for a page's panel or the reel's dialog. */
export function OriginDetails({origin}: {origin: Origin}): ReactNode {
  const promptSource = origin.writtenAfterwards
    ? 'This prompt was written afterwards to describe the template, which was built from a wider brief.'
    : `${origin.prompts.length > 1 ? 'Prompts' : 'Prompt'} edited for clarity.`;
  return (
    <>
      <dl className={styles.facts}>
        <div>
          <dt>Model</dt>
          <dd>{origin.model}</dd>
        </div>
        <div>
          <dt>Generation time</dt>
          <dd>{origin.generationTime}</dd>
        </div>
      </dl>
      <p className={styles.promptsLabel}>{origin.prompts.length > 1 ? 'Prompts, in order' : 'Prompt'}</p>
      <ol className={styles.prompts}>
        {origin.prompts.map((prompt) => (
          <li key={prompt}>
            <blockquote className={styles.prompt}>{prompt}</blockquote>
          </li>
        ))}
      </ol>
      <p className={styles.note}>
        {promptSource} The time is estimated from the session records and covers writing and building only, not
        waiting, checks or tests.
      </p>
    </>
  );
}

/** The prompts, model and generation time behind an example. */
export default function ExampleOrigin({slug}: {slug: string}): ReactNode {
  const origin = examples.find((item) => item.slug === slug)?.origin;
  if (!origin) throw new Error(`No origin for ${slug} in src/data/examples.ts`);
  return (
    <section className={styles.origin} aria-labelledby={`${slug}-origin`}>
      <h2 id={`${slug}-origin`} className={styles.heading}>
        How this template was made
      </h2>
      <OriginDetails origin={origin} />
    </section>
  );
}
