import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVENT, AVENT_DAYS, AVENT_ENERGY_CREDITS, AVENT_LAYOUT, aventDay, aventOpened, canOpenAvent, markAvent } from '../avent';
import { seasonAt } from '../season';
import { ATHLETES_BY_ID } from '../../data/athletes';
import { rarityOf } from '../cards';
import { serieOf } from '../series';
import { PIOCHE_MAX } from '../pioche';
import { MAX_FREE_PACKS } from '../packs';
import { useGame } from '../../store/game';

const at = (month: number, day: number, hour = 10) => new Date(2026, month, day, hour).getTime();

describe('Noël et calendrier de l’Avent', () => {
  afterEach(() => vi.useRealTimers());

  it('Noël dure du 1er décembre au 6 janvier', () => {
    expect(seasonAt(at(10, 30, 23))).toBe(null);
    expect(seasonAt(at(11, 1, 0))).toBe('noel');
    expect(seasonAt(at(11, 31, 23))).toBe('noel');
    expect(seasonAt(new Date(2027, 0, 6, 23).getTime())).toBe('noel');
    expect(seasonAt(new Date(2027, 0, 7, 0).getTime())).toBe(null);
  });

  it('a 24 cases, chacune son cadeau, et le calendrier les mélange toutes', () => {
    expect(AVENT).toHaveLength(AVENT_DAYS);
    AVENT.forEach((entry, i) => expect(entry.day).toBe(i + 1));
    expect(new Set(AVENT.map((entry) => entry.title)).size).toBe(AVENT_DAYS);
    expect([...AVENT_LAYOUT].sort((a, b) => a - b)).toEqual(AVENT.map((entry) => entry.day));
    // le grand cadeau du réveillon : le Pack Icônes
    const last = AVENT[AVENT_DAYS - 1].reward;
    expect(last.kind === 'pack' && last.pack.id).toBe('icones');
  });

  it('seule la case du jour s’ouvre, une fois, du 1er au 24 décembre', () => {
    expect(aventDay(at(10, 30))).toBe(null);
    expect(aventDay(at(11, 1, 0))).toBe(1);
    expect(aventDay(at(11, 24, 23))).toBe(24);
    expect(aventDay(at(11, 25))).toBe(null);
    const now = at(11, 6);
    expect(canOpenAvent(undefined, 6, now)).toBe(true);
    expect(canOpenAvent(undefined, 5, now)).toBe(false);
    expect(canOpenAvent(undefined, 7, now)).toBe(false);
    const state = markAvent(undefined, 6, now);
    expect(canOpenAvent(state, 6, now)).toBe(false);
    // l'an prochain, le calendrier repart fermé
    expect(aventOpened(state, new Date(2027, 11, 6).getTime())).toEqual([]);
  });

  it('donne le cadeau de la case dans la partie', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const game = useGame.getState();
    game.resetGame();

    // 2 décembre : des crédits, une seule fois ; la case du lendemain reste fermée
    vi.setSystemTime(at(11, 2));
    const before = useGame.getState().balles;
    expect(useGame.getState().openAvent(2)?.title).toBe('2 500 crédits');
    expect(useGame.getState().balles).toBe(before + 2_500);
    expect(useGame.getState().openAvent(2)).toBe(null);
    expect(useGame.getState().openAvent(3)).toBe(null);

    // 4 décembre : des boosters gratuits (au-delà de la limite, des crédits)
    vi.setSystemTime(at(11, 4));
    useGame.setState({ freePacks: MAX_FREE_PACKS - 1 });
    const balles = useGame.getState().balles;
    useGame.getState().openAvent(4);
    expect(useGame.getState().freePacks).toBe(MAX_FREE_PACKS);
    expect(useGame.getState().balles).toBeGreaterThan(balles);

    // 5 décembre : l'énergie miracle remplie, ou des crédits si elle l'était déjà
    vi.setSystemTime(at(11, 5));
    useGame.setState((s) => ({ pioche: { ...s.pioche, energy: 1, nextAt: Date.now() + 3_600_000 } }));
    useGame.getState().openAvent(5);
    expect(useGame.getState().pioche.energy).toBe(PIOCHE_MAX);
    useGame.setState({ avent: { year: 2026, opened: [2, 4] } });
    const full = useGame.getState().balles;
    useGame.getState().openAvent(5);
    expect(useGame.getState().balles).toBe(full + AVENT_ENERGY_CREDITS);

    // 13 décembre : une Légendaire de l'Hiver, ouverte aussitôt
    vi.setSystemTime(at(11, 13));
    useGame.setState({ opening: null });
    useGame.getState().openAvent(13);
    const cards = useGame.getState().opening!.cards;
    expect(cards).toHaveLength(1);
    expect(serieOf(ATHLETES_BY_ID[cards[0].athleteId])).toBe(3);
    expect(rarityOf(ATHLETES_BY_ID[cards[0].athleteId]).id).toBe('legendaire');
    // pendant une ouverture, une case ne s'ouvre pas
    vi.setSystemTime(at(11, 14));
    expect(useGame.getState().openAvent(14)).toBe(null);

    // 20 décembre : une Prime de l'Hiver
    vi.setSystemTime(at(11, 20));
    useGame.setState({ opening: null });
    useGame.getState().openAvent(20);
    const prime = useGame.getState().opening!.cards[0];
    expect(prime.variant).toBe('prime');
    expect(serieOf(ATHLETES_BY_ID[prime.athleteId])).toBe(3);
    expect(aventOpened(useGame.getState().avent, at(11, 20))).toEqual([2, 4, 5, 13, 20]);
  });
});
