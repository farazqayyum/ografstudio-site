import type {ReactNode} from 'react';
import LightboxProvider from '@site/src/theme/Lightbox';

/** Wraps every page. Holds the one lightbox that Markdown images open when clicked. */
export default function Root({children}: {children: ReactNode}): ReactNode {
  return <LightboxProvider>{children}</LightboxProvider>;
}
