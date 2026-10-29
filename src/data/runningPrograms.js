function expandCycles(warmupSec, cyclesCount, runSec, walkSec, cooldownSec, runLabel = 'Course souple (Aisance respiratoire)', walkLabel = 'Marche de récupération') {
  const intervals = [];
  if (warmupSec > 0) {
    intervals.push({
      type: 'warmup',
      label: 'Échauffement — Marche active',
      tip: 'Marche d’un bon pas en relâchant bien les épaules pour préparer tes articulations.',
      durationSec: warmupSec,
      speedKmh: 5.2
    });
  }
  for (let i = 1; i <= cyclesCount; i++) {
    intervals.push({
      type: 'run',
      label: `${runLabel} (Cycle ${i}/${cyclesCount})`,
      tip: 'Cours lentement ! Tu dois être capable de parler sans être essoufflé.',
      durationSec: runSec,
      speedKmh: 8.5
    });
    if (walkSec > 0 && i <= cyclesCount) {
      intervals.push({
        type: 'walk',
        label: `${walkLabel} (Cycle ${i}/${cyclesCount})`,
        tip: 'Marche tranquillement et souffle profondément pour faire redescendre le cardio.',
        durationSec: walkSec,
        speedKmh: 5.0
      });
    }
  }
  if (cooldownSec > 0) {
    intervals.push({
      type: 'cooldown',
      label: 'Retour au calme — Marche lente',
      tip: 'Ralentis progressivement et respire calmement.',
      durationSec: cooldownSec,
      speedKmh: 4.5
    });
  }
  return intervals;
}

export const RUNNING_PROGRAMS = [
  {
    id: 'run-lvl1',
    title: 'Étape 1 — Débutant Absolu (1 min Course / 1m30 Marche)',
    badge: 'Semaine 1-2 • Débutant',
    level: 'Niveau 1',
    totalMin: 23,
    icon: '🌱',
    color: '#10b981',
    goal: 'Habituer le cœur, les tendons et la respiration sans jamais finir à bout de souffle.',
    summary: '5 min échauffement + 6 × (1 min course lente / 1m30 marche) + 3 min retour au calme',
    intervals: expandCycles(300, 6, 60, 90, 180)
  },
  {
    id: 'run-lvl2',
    title: 'Étape 2 — Gagner en souffle (2 min Course / 1 min Marche)',
    badge: 'Semaine 3-4 • Débutant',
    level: 'Niveau 2',
    totalMin: 26,
    icon: '🌿',
    color: '#3b82f6',
    goal: 'Doubler le temps de course tout en gardant une récupération active courte.',
    summary: '5 min échauffement + 6 × (2 min course / 1 min marche) + 3 min retour au calme',
    intervals: expandCycles(300, 6, 120, 60, 180)
  },
  {
    id: 'run-lvl3',
    title: 'Étape 3 — Cap des blocs de 4 minutes',
    badge: 'Semaine 5-6 • Intermédiaire',
    level: 'Niveau 3',
    totalMin: 28,
    icon: '🔥',
    color: '#f59e0b',
    goal: 'Franchir le cap psychologique et physiologique des séries longues.',
    summary: '5 min échauffement + 4 × (4 min course / 1 min marche) + 3 min retour au calme',
    intervals: expandCycles(300, 4, 240, 60, 180)
  },
  {
    id: 'run-lvl4',
    title: 'Étape 4 — Courir 20 min sans s’arrêter',
    badge: 'Semaine 7 • Continu',
    level: 'Niveau 4',
    totalMin: 28,
    icon: '🏅',
    color: '#8b5cf6',
    goal: 'Réaliser ton premier footing continu en endurance fondamentale.',
    summary: '5 min marche active + 20 min course continue + 3 min retour au calme',
    intervals: expandCycles(300, 1, 1200, 0, 180)
  },
  {
    id: 'run-lvl5',
    title: 'Étape 5 — Objectif 30 min / 5 km en continu',
    badge: 'Semaine 8+ • Validation',
    level: 'Niveau 5',
    totalMin: 38,
    icon: '🏆',
    color: '#ff5500',
    goal: 'Tenir 30 minutes de course continue en aisance respiratoire.',
    summary: '5 min échauffement + 30 min course continue + 3 min retour au calme',
    intervals: expandCycles(300, 1, 1800, 0, 180)
  },
  {
    id: 'run-hiit-30-30',
    title: 'Fractionné Débutant 30s / 30s (Cardio & VMA)',
    badge: 'Améliorer sa vitesse',
    level: 'Progression',
    totalMin: 21,
    icon: '⚡',
    color: '#ec4899',
    goal: 'Développer ta capacité cardiovasculaire et brûler un maximum de calories sans monotonie.',
    summary: '8 min footing lent + 8 × (30s allure dynamique / 30s marche ou trot) + 5 min calme',
    intervals: expandCycles(
      480,
      8,
      30,
      30,
      300,
      'Accélération contrôlée (30s)',
      'Trot très lent ou marche (30s)'
    )
  }
];

export const BEGINNER_RUNNING_TIPS = [
  {
    icon: '🫁',
    title: 'La règle d’or : L’Aisance Respiratoire',
    text: '90 % des débutants abandonnent parce qu’ils courent trop vite ! La bonne vitesse pour débuter est celle où tu peux prononcer une phrase complète à voix haute sans t’étouffer (même si tu as l’impression d’aller très lentement).'
  },
  {
    icon: '🚶‍♂️',
    title: 'Alterner Marche et Course n’est pas tricher',
    text: 'La marche intégrée dès le début de la séance permet à tes tendons, genoux et chevilles de s’adapter progressivement aux impacts tout en faisant travailler ton cœur à 100 %.'
  },
  {
    icon: '👟',
    title: 'Petits pas fréquents plutôt que grandes enjambées',
    text: 'Évite de lancer ton pied trop loin devant toi (ce qui freine et tape dans les genoux). Fais des foulées courtes, rasantes et légères en gardant le buste bien droit.'
  },
  {
    icon: '📅',
    title: 'La régularité bat l’intensité',
    text: 'Mieux vaut courir 20 minutes 2 à 3 fois par semaine avec le sourire qu’une seule grosse séance épuisante qui te donne des courbatures pendant 6 jours.'
  }
];

// Calcul de distance GPS (Formule de Haversine en km)
export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
