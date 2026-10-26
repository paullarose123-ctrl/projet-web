// Saisons du jeu : un décor et des musiques de fête, aux mêmes dates chaque année (heure du joueur).
// Halloween et le Jour des morts : du 20 octobre au 1er novembre inclus. Chauves-souris, citrouilles,
// cempasúchil et calaveras s'invitent dans l'interface, et la radio passe deux morceaux de saison.

/** Est-ce la saison d'Halloween et du Jour des morts ? */
export function isHalloween(now: number = Date.now()): boolean {
  const date = new Date(now);
  const month = date.getMonth();
  const day = date.getDate();
  return (month === 9 && day >= 20) || (month === 10 && day === 1);
}
