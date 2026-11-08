import type {ReactNode} from 'react';
import Img from '@theme-original/MDXComponents/Img';
import type ImgType from '@theme/MDXComponents/Img';
import type {WrapperProps} from '@docusaurus/types';
import {useLightbox} from '@site/src/theme/Lightbox';
import styles from './styles.module.css';

type Props = WrapperProps<typeof ImgType>;

const NAMED_ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};

/** Alt text written in Markdown reaches the component with its HTML entities still encoded. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Every Markdown image is a button that opens the site's lightbox at full size. */
export default function ImgWrapper(props: Props): ReactNode {
  const open = useLightbox();
  const alt = typeof props.alt === 'string' ? decodeEntities(props.alt) : '';
  const src = typeof props.src === 'string' ? props.src : '';

  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={() => open({src, alt})}
      aria-label={alt ? `Enlarge: ${alt}` : 'Enlarge image'}
      title="Click to enlarge">
      <Img {...props} alt={alt} />
      <span className={styles.hint} aria-hidden="true">
        Enlarge
      </span>
    </button>
  );
}
