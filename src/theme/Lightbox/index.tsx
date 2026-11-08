import {createContext, useCallback, useContext, useRef, useState, type MouseEvent, type ReactNode} from 'react';
import styles from './styles.module.css';

type Picture = {src: string; alt: string};

const LightboxContext = createContext<(picture: Picture) => void>(() => {});

/** Opens the site's one lightbox with a picture. Markdown images call it when clicked. */
export function useLightbox(): (picture: Picture) => void {
  return useContext(LightboxContext);
}

/**
 * One dialog for the whole site, rendered at the root so it never sits inside the paragraph that
 * holds an image. Screenshots in the guides are reduced to the text column, which hides the small
 * type in Studio's panels; this shows them at the width of the window.
 */
export default function LightboxProvider({children}: {children: ReactNode}): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [picture, setPicture] = useState<Picture | null>(null);

  const open = useCallback((next: Picture) => {
    setPicture(next);
    dialogRef.current?.showModal();
  }, []);
  const close = () => dialogRef.current?.close();
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close();
  };

  return (
    <LightboxContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        onClick={closeOnBackdrop}
        onClose={() => setPicture(null)}
        aria-label={picture?.alt || 'Enlarged image'}>
        <div className={styles.frame}>
          {picture && (
            <div className={styles.picture}>
              <img src={picture.src} alt={picture.alt} className={styles.full} />
              <button type="button" className={styles.close} onClick={close} aria-label="Close">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
          )}
          {picture?.alt && <p className={styles.caption}>{picture.alt}</p>}
        </div>
      </dialog>
    </LightboxContext.Provider>
  );
}
