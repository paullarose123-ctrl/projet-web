import { CardBackMexique } from '../components/CardBackMexique';
import { Logo } from '../components/Logo';
import { PackArtMexique } from '../components/PackArtMexique';
import { DURATION, MexicoScene, Papel, Petals } from './MexiquePromo';

// Affiche de la Série 2 (une seule image, 1080 × 1920) : le Mexique de la vidéo au soleil levé, le booster
// devant le soleil, entouré de dos de cartes, puis la date de sortie. Le texte reste dans le haut et le
// milieu de l'image : sur TikTok, la légende et les boutons recouvrent le bas et le bord droit.

/** la scène au repos : soleil levé, guirlandes immobiles */
const T = DURATION;

/** zones du texte (x0, y0, x1, y1) : aucun pétale ne tombe derrière */
const TEXT: Array<[number, number, number, number]> = [
  [150, 150, 390, 210],
  [55, 200, 485, 318],
  [80, 308, 460, 366],
  [170, 656, 370, 704],
  [60, 696, 480, 768],
  [65, 764, 475, 810],
];
const clear = (x: number, y: number) => !TEXT.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);

/** dos de cartes en éventail derrière le booster, des plus écartées aux plus proches */
const FAN = [
  { x: -148, y: 34, angle: -22 },
  { x: 148, y: 34, angle: 22 },
  { x: -84, y: 8, angle: -11 },
  { x: 84, y: 8, angle: 11 },
];

export function MexiqueAffiche() {
  return (
    <div className="promo affiche">
      {/* l'aigle passe hors champ : celui du booster suffit */}
      <MexicoScene t={T} eagle={[-40, 0]} />
      <div className="promo__rays affiche__rays" />
      <div className="affiche__shade" />
      <Papel t={T} />
      <Petals t={T} from={3.1} keep={clear} />

      <div className="promo__line promo__logo promo__logo--end affiche__logo">
        <Logo />
      </div>
      <div className="promo__line promo__title affiche__title">Mexique</div>
      <div className="promo__line promo__pill affiche__pill">
        <span>Série 2 · nouvelle extension</span>
      </div>

      {FAN.map(({ x, y, angle }) => (
        <div key={x} className="affiche__card" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle}deg)` }}>
          <CardBackMexique />
        </div>
      ))}
      <div className="affiche__pack">
        <PackArtMexique />
      </div>

      <div className="promo__line promo__date-label affiche__date-label">Disponible le</div>
      <div className="promo__line promo__date affiche__date">1er novembre</div>
      <div className="promo__line promo__url affiche__url">
        Joue gratuitement sur <b>animalcards.fr</b>
      </div>
    </div>
  );
}
