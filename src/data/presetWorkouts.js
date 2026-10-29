export const PRESET_WORKOUTS = [
  {
    id: 'preset-push',
    name: 'Push — Pectoraux, Épaules & Triceps',
    category: 'PPL (Push / Pull / Legs)',
    level: 'Intermédiaire',
    durationMin: 55,
    icon: '🔥',
    description: 'Séance complète de poussée : développement de la masse des pectoraux, largeur d’épaules et finition triceps.',
    exercises: [
      { exerciseId: '0025', sets: 4, targetReps: 8, targetWeight: 70, restSec: 120 },
      { exerciseId: '0314', sets: 4, targetReps: 10, targetWeight: 26, restSec: 90 },
      { exerciseId: '0405', sets: 3, targetReps: 10, targetWeight: 20, restSec: 90 },
      { exerciseId: '0311', sets: 4, targetReps: 15, targetWeight: 10, restSec: 60 },
      { exerciseId: '0201', sets: 4, targetReps: 12, targetWeight: 25, restSec: 60 }
    ]
  },
  {
    id: 'preset-pull',
    name: 'Pull — Dos, Trapèzes & Biceps',
    category: 'PPL (Push / Pull / Legs)',
    level: 'Intermédiaire',
    durationMin: 55,
    icon: '🦅',
    description: 'Séance de tirage pour la largeur des grands dorsaux, l’épaisseur du dos et le pic des biceps.',
    exercises: [
      { exerciseId: '0150', sets: 4, targetReps: 10, targetWeight: 60, restSec: 90 },
      { exerciseId: '0027', sets: 4, targetReps: 8, targetWeight: 65, restSec: 120 },
      { exerciseId: '0017', sets: 3, targetReps: 10, targetWeight: 0, restSec: 90 },
      { exerciseId: '2407', sets: 4, targetReps: 10, targetWeight: 30, restSec: 75 },
      { exerciseId: '0298', sets: 3, targetReps: 12, targetWeight: 14, restSec: 60 }
    ]
  },
  {
    id: 'preset-legs',
    name: 'Legs — Quadriceps, Ischios & Fessiers',
    category: 'PPL (Push / Pull / Legs)',
    level: 'Intermédiaire',
    durationMin: 60,
    icon: '🦵',
    description: 'Séance bas du corps complète alliant force au squat, chaîne postérieure et finition unilatérale.',
    exercises: [
      { exerciseId: '0043', sets: 4, targetReps: 8, targetWeight: 90, restSec: 150 },
      { exerciseId: '2287', sets: 4, targetReps: 12, targetWeight: 140, restSec: 90 },
      { exerciseId: '0085', sets: 4, targetReps: 10, targetWeight: 80, restSec: 120 },
      { exerciseId: '0336', sets: 3, targetReps: 12, targetWeight: 18, restSec: 75 },
      { exerciseId: '0496', sets: 3, targetReps: 12, targetWeight: 0, restSec: 60 }
    ]
  },
  {
    id: 'preset-fullbody',
    name: 'Full Body — Corps Complet Efficace',
    category: 'Full Body',
    level: 'Tous niveaux',
    durationMin: 50,
    icon: '⚡',
    description: 'Idéal 3 fois par semaine : recrute tous les grands groupes musculaires avec des exercices polyarticulaires.',
    exercises: [
      { exerciseId: '0043', sets: 3, targetReps: 8, targetWeight: 80, restSec: 120 },
      { exerciseId: '0025', sets: 3, targetReps: 8, targetWeight: 65, restSec: 120 },
      { exerciseId: '0150', sets: 3, targetReps: 10, targetWeight: 55, restSec: 90 },
      { exerciseId: '0405', sets: 3, targetReps: 10, targetWeight: 18, restSec: 90 },
      { exerciseId: '2407', sets: 3, targetReps: 12, targetWeight: 28, restSec: 60 },
      { exerciseId: '0001', sets: 3, targetReps: 15, targetWeight: 0, restSec: 45 }
    ]
  },
  {
    id: 'preset-abs',
    name: 'Abdos & Gainage Express (Sans matériel)',
    category: 'Poids du corps',
    level: 'Tous niveaux',
    durationMin: 20,
    icon: '🛡️',
    description: 'Circuit sangle abdominale, obliques et gainage profond réalisable à la maison ou en fin de séance.',
    exercises: [
      { exerciseId: '0001', sets: 4, targetReps: 20, targetWeight: 0, restSec: 45 },
      { exerciseId: '0003', sets: 4, targetReps: 20, targetWeight: 0, restSec: 45 },
      { exerciseId: '0464', sets: 3, targetReps: 15, targetWeight: 0, restSec: 45 },
      { exerciseId: '3216', sets: 3, targetReps: 15, targetWeight: 0, restSec: 60 }
    ]
  }
];
