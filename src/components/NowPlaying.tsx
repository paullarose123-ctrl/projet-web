import { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { currentTitle, nextTrack, onTrackChange } from '../audio/music';
import { sfx } from '../audio/sfx';

// « En écoute » : à chaque nouveau morceau de la radio (et quand on remet la musique), son titre s'affiche
// quelques secondes, avec un bouton pour passer au suivant.

const SHOW_FOR = 7000;

export function NowPlaying() {
  const off = useGame((s) => s.musicOff || s.muted);
  const [shown, setShown] = useState<string | null>(null);
  const hide = useRef<number | undefined>(undefined);

  const show = useCallback((title: string | null) => {
    if (!title) return;
    setShown(title);
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setShown(null), SHOW_FOR);
  }, []);

  useEffect(
    () =>
      onTrackChange((title) => {
        const s = useGame.getState();
        if (!s.musicOff && !s.muted) show(title);
      }),
    [show],
  );

  // musique remise : on rappelle ce qui passe ; musique coupée : on cache
  const wasOff = useRef(off);
  useEffect(() => {
    if (off) {
      window.clearTimeout(hide.current);
      setShown(null);
    } else if (wasOff.current) show(currentTitle());
    wasOff.current = off;
  }, [off, show]);

  useEffect(() => () => window.clearTimeout(hide.current), []);

  if (!shown) return null;
  return (
    <div
      className="now-playing"
      role="status"
      onMouseEnter={() => window.clearTimeout(hide.current)}
      onMouseLeave={() => show(shown)}
    >
      <span className="now-playing__eq" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="now-playing__text" key={shown}>
        <small>Radio AnimalCards</small>
        <b>{shown}</b>
      </span>
      <button
        type="button"
        className="now-playing__next"
        aria-label="Morceau suivant"
        title="Morceau suivant"
        onClick={() => {
          sfx.click();
          nextTrack();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5,6 L13,12 L5,18 Z M13,6 L21,12 L13,18 Z" />
        </svg>
      </button>
    </div>
  );
}
