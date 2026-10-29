import fs from 'fs';
import path from 'path';

const ROOT = 'e:/Musculation';
const SRC_JSON = path.join(ROOT, 'exercises-dataset/data/exercises.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DATA_DIR = path.join(PUBLIC_DIR, 'data');

fs.mkdirSync(OUT_DATA_DIR, { recursive: true });

// Move images and videos into public/ so Vite serves them at /images and /videos without duplicating 130MB
for (const folder of ['images', 'videos']) {
  const srcFolder = path.join(ROOT, 'exercises-dataset', folder);
  const destFolder = path.join(PUBLIC_DIR, folder);
  if (!fs.existsSync(destFolder) && fs.existsSync(srcFolder)) {
    fs.renameSync(srcFolder, destFolder);
    console.log(`Moved ${srcFolder} -> ${destFolder}`);
  }
}

const BODY_PART_FR = {
  'back': 'Dos',
  'cardio': 'Cardio',
  'chest': 'Pectoraux',
  'lower arms': 'Avant-bras',
  'lower legs': 'Mollets & Bas des jambes',
  'neck': 'Cou & Trapèzes sup.',
  'shoulders': 'Épaules',
  'upper arms': 'Bras (Biceps / Triceps)',
  'upper legs': 'Cuisses & Fessiers',
  'waist': 'Abdos & Gainage'
};

const EQUIPMENT_FR = {
  'assisted': 'Machine assistée',
  'band': 'Élastique',
  'barbell': 'Barre',
  'body weight': 'Poids du corps',
  'bosu ball': 'Bosu Ball',
  'cable': 'Poulie / Câble',
  'dumbbell': 'Haltères',
  'elliptical machine': 'Vélo elliptique',
  'ez barbell': 'Barre EZ',
  'hammer': 'Marteau / Masse',
  'kettlebell': 'Kettlebell',
  'leverage machine': 'Machine guidée / Convergente',
  'medicine ball': 'Medecine Ball',
  'olympic barbell': 'Barre olympique',
  'resistance band': 'Bande de résistance',
  'roller': 'Rouleau de massage (Foam Roller)',
  'rope': 'Corde',
  'skierg machine': 'SkiErg',
  'sled machine': 'Traîneau / Presse traîneau',
  'smith machine': 'Smith Machine (Cadre guidé)',
  'stability ball': 'Swiss Ball (Ballon)',
  'stationary bike': 'Vélo stationnaire',
  'stepmill machine': 'Escalier mécanique (StairMaster)',
  'tire': 'Pneu',
  'trap bar': 'Trap Bar (Hex Bar)',
  'upper body ergometer': 'Ergomètre bras',
  'weighted': 'Lesté',
  'wheel roller': 'Roue abdominale (Ab Wheel)'
};

const MUSCLE_FR = {
  'abductors': 'Abducteurs',
  'abs': 'Abdominaux',
  'abdominals': 'Abdominaux',
  'adductors': 'Adducteurs',
  'ankle stabilizers': 'Stabilisateurs de la cheville',
  'ankles': 'Chevilles',
  'back': 'Dos',
  'biceps': 'Biceps',
  'brachialis': 'Brachial',
  'calves': 'Mollets',
  'cardiovascular system': 'Système cardiovasculaire',
  'chest': 'Pectoraux',
  'core': 'Sangle abdominale (Core)',
  'delts': 'Deltoïdes (Épaules)',
  'deltoids': 'Deltoïdes',
  'feet': 'Pieds',
  'forearms': 'Avant-bras',
  'glutes': 'Fessiers',
  'grip muscles': 'Muscles de la poigne',
  'groin': 'Aine / Adducteurs',
  'hamstrings': 'Ischio-jambiers',
  'hands': 'Mains',
  'hip flexors': 'Fléchisseurs de la hanche',
  'inner thighs': 'Intérieur des cuisses',
  'latissimus dorsi': 'Grands dorsaux',
  'lats': 'Grands dorsaux',
  'levator scapulae': 'Élévateur de la scapula',
  'lower abs': 'Bas des abdos',
  'lower back': 'Lombaires (Bas du dos)',
  'obliques': 'Obliques',
  'pectorals': 'Pectoraux',
  'quads': 'Quadriceps',
  'quadriceps': 'Quadriceps',
  'rear deltoids': 'Deltoïdes postérieurs (Arrière d’épaule)',
  'rhomboids': 'Rhomboïdes',
  'rotator cuff': 'Coiffe des rotateurs',
  'serratus anterior': 'Grand dentelé',
  'shins': 'Tibias (Jambier antérieur)',
  'shoulders': 'Épaules',
  'soleus': 'Soléaire (Mollet)',
  'spine': 'Érecteurs du rachis (Colonne)',
  'sternocleidomastoid': 'Sterno-cléido-mastoïdien (Cou)',
  'trapezius': 'Trapèzes',
  'traps': 'Trapèzes',
  'triceps': 'Triceps',
  'upper back': 'Haut du dos',
  'upper chest': 'Haut des pectoraux',
  'wrist extensors': 'Extenseurs du poignet',
  'wrist flexors': 'Fléchisseurs du poignet',
  'wrists': 'Poignets'
};

// Translate English exercise name into natural French exercise title
function translateExerciseName(enName, equipment, target) {
  let s = enName.toLowerCase().trim();

  // Remove noisy suffixes like "(male)", "v. 2", "v. 3"
  let variant = '';
  if (s.includes('v. 2') || s.includes('v.2')) {
    variant = ' (Variante 2)';
    s = s.replace(/v\.\s*2/g, '').trim();
  } else if (s.includes('v. 3') || s.includes('v.3')) {
    variant = ' (Variante 3)';
    s = s.replace(/v\.\s*3/g, '').trim();
  }
  s = s.replace(/\(male\)/g, '').replace(/\(female\)/g, '').trim();

  // Detect equipment prefix/mention
  const equipMentions = [];
  const consume = (regex, label) => {
    if (regex.test(s)) {
      equipMentions.push(label);
      s = s.replace(regex, ' ').replace(/\s+/g, ' ').trim();
    }
  };

  consume(/\bez[- ]?bar(?:bell)?\b/g, 'à la barre EZ');
  consume(/\bolympic barbell\b/g, 'à la barre olympique');
  consume(/\btrap bar\b/g, 'à la Trap Bar');
  consume(/\bbarbell\b/g, 'à la barre');
  consume(/\bdumbbells?\b/g, 'aux haltères');
  consume(/\bkettlebells?\b/g, 'au kettlebell');
  consume(/\bcable\b/g, 'à la poulie');
  consume(/\bsmith(?: machine)?\b/g, 'à la Smith Machine');
  consume(/\blever(?:age)?\b/g, 'à la machine');
  consume(/\bresistance band\b|\bband\b/g, "à l'élastique");
  consume(/\bmedicine ball\b/g, 'au Medecine Ball');
  consume(/\bstability ball\b|\bexercise ball\b|\bswiss ball\b|\bbosu ball\b/g, 'sur Swiss Ball');
  consume(/\bsled\b/g, 'à la presse / traîneau');
  consume(/\bassisted\b/g, 'assisté');
  consume(/\bweighted\b/g, 'lesté');
  consume(/\bsuspension\b/g, 'aux sangles (TRX)');
  consume(/\brope\b/g, 'à la corde');

  // Detect posture / grip modifiers
  const modifiers = [];
  const consumeMod = (regex, label) => {
    if (regex.test(s)) {
      modifiers.push(label);
      s = s.replace(regex, ' ').replace(/\s+/g, ' ').trim();
    }
  };

  consumeMod(/\bone[- ]arm\b|\bsingle[- ]arm\b/g, 'unilatéral (1 bras)');
  consumeMod(/\bone[- ]leg(?:ged)?\b|\bsingle[- ]leg(?:ged)?\b/g, 'unilatéral (1 jambe)');
  consumeMod(/\balternating\b|\balternate\b/g, 'alterné');
  consumeMod(/\bseated\b/g, 'assis');
  consumeMod(/\bstanding\b/g, 'debout');
  consumeMod(/\blying\b/g, 'allongé');
  consumeMod(/\bkneeling\b/g, 'à genoux');
  consumeMod(/\bincline\b/g, 'incliné');
  consumeMod(/\bdecline\b/g, 'décliné');
  consumeMod(/\bclose[- ]grip\b|\bnarrow[- ]grip\b/g, 'prise serrée');
  consumeMod(/\bwide[- ]grip\b/g, 'prise large');
  consumeMod(/\breverse[- ]grip\b|\bunderhand\b/g, 'prise inversée (supination)');
  consumeMod(/\bneutral[- ]grip\b|\bhammer[- ]grip\b/g, 'prise neutre (marteau)');
  consumeMod(/\boverhand\b/g, 'prise pronation');
  consumeMod(/\bbehind[- ]the[- ]neck\b|\bbehind neck\b/g, 'nuque');
  consumeMod(/\boverhead\b/g, 'au-dessus de la tête');
  consumeMod(/\bbent[- ]over\b/g, 'buste penché');
  consumeMod(/\bhanging\b/g, 'suspendu à la barre');

  // Phrase dictionary for core movements
  const movements = [
    [/\bbench press\b/, 'Développé couché'],
    [/\bfloor press\b/, 'Développé au sol (Floor Press)'],
    [/\bshoulder press\b|\bmilitary press\b/, 'Développé épaules (Militaire)'],
    [/\barnold press\b/, 'Développé Arnold'],
    [/\bchest press\b/, 'Développé pectoraux'],
    [/\bleg press\b/, 'Presse à cuisses'],
    [/\bcalf press\b/, 'Presse à mollets'],
    [/\bpreacher curl\b/, 'Curl pupitre (Larry Scott)'],
    [/\bconcentration curl\b/, 'Curl concentration'],
    [/\bhammer curl\b/, 'Curl prise marteau'],
    [/\bspider curl\b/, 'Spider Curl'],
    [/\bzottman curl\b/, 'Curl Zottman'],
    [/\bbiceps? curl\b/, 'Curl biceps'],
    [/\bwrist curl\b/, 'Flexion des poignets (Curl poignet)'],
    [/\bleg curl\b|\bhamstring curl\b/, 'Leg Curl (Ischio-jambiers)'],
    [/\bleg extension\b/, 'Leg Extension (Quadriceps)'],
    [/\btriceps? extension\b/, 'Extension triceps'],
    [/\btriceps? pushdown\b|\bpushdown\b/, 'Extension triceps poulie haute'],
    [/\bskull ?crusher\b/, 'Barre au front (Skullcrusher)'],
    [/\bkickback\b/, 'Kickback triceps'],
    [/\blat pulldown\b|\bpulldown\b/, 'Tirage vertical'],
    [/\bpull[- ]?up\b/, 'Tractions pronation'],
    [/\bchin[- ]?up\b/, 'Tractions supination'],
    [/\bmuscle[- ]?up\b/, 'Muscle-up'],
    [/\bpush[- ]?up\b/, 'Pompes'],
    [/\bhandstand push[- ]?up\b/, 'Pompes en poirier (HSPU)'],
    [/\bdips?\b|\bchest dip\b|\btriceps? dip\b/, 'Dips'],
    [/\bpec deck\b|\bchest fly\b|\bfly\b|\bflye\b/, 'Écarté pectoraux (Fly)'],
    [/\brear delt fly\b|\brear delt raise\b|\brear delt row\b|\brear delt\b/, 'Oiseau (Arrière d’épaule)'],
    [/\blateral raise\b|\bside lateral raise\b/, 'Élévations latérales'],
    [/\bfront raise\b/, 'Élévations frontales'],
    [/\bupright row\b/, 'Tirage menton'],
    [/\bseated row\b|\blow row\b|\brow\b/, 'Rowing / Tirage horizontal'],
    [/\bt[- ]bar row\b/, 'Rowing T-Bar'],
    [/\bshrug\b/, 'Shrugs (Haussement d’épaules)'],
    [/\bface pull\b/, 'Face Pull'],
    [/\bpullover\b|\bpull[- ]over\b/, 'Pull-over'],
    [/\bromanian deadlift\b|\brdl\b/, 'Soulevé de terre roumain'],
    [/\bsumo deadlift\b/, 'Soulevé de terre sumo'],
    [/\bstiff[- ]leg(?:ged)? deadlift\b|\bstraight[- ]leg deadlift\b/, 'Soulevé de terre jambes tendues'],
    [/\bdeadlift\b/, 'Soulevé de terre'],
    [/\bgood morning\b/, 'Good Morning'],
    [/\bhip thrust\b/, 'Hip Thrust (Relevé de bassin)'],
    [/\bglute bridge\b|\bbridge\b/, 'Pont fessier (Glute Bridge)'],
    [/\bfront squat\b/, 'Front Squat (Squat avant)'],
    [/\bhack squat\b/, 'Hack Squat'],
    [/\bgoblet squat\b/, 'Goblet Squat'],
    [/\bsplit squat\b|\bbulgarian split squat\b/, 'Squat bulgare (Split Squat)'],
    [/\bsissy squat\b/, 'Sissy Squat'],
    [/\bpistol squat\b/, 'Pistol Squat (Squat 1 jambe)'],
    [/\bsquat\b/, 'Squat'],
    [/\blunge\b|\blunges\b/, 'Fentes'],
    [/\bstep[- ]up\b/, 'Step-up (Montée sur banc)'],
    [/\bcalf raise\b/, 'Extension des mollets'],
    [/\bsit[- ]?up\b/, 'Relevé de buste (Sit-up)'],
    [/\bcrunch\b/, 'Crunch abdos'],
    [/\brussian twist\b/, 'Russian Twist (Rotation buste)'],
    [/\bleg raise\b|\bhip raise\b/, 'Relevé de jambes'],
    [/\bknee raise\b/, 'Relevé de genoux'],
    [/\bplank\b/, 'Gainage (Planche)'],
    [/\bside plank\b/, 'Gainage latéral'],
    [/\bside bend\b/, 'Flexion latérale du buste'],
    [/\bmountain climber\b/, 'Mountain Climbers'],
    [/\bburpee\b/, 'Burpees'],
    [/\bjumping jack\b/, 'Jumping Jacks'],
    [/\bair bike\b|\bbicycle\b/, 'Crunch vélo (Air Bike)'],
    [/\bback extension\b|\bhyperextension\b/, 'Extension lombaire (Banc à lombaires)'],
    [/\bclean and press\b|\bclean and jerk\b/, 'Épaulé-jeté'],
    [/\bsnatch\b/, 'Arraché (Snatch)'],
    [/\bstretch\b/, 'Étirement'],
    [/\bcurl\b/, 'Curl'],
    [/\bpress\b/, 'Développé'],
    [/\bextension\b/, 'Extension'],
    [/\braise\b/, 'Élévations'],
    [/\btwist\b|\brotation\b/, 'Rotation'],
    [/\bjump\b/, 'Saut pliométrique']
  ];

  let baseFr = '';
  for (const [regex, label] of movements) {
    if (regex.test(s)) {
      baseFr = label;
      break;
    }
  }

  if (!baseFr) {
    // Fallback: capitalize original name + add French target context
    const cap = enName.charAt(0).toUpperCase() + enName.slice(1);
    const targetFr = MUSCLE_FR[target] || '';
    return `${cap}${targetFr ? ` (${targetFr})` : ''}${variant}`;
  }

  const parts = [baseFr];
  if (modifiers.length > 0) parts.push(modifiers.join(', '));
  if (equipMentions.length > 0) parts.push(equipMentions[0]);

  return parts.join(' ') + variant;
}

const raw = JSON.parse(fs.readFileSync(SRC_JSON, 'utf-8'));

const processed = raw.map(ex => {
  const bodyPartFr = BODY_PART_FR[ex.body_part] || ex.body_part;
  const equipmentFr = EQUIPMENT_FR[ex.equipment] || ex.equipment;
  const targetFr = MUSCLE_FR[ex.target] || ex.target;
  const muscleGroupFr = MUSCLE_FR[ex.muscle_group] || ex.muscle_group;
  const secondaryFr = (ex.secondary_muscles || []).map(m => MUSCLE_FR[m] || m);
  const nameFr = translateExerciseName(ex.name, ex.equipment, ex.target);

  return {
    id: ex.id,
    name: ex.name,
    name_fr: nameFr,
    body_part: ex.body_part,
    body_part_fr: bodyPartFr,
    equipment: ex.equipment,
    equipment_fr: equipmentFr,
    target: ex.target,
    target_fr: targetFr,
    muscle_group: ex.muscle_group,
    muscle_group_fr: muscleGroupFr,
    secondary_muscles: ex.secondary_muscles || [],
    secondary_muscles_fr: secondaryFr,
    steps_fr: ex.instruction_steps?.fr || [],
    steps_en: ex.instruction_steps?.en || [],
    image: `/${ex.image}`,
    gif_url: `/${ex.gif_url}`
  };
});

fs.writeFileSync(
  path.join(OUT_DATA_DIR, 'exercises-fr.json'),
  JSON.stringify(processed),
  'utf-8'
);

console.log(`Generated ${processed.length} exercises in public/data/exercises-fr.json`);
