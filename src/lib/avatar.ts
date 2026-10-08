export function getPlayerPhotoUrl(name: string): string | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();

  const map: Record<string, string> = {
    'sebastian kirste': '/players/Sebastian.png',
    'erik schremmer': '/players/Erik%20Schremmer.jpg',
    'martin thomas': '/players/Martin%20Thomas.jpg',
    'dirk ostermann': '/players/Dirk.jpg',
    'jens goltermann': '/players/Jens%20Goltermann.jpg',
    'kevin emde': '/players/Kevin.jpg',
    'maik feuerhahn': '/players/Maik.jpg',
    'jannik baier': '/players/Jannik.jpg',
    'michael gehrt': '/players/Michael%20Gehrt.jpg',
    'michael jochen': '/players/Michael%20Jochen.jpg',
    'michael kranz': '/players/Michael%20Kranz.png',
    'karsten kohnert': '/players/Karsten.png',
    'karen schulz': '/players/Karen.png',
    'nicholas stedman': '/players/Nick.png',
    'philip ostermann': '/players/Philip.png',
    'martin wolnik': '/players/Martin%20Wolnik.png',
    'uwe kohnert': '/players/Uwe.png',
    'achim': '/players/Achim.png',
    'joachim koch': '/players/Achim.png',
  };

  if (map[clean]) return map[clean];

  for (const [k, v] of Object.entries(map)) {
    if (clean.includes(k) || k.includes(clean)) return v;
  }

  return null;
}

export function getPlayerInitials(name: string): string {
  if (!name) return '🎯';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}
