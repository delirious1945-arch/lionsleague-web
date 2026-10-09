export function getPlayerPhotoUrl(name: string): string | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();

  // 1. Direct explicit player mappings
  if (clean.includes('sebastian') || clean.includes('kirste')) return '/players/Sebastian.png';
  if (clean.includes('erik') || clean.includes('schremmer')) return '/players/Erik%20Schremmer.jpg';
  if (clean.includes('martin') && clean.includes('thomas')) return '/players/Martin%20Thomas.jpg';
  if (clean.includes('dirk') || clean.includes('ostermann') && !clean.includes('philip')) return '/players/Dirk.jpg';
  if (clean.includes('jens') || clean.includes('goltermann')) return '/players/Jens%20Goltermann.jpg';
  if (clean.includes('kevin') || clean.includes('emde')) return '/players/Kevin.jpg';
  if (clean.includes('maik') || (clean.includes('feuerhahn') && !clean.includes('timo'))) return '/players/Maik.jpg';
  if (clean.includes('timo') && clean.includes('feuerhahn')) return '/players/Maik.jpg';
  if (clean.includes('jannik') || clean.includes('baier')) return '/players/Jannik.jpg';
  if (clean.includes('michael') && clean.includes('gehrt')) return '/players/Michael%20Gehrt.jpg';
  if (clean.includes('michael') && clean.includes('jochen')) return '/players/Michael%20Jochen.jpg';
  if (clean.includes('michael') && clean.includes('kranz')) return '/players/Michael%20Kranz.png';
  if (clean.includes('karsten') && clean.includes('kohnert') && !clean.includes('uwe')) return '/players/Karsten.png';
  if (clean.includes('karen') || clean.includes('schulz')) return '/players/Karen.png';
  if (clean.includes('nicholas') || clean.includes('nick') || clean.includes('stedman')) return '/players/Nick.png';
  if (clean.includes('andr') || clean.includes('rathje')) return '/players/Andre.png';
  if (clean.includes('gehrt')) return '/players/Gehrt.png';
  if (clean.includes('lukas')) return '/players/Lukas.png';
  if (clean.includes('malte')) return '/players/Malte.png';
  if (clean.includes('uwe')) return '/players/Uwe.png';
  if (clean.includes('martin') && clean.includes('wolnik')) return '/players/Martin%20Wolnik.png';
  if (clean.includes('philip')) return '/players/Philip.png';
  if (clean.includes('joachim') || clean.includes('achim')) return '/players/Achim.png';

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
