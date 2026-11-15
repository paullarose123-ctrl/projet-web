import type { Theme } from '../engine/duel';

// L'icône du thème d'une question de duel, au trait (couleur du texte, épaisseur fixe) : une balance pour le poids,
// une règle pour la taille, un sablier pour la longévité, un bouclier pour les menaces…

const PATHS: Record<Theme, string[]> = {
  // balance à deux plateaux
  poids: ['M12 4v16', 'M7 20h10', 'M5 7h14', 'M12 4.5a1.2 1.2 0 1 0 0-.01', 'M5 7l-3 6a3 3 0 0 0 6 0z', 'M19 7l-3 6a3 3 0 0 0 6 0z'],
  // règle graduée, posée en biais
  taille: ['M3.5 15.5l12-12 5 5-12 12z', 'M7 12l2 2', 'M10 9l1.5 1.5', 'M13 6l2 2', 'M8.5 10.5l1 1', 'M11.5 7.5l1 1'],
  // sablier
  longevite: ['M6 3h12', 'M6 21h12', 'M7 3c0 5 5 6 5 9s-5 4-5 9', 'M17 3c0 5-5 6-5 9s5 4 5 9', 'M9.5 18.5h5'],
  // une foule : trois têtes
  population: ['M12 9a2.6 2.6 0 1 0 0-.01', 'M5.5 11a2.1 2.1 0 1 0 0-.01', 'M18.5 11a2.1 2.1 0 1 0 0-.01', 'M7.5 20a4.5 4.5 0 0 1 9 0', 'M2 19.5a3.6 3.6 0 0 1 5-3.3', 'M22 19.5a3.6 3.6 0 0 0-5-3.3'],
  // bouclier et point d'exclamation
  menaces: ['M12 3l8 3v6c0 4.6-3.4 8-8 9-4.6-1-8-4.4-8-9V6z', 'M12 8v5', 'M12 16.2v.3'],
  // globe
  continent: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
  // empreinte de patte
  classe: ['M12 13c-3 0-5.5 3-5.5 5.2 0 1.6 1.4 2.3 3 1.8l2.5-.8 2.5.8c1.6.5 3-.2 3-1.8C17.5 16 15 13 12 13z', 'M5.5 10.5a1.7 2.1 0 1 0 0-.01', 'M9.5 6.5a1.7 2.2 0 1 0 0-.01', 'M14.5 6.5a1.7 2.2 0 1 0 0-.01', 'M18.5 10.5a1.7 2.1 0 1 0 0-.01'],
  // feuille
  regime: ['M5 19c0-8 5-14 15-15-1 10-7 15-15 15z', 'M5 19c3-4 6-7 10-10'],
  // demi-soleil et lune
  rythme: ['M12 3v2', 'M4.6 6.6l1.4 1.4', 'M3 14h2', 'M7 14a5 5 0 0 1 10 0', 'M3 18h18', 'M19 4.5a3 3 0 1 0 2.5 4.5 3.5 3.5 0 0 1-2.5-4.5z'],
  // deux silhouettes
  'vie-sociale': ['M9 9a3 3 0 1 0 0-.01', 'M3.5 20a5.5 5.5 0 0 1 11 0', 'M16.5 10a2.4 2.4 0 1 0 0-.01', 'M15.5 15a4.5 4.5 0 0 1 5.5 5'],
  // œuf
  petits: ['M12 3c3.6 0 6.5 5.4 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.4 8.4 3 12 3z'],
  // aile
  vol: ['M3 17c4 0 8-2 10-6l3-6c-4 1-7 3-9 6', 'M3 17c4 1 8 0 11-3', 'M7 19.5c3 .5 6-.5 8.5-3', 'M13 11l8 2'],
  // montagne et vague
  milieu: ['M2 16l6-9 4 5 3-3 7 7', 'M2 20c2-1.4 3.5-1.4 5 0s3 1.4 5 0 3.5-1.4 5 0 3 1.4 5 0'],
};

export function QuestionIcon({ theme, className = '' }: { theme: Theme; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {(PATHS[theme] ?? PATHS.classe).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
