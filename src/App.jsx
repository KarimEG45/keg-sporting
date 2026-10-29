import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dumbbell,
  Search,
  X,
  SlidersHorizontal,
  Heart,
  Smartphone,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Play,
  Pause,
  Sun,
  Moon,
  Check,
  Target,
  Activity,
  Layers,
  RotateCcw,
  Share2,
  Home,
  Flame,
  Timer,
  Plus,
  Trash2,
  Trophy,
  Footprints,
  Volume2,
  VolumeX,
  Navigation,
  CheckCircle2,
  SkipForward,
  Calculator
} from 'lucide-react';
import { PRESET_WORKOUTS } from './data/presetWorkouts.js';
import {
  RUNNING_PROGRAMS,
  BEGINNER_RUNNING_TIPS,
  getDistanceFromLatLonInKm
} from './data/runningPrograms.js';
import {
  playSetValidatedFeedback,
  playRestFinishedBeep,
  speakCoachFr
} from './utils/sound.js';
import RunningView from './components/RunningView.jsx';

function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatTimeMMSS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const BODY_PART_ORDER = [
  { key: 'all', label: 'Tous', icon: '⚡' },
  { key: 'chest', label: 'Pectoraux', icon: '🦍' },
  { key: 'back', label: 'Dos', icon: '🦅' },
  { key: 'shoulders', label: 'Épaules', icon: '🥥' },
  { key: 'upper arms', label: 'Bras', icon: '💪' },
  { key: 'upper legs', label: 'Cuisses & Fessiers', icon: '🦵' },
  { key: 'waist', label: 'Abdos & Gainage', icon: '🔥' },
  { key: 'lower legs', label: 'Mollets', icon: '👟' },
  { key: 'lower arms', label: 'Avant-bras', icon: '✊' },
  { key: 'cardio', label: 'Cardio', icon: '❤️‍🔥' },
  { key: 'neck', label: 'Cou & Trapèzes', icon: '🛡️' }
];

export default function App() {
  const initialParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  // ── Navigation Principale (Bottom Bar 5 onglets) ──
  // 'home' | 'workouts' | 'running' | 'exercises' | 'stats'
  const [activeTab, setActiveTab] = useState(initialParams?.get('tab') || 'home');

  // ── Base de données des 1 324 exercices ──
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Détection Universelle d'Appareil (Smartphone classique vs Z Fold déplié) ──
  // 'auto' | 'phone' | 'folded' | 'unfolded'
  const [devicePreview, setDevicePreview] = useState(initialParams?.get('mode') || 'auto');
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 412
  );
  const [theme, setTheme] = useState('dark');

  // ── Filtres Catalogue Exercices ──
  const [search, setSearch] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('all');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [selectedEquipments, setSelectedEquipments] = useState([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [animateGridGifs, setAnimateGridGifs] = useState(false);
  const [pageSize, setPageSize] = useState(48);

  // ── Fiche Exercice & Modales ──
  const [selectedExerciseId, setSelectedExerciseId] = useState('0025');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [instrLang, setInstrLang] = useState('fr');
  const [completedSteps, setCompletedSteps] = useState({});
  const [pauseDetailGif, setPauseDetailGif] = useState(false);

  // ── Données Utilisateur persistées (Favoris, Programmes Perso, Historique Muscu & Course) ──
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gyma_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [customRoutines, setCustomRoutines] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gyma_custom_routines') || '[]');
    } catch {
      return [];
    }
  });

  const [workoutHistory, setWorkoutHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gyma_workout_history') || '[]');
    } catch {
      return [];
    }
  });

  const [runHistory, setRunHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gyma_run_history') || '[]');
    } catch {
      return [];
    }
  });

  // ── Séance de Musculation en direct (Active Workout) ──
  const [activeWorkout, setActiveWorkout] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gyma_active_workout') || 'null');
    } catch {
      return null;
    }
  });
  const [workoutElapsedSec, setWorkoutElapsedSec] = useState(0);
  const [restTimerSec, setRestTimerSec] = useState(0);
  const [restTimerTotal, setRestTimerTotal] = useState(90);
  const [focusedWorkoutExId, setFocusedWorkoutExId] = useState('0025');
  const [pickingExerciseForSession, setPickingExerciseForSession] = useState(false);

  // ── Créateur de Programme Personnalisé ──
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineExercises, setNewRoutineExercises] = useState([]);

  // ── Mode Course à Pied (Running Débutant) ──
  const [selectedRunProgramId, setSelectedRunProgramId] = useState(RUNNING_PROGRAMS[0].id);
  const [activeRun, setActiveRun] = useState(null); // { programId, title, intervals, currentIdx, remainingSec, elapsedSec, paused, distanceKm, gpsEnabled }
  const [voiceCoachEnabled, setVoiceCoachEnabled] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [paceMinPerKm, setPaceMinPerKm] = useState(6.5); // Calculateur d'allure (ex: 6:30 /km)

  // ── Outils Salle (Calculateur 1RM & Disques) ──
  const [calcWeight, setCalcWeight] = useState(80);
  const [calcReps, setCalcReps] = useState(8);

  const catalogScrollRef = useRef(null);
  const lastGpsPosRef = useRef(null);

  // Sauvegardes localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('gyma_favorites', JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('gyma_custom_routines', JSON.stringify(customRoutines));
    } catch {}
  }, [customRoutines]);

  useEffect(() => {
    try {
      localStorage.setItem('gyma_workout_history', JSON.stringify(workoutHistory));
    } catch {}
  }, [workoutHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('gyma_run_history', JSON.stringify(runHistory));
    } catch {}
  }, [runHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('gyma_active_workout', JSON.stringify(activeWorkout));
    } catch {}
  }, [activeWorkout]);

  // Chargement des 1 324 exercices en français
  useEffect(() => {
    fetch('/data/exercises-fr.json')
      .then((res) => res.json())
      .then((data) => {
        const indexed = data.map((ex) => ({
          ...ex,
          _searchIndex: normalizeText(
            `${ex.name_fr} ${ex.name} ${ex.body_part_fr} ${ex.target_fr} ${ex.equipment_fr} ${ex.muscle_group_fr} ${(ex.secondary_muscles_fr || []).join(' ')}`
          )
        }));
        setExercises(indexed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Map rapide par ID d'exercice
  const exerciseMap = useMemo(() => {
    const m = new Map();
    exercises.forEach((ex) => m.set(ex.id, ex));
    return m;
  }, [exercises]);

  // Détection universelle : Smartphone classique (1 écran) vs Grand écran déplié Z Fold 5 / Tablette (2 panneaux)
  const isSplitView = useMemo(() => {
    if (devicePreview === 'phone' || devicePreview === 'folded') return false;
    if (devicePreview === 'unfolded') return true;
    return windowWidth >= 680;
  }, [devicePreview, windowWidth]);

  // ── Chronomètre Séance Muscu & Repos ──
  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setWorkoutElapsedSec(Math.floor((Date.now() - activeWorkout.startedAt) / 1000));
      setRestTimerSec((prev) => {
        if (prev <= 0) return 0;
        if (prev === 1) {
          playRestFinishedBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  // ── Chronomètre & Coach Audio Course à Pied ──
  useEffect(() => {
    if (!activeRun || activeRun.paused) return;
    const timer = setInterval(() => {
      setActiveRun((prev) => {
        if (!prev || prev.paused) return prev;
        const curInterval = prev.intervals[prev.currentIdx];
        const speedKmh = curInterval?.speedKmh || 8.0;
        // Si GPS non actif, on estime la distance selon l'allure de la phase
        const addedKm = gpsActive ? 0 : speedKmh / 3600;

        if (prev.remainingSec > 1) {
          return {
            ...prev,
            remainingSec: prev.remainingSec - 1,
            elapsedSec: prev.elapsedSec + 1,
            distanceKm: +(prev.distanceKm + addedKm).toFixed(3)
          };
        }

        // Passage à l'intervalle suivant
        const nextIdx = prev.currentIdx + 1;
        if (nextIdx < prev.intervals.length) {
          const nextInt = prev.intervals[nextIdx];
          speakCoachFr(
            `${nextInt.label}. Durée : ${Math.round(nextInt.durationSec / 60)} minutes.`,
            voiceCoachEnabled
          );
          return {
            ...prev,
            currentIdx: nextIdx,
            remainingSec: nextInt.durationSec,
            elapsedSec: prev.elapsedSec + 1,
            distanceKm: +(prev.distanceKm + addedKm).toFixed(3)
          };
        } else {
          // Fin de la séance de course !
          speakCoachFr(
            'Félicitations ! Vous avez terminé votre séance de course à pied.',
            voiceCoachEnabled
          );
          return {
            ...prev,
            remainingSec: 0,
            paused: true,
            completed: true
          };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeRun, voiceCoachEnabled, gpsActive]);

  // Suivi GPS réel sur téléphone si activé pendant la course
  useEffect(() => {
    if (!activeRun || activeRun.paused || !gpsActive || !('geolocation' in navigator)) {
      lastGpsPosRef.current = null;
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 60) return;
        if (lastGpsPosRef.current) {
          const d = getDistanceFromLatLonInKm(
            lastGpsPosRef.current.lat,
            lastGpsPosRef.current.lon,
            latitude,
            longitude
          );
          if (d > 0.002 && d < 0.2) {
            setActiveRun((prev) =>
              prev ? { ...prev, distanceKm: +(prev.distanceKm + d).toFixed(3) } : prev
            );
          }
        }
        lastGpsPosRef.current = { lat: latitude, lon: longitude };
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeRun, gpsActive]);

  // ── Logique Séance de Musculation ──
  const startWorkoutFromTemplate = (template) => {
    const items = (template.exercises || []).map((item) => {
      const setsArr = Array.from({ length: item.sets || 3 }, (_, i) => ({
        setNum: i + 1,
        weight: item.targetWeight ?? 20,
        reps: item.targetReps ?? 10,
        done: false
      }));
      return {
        exerciseId: item.exerciseId,
        restSec: item.restSec || 90,
        sets: setsArr
      };
    });

    const session = {
      id: 'wk-' + Date.now(),
      name: template.name,
      startedAt: Date.now(),
      items
    };
    setActiveWorkout(session);
    setWorkoutElapsedSec(0);
    if (items[0]) setFocusedWorkoutExId(items[0].exerciseId);
    setActiveTab('workouts');
  };

  const startEmptyWorkout = () => {
    const session = {
      id: 'wk-' + Date.now(),
      name: 'Séance Libre Musculation',
      startedAt: Date.now(),
      items: [
        {
          exerciseId: '0025',
          restSec: 90,
          sets: [
            { setNum: 1, weight: 60, reps: 10, done: false },
            { setNum: 2, weight: 60, reps: 10, done: false },
            { setNum: 3, weight: 60, reps: 10, done: false }
          ]
        }
      ]
    };
    setActiveWorkout(session);
    setWorkoutElapsedSec(0);
    setFocusedWorkoutExId('0025');
    setActiveTab('workouts');
  };

  const addExerciseToActiveWorkout = (exerciseId) => {
    if (creatingRoutine) {
      setNewRoutineExercises((prev) => [
        ...prev,
        { exerciseId, sets: 3, targetReps: 10, targetWeight: 20, restSec: 90 }
      ]);
      setPickingExerciseForSession(false);
      setActiveTab('workouts');
      return;
    }

    if (!activeWorkout) {
      const ex = exerciseMap.get(exerciseId);
      startWorkoutFromTemplate({
        name: `Séance — ${ex?.name_fr || 'Musculation'}`,
        exercises: [{ exerciseId, sets: 3, targetReps: 10, targetWeight: 20, restSec: 90 }]
      });
      return;
    }

    setActiveWorkout((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          exerciseId,
          restSec: 90,
          sets: [
            { setNum: 1, weight: 20, reps: 10, done: false },
            { setNum: 2, weight: 20, reps: 10, done: false },
            { setNum: 3, weight: 20, reps: 10, done: false }
          ]
        }
      ]
    }));
    setFocusedWorkoutExId(exerciseId);
    setPickingExerciseForSession(false);
    setActiveTab('workouts');
  };

  const updateSetField = (itemIdx, setIdx, field, value) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => {
        if (i !== itemIdx) return it;
        const sets = it.sets.map((s, si) =>
          si === setIdx ? { ...s, [field]: Number(value) || 0 } : s
        );
        return { ...it, sets };
      });
      return { ...prev, items };
    });
  };

  const toggleSetCompleted = (itemIdx, setIdx) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const item = prev.items[itemIdx];
      const targetSet = item.sets[setIdx];
      const nextDone = !targetSet.done;

      if (nextDone) {
        playSetValidatedFeedback();
        setRestTimerTotal(item.restSec || 90);
        setRestTimerSec(item.restSec || 90);
        setFocusedWorkoutExId(item.exerciseId);
      }

      const items = prev.items.map((it, i) => {
        if (i !== itemIdx) return it;
        const sets = it.sets.map((s, si) => (si === setIdx ? { ...s, done: nextDone } : s));
        return { ...it, sets };
      });
      return { ...prev, items };
    });
  };

  const addSetToWorkoutItem = (itemIdx) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => {
        if (i !== itemIdx) return it;
        const last = it.sets[it.sets.length - 1] || { weight: 20, reps: 10 };
        return {
          ...it,
          sets: [
            ...it.sets,
            { setNum: it.sets.length + 1, weight: last.weight, reps: last.reps, done: false }
          ]
        };
      });
      return { ...prev, items };
    });
  };

  const removeWorkoutItem = (itemIdx) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== itemIdx) };
    });
  };

  const finishActiveWorkout = () => {
    if (!activeWorkout) return;
    let totalVolumeKg = 0;
    let totalSetsDone = 0;

    const summaryItems = activeWorkout.items.map((it) => {
      const ex = exerciseMap.get(it.exerciseId);
      const doneSets = it.sets.filter((s) => s.done);
      doneSets.forEach((s) => {
        totalVolumeKg += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        totalSetsDone += 1;
      });
      return {
        exerciseId: it.exerciseId,
        exerciseName: ex?.name_fr || it.exerciseId,
        sets: it.sets
      };
    });

    const record = {
      id: activeWorkout.id,
      name: activeWorkout.name,
      date: new Date().toISOString(),
      durationSec: workoutElapsedSec,
      totalVolumeKg,
      totalSetsDone,
      items: summaryItems
    };

    setWorkoutHistory((prev) => [record, ...prev]);
    setActiveWorkout(null);
    setRestTimerSec(0);
    setActiveTab('stats');
  };

  // ── Logique Course à Pied ──
  const startRunningSession = (program) => {
    const first = program.intervals[0];
    setActiveRun({
      programId: program.id,
      title: program.title,
      intervals: program.intervals,
      currentIdx: 0,
      remainingSec: first.durationSec,
      elapsedSec: 0,
      paused: false,
      completed: false,
      distanceKm: 0
    });
    speakCoachFr(
      `Début de la séance : ${program.title}. ${first.label} pendant ${Math.round(
        first.durationSec / 60
      )} minutes.`,
      voiceCoachEnabled
    );
    setActiveTab('running');
  };

  const startFreeRun = () => {
    const freeIntervals = [
      {
        type: 'run',
        label: 'Course Libre — À ton rythme',
        tip: 'Cours en aisance respiratoire et écoute tes sensations.',
        durationSec: 1800,
        speedKmh: 9.0
      }
    ];
    setActiveRun({
      programId: 'free-run',
      title: 'Course Libre (Objectif 30 min)',
      intervals: freeIntervals,
      currentIdx: 0,
      remainingSec: 1800,
      elapsedSec: 0,
      paused: false,
      completed: false,
      distanceKm: 0
    });
    speakCoachFr('Début de la course libre. Bon footing !', voiceCoachEnabled);
  };

  const skipRunInterval = () => {
    setActiveRun((prev) => {
      if (!prev) return prev;
      const nextIdx = prev.currentIdx + 1;
      if (nextIdx >= prev.intervals.length) {
        return { ...prev, remainingSec: 0, paused: true, completed: true };
      }
      const nextInt = prev.intervals[nextIdx];
      speakCoachFr(nextInt.label, voiceCoachEnabled);
      return {
        ...prev,
        currentIdx: nextIdx,
        remainingSec: nextInt.durationSec
      };
    });
  };

  const finishRunningSession = () => {
    if (!activeRun) return;
    const record = {
      id: 'run-' + Date.now(),
      title: activeRun.title,
      date: new Date().toISOString(),
      durationSec: activeRun.elapsedSec,
      distanceKm: activeRun.distanceKm,
      calories: Math.round(activeRun.distanceKm * 68 || (activeRun.elapsedSec / 60) * 8.5)
    };
    setRunHistory((prev) => [record, ...prev]);
    setActiveRun(null);
    setActiveTab('stats');
  };

  // ── Calcul des Statistiques & Records Personnels (PRs) ──
  const personalRecords = useMemo(() => {
    const prMap = new Map();
    workoutHistory.forEach((session) => {
      (session.items || []).forEach((it) => {
        (it.sets || []).forEach((s) => {
          if (!s.done || !s.weight) return;
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 1;
          const est1RM = Math.round(w * (1 + r / 30));
          const cur = prMap.get(it.exerciseId);
          if (!cur || w > cur.maxWeight || est1RM > cur.est1RM) {
            prMap.set(it.exerciseId, {
              exerciseId: it.exerciseId,
              exerciseName: it.exerciseName,
              maxWeight: Math.max(w, cur?.maxWeight || 0),
              repsAtMax: r,
              est1RM: Math.max(est1RM, cur?.est1RM || 0),
              date: session.date
            });
          }
        });
      });
    });
    return Array.from(prMap.values()).sort((a, b) => b.est1RM - a.est1RM);
  }, [workoutHistory]);

  const globalKpis = useMemo(() => {
    const totalWorkouts = workoutHistory.length;
    const totalVolumeTons = (
      workoutHistory.reduce((acc, w) => acc + (w.totalVolumeKg || 0), 0) / 1000
    ).toFixed(1);
    const totalRuns = runHistory.length;
    const totalRunKm = runHistory
      .reduce((acc, r) => acc + (r.distanceKm || 0), 0)
      .toFixed(1);
    return { totalWorkouts, totalVolumeTons, totalRuns, totalRunKm };
  }, [workoutHistory, runHistory]);

  // ── Filtres Catalogue Exercices ──
  const { targetOptions, equipmentOptions, bodyPartCounts } = useMemo(() => {
    const tMap = new Map();
    const eMap = new Map();
    const bpCounts = { all: exercises.length };

    exercises.forEach((ex) => {
      bpCounts[ex.body_part] = (bpCounts[ex.body_part] || 0) + 1;
      if (ex.target) {
        const cur = tMap.get(ex.target) || { key: ex.target, label: ex.target_fr, count: 0 };
        cur.count++;
        tMap.set(ex.target, cur);
      }
      if (ex.equipment) {
        const cur = eMap.get(ex.equipment) || { key: ex.equipment, label: ex.equipment_fr, count: 0 };
        cur.count++;
        eMap.set(ex.equipment, cur);
      }
    });

    return {
      targetOptions: Array.from(tMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
      equipmentOptions: Array.from(eMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
      bodyPartCounts: bpCounts
    };
  }, [exercises]);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const filteredExercises = useMemo(() => {
    const q = normalizeText(search.trim());
    const qTokens = q ? q.split(/\s+/) : [];

    return exercises.filter((ex) => {
      if (onlyFavorites && !favSet.has(ex.id)) return false;
      if (selectedBodyPart !== 'all' && ex.body_part !== selectedBodyPart) return false;
      if (selectedTargets.length > 0 && !selectedTargets.includes(ex.target)) return false;
      if (selectedEquipments.length > 0 && !selectedEquipments.includes(ex.equipment)) return false;
      if (qTokens.length > 0) {
        for (const tok of qTokens) {
          if (!ex._searchIndex.includes(tok)) return false;
        }
      }
      return true;
    });
  }, [exercises, search, onlyFavorites, favSet, selectedBodyPart, selectedTargets, selectedEquipments]);

  const selectedExercise = useMemo(() => {
    if (!exercises.length) return null;
    return (
      exerciseMap.get(selectedExerciseId) ||
      filteredExercises[0] ||
      exercises[0]
    );
  }, [exercises, exerciseMap, filteredExercises, selectedExerciseId]);

  const currentIndexInFiltered = useMemo(() => {
    if (!selectedExercise) return -1;
    return filteredExercises.findIndex((e) => e.id === selectedExercise.id);
  }, [filteredExercises, selectedExercise]);

  const visibleExercises = useMemo(
    () => filteredExercises.slice(0, pageSize),
    [filteredExercises, pageSize]
  );

  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectExercise = (ex) => {
    setSelectedExerciseId(ex.id);
    setCompletedSteps({});
    setPauseDetailGif(false);
    if (!isSplitView) {
      setMobileDetailOpen(true);
    }
  };

  const goToAdjacentExercise = (dir) => {
    if (filteredExercises.length === 0) return;
    const nextIdx =
      currentIndexInFiltered === -1
        ? 0
        : (currentIndexInFiltered + dir + filteredExercises.length) % filteredExercises.length;
    const nextEx = filteredExercises[nextIdx];
    if (nextEx) {
      setSelectedExerciseId(nextEx.id);
      setCompletedSteps({});
      setPauseDetailGif(false);
    }
  };

  const toggleArrayFilter = (setter, value) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedBodyPart('all');
    setSelectedTargets([]);
    setSelectedEquipments([]);
    setOnlyFavorites(false);
  };

  // ── Composant Fiche Exercice Détaillée (utilisé dans Exercices, Séances et Modal Mobile) ──
  const renderExerciseDetail = (ex, isModal = false) => {
    if (!ex) return null;
    const isFav = favSet.has(ex.id);
    const steps = instrLang === 'fr' ? ex.steps_fr : ex.steps_en;

    return (
      <div className="detail-container">
        <div className="detail-sticky-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {isModal && (
              <button className="icon-btn" onClick={() => setMobileDetailOpen(false)}>
                <ChevronLeft size={18} />
              </button>
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Fiche Exercice #{ex.id}
            </span>
          </div>

          <div className="detail-nav-group">
            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => {
                addExerciseToActiveWorkout(ex.id);
                setMobileDetailOpen(false);
              }}
            >
              <Plus size={14} />
              {activeWorkout || creatingRoutine ? 'Ajouter à la séance' : 'Lancer cet exercice'}
            </button>

            <button
              className={`icon-btn ${isFav ? 'active' : ''}`}
              onClick={(e) => toggleFavorite(ex.id, e)}
              title="Favori"
            >
              <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
            </button>
            {isModal && (
              <button className="icon-btn" onClick={() => setMobileDetailOpen(false)}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-hero">
            <div
              className="detail-media-card"
              onClick={() => setPauseDetailGif((p) => !p)}
              style={{ cursor: 'pointer' }}
            >
              <span className="detail-id-pill">#{ex.id}</span>
              <img src={pauseDetailGif ? ex.image : ex.gif_url} alt={ex.name_fr} />
              <span
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 10,
                  background: 'rgba(15,15,20,0.75)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 99
                }}
              >
                {pauseDetailGif ? '▶ Reprendre GIF' : 'GIF ANIMÉ'}
              </span>
            </div>

            <div className="detail-titles">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="ex-badge primary">{ex.body_part_fr}</span>
                <span className="ex-badge equip">{ex.equipment_fr}</span>
              </div>
              <h1 className="detail-name-fr">{ex.name_fr}</h1>
              <p className="detail-name-en">{ex.name}</p>

              <div className="meta-grid" style={{ marginTop: 6 }}>
                <div className="meta-box">
                  <span className="meta-label">Muscle Principal</span>
                  <span className="meta-val" style={{ color: 'var(--accent-light)' }}>
                    {ex.target_fr}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Matériel</span>
                  <span className="meta-val">{ex.equipment_fr}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title">
              <Target size={14} color="var(--accent)" />
              Muscles Sollicités
            </div>
            <div className="muscle-pills">
              <span className="muscle-pill target">🎯 Principal : {ex.target_fr}</span>
              {ex.secondary_muscles_fr.map((secFr, idx) => (
                <span key={idx} className="muscle-pill secondary">
                  + {secFr}
                </span>
              ))}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <div className="section-title">
                <Activity size={14} color="var(--accent)" />
                Exécution étape par étape
              </div>
              <div className="lang-switch">
                <button
                  className={`lang-btn ${instrLang === 'fr' ? 'active' : ''}`}
                  onClick={() => setInstrLang('fr')}
                >
                  FR 🇫🇷
                </button>
                <button
                  className={`lang-btn ${instrLang === 'en' ? 'active' : ''}`}
                  onClick={() => setInstrLang('en')}
                >
                  EN 🇬🇧
                </button>
              </div>
            </div>

            <ol className="steps-list">
              {steps.map((step, i) => {
                const isDone = !!completedSteps[i];
                return (
                  <li
                    key={i}
                    className={`step-item ${isDone ? 'done' : ''}`}
                    onClick={() =>
                      setCompletedSteps((prev) => ({ ...prev, [i]: !prev[i] }))
                    }
                  >
                    <span className="step-num">
                      {isDone ? <Check size={13} /> : i + 1}
                    </span>
                    <span className="step-text">{step}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // ONGLET 1 : ACCUEIL / DASHBOARD UNIVERSEL (MUSCU + COURSE À PIED)
  // ══════════════════════════════════════════════════════════════════
  const renderHomeTab = () => {
    const primaryContent = (
      <div className="page-pad">
        <div className="hero-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ex-badge primary" style={{ fontSize: 11 }}>
              🏋️ Musculation & 🏃 Course à pied
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {isSplitView ? 'Affichage Double Écran Actif' : 'Affichage Mobile Standard'}
            </span>
          </div>

          <h1 style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.2 }}>
            Prêt pour ton entraînement du jour ?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            1 324 exercices illustrés en français, suivi de tes séances de musculation avec chrono et coach de course à pied progressif pour débutants.
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                if (activeWorkout) setActiveTab('workouts');
                else startEmptyWorkout();
              }}
            >
              <Dumbbell size={16} />
              {activeWorkout ? 'Reprendre la séance Muscu' : 'Démarrer Séance Muscu'}
            </button>

            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setActiveTab('running')}
            >
              <Footprints size={16} color="var(--success)" />
              Mode Course Débutant
            </button>
          </div>
        </div>

        {/* KPIs Globaux */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-val">{globalKpis.totalWorkouts}</span>
            <span className="kpi-lbl">🏋️ Séances Muscu</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-val" style={{ color: 'var(--accent-light)' }}>
              {globalKpis.totalVolumeTons} t
            </span>
            <span className="kpi-lbl">⚡ Volume Soulevé</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-val" style={{ color: 'var(--success)' }}>
              {globalKpis.totalRuns}
            </span>
            <span className="kpi-lbl">🏃 Sorties Course</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-val" style={{ color: '#60a5fa' }}>
              {globalKpis.totalRunKm} km
            </span>
            <span className="kpi-lbl">📍 Distance Courue</span>
          </div>
        </div>

        {/* Accès Rapide Programmes Muscu */}
        <div className="section-card">
          <div className="section-header">
            <div className="section-title">
              <Flame size={14} color="var(--accent)" />
              Séances Musculation Recommandées
            </div>
            <button
              className="reset-link"
              onClick={() => setActiveTab('workouts')}
            >
              Voir tout
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRESET_WORKOUTS.slice(0, 3).map((pw) => (
              <div
                key={pw.id}
                className="workout-card"
                style={{ padding: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>
                      {pw.icon} {pw.name}
                    </strong>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {pw.exercises.length} exercices • ~{pw.durationMin} min • {pw.level}
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: 12, alignSelf: 'center' }}
                    onClick={() => startWorkoutFromTemplate(pw)}
                  >
                    Lancer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accès Rapide Course à Pied Débutant */}
        <div className="section-card">
          <div className="section-header">
            <div className="section-title">
              <Footprints size={14} color="var(--success)" />
              Progression Course à Pied (Débutant → 5 km)
            </div>
            <button className="reset-link" onClick={() => setActiveTab('running')}>
              Ouvrir le Coach
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Programme progressif alternant marche et course lente avec annonces vocales en français pour progresser sans jamais finir essoufflé.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {RUNNING_PROGRAMS.slice(0, 2).map((rp) => (
              <div
                key={rp.id}
                className="workout-card"
                style={{ flex: '1 1 220px', padding: 12 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: rp.color }}>
                  {rp.badge}
                </div>
                <strong style={{ fontSize: 13.5 }}>
                  {rp.icon} {rp.title}
                </strong>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rp.summary}</p>
                <button
                  className="btn-secondary"
                  style={{ marginTop: 4, padding: '7px 12px', fontSize: 12 }}
                  onClick={() => startRunningSession(rp)}
                >
                  <Play size={13} /> Démarrer ({rp.totalMin} min)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    if (!isSplitView) return <div className="primary-pane">{primaryContent}</div>;

    // En mode double écran (Z Fold 5 déplié / Tablette), le panneau droit affiche un aperçu direct des conseils et exercices favoris
    return (
      <>
        <div className="primary-pane">{primaryContent}</div>
        <aside className="secondary-pane">
          <div className="page-pad">
            <div className="section-card">
              <div className="section-title">
                <Trophy size={14} color="var(--accent)" />
                Dernières Activités & Records
              </div>
              {workoutHistory.length === 0 && runHistory.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Aucune séance enregistrée pour le moment. Lance une séance de musculation ou de course à pied pour voir ton suivi ici !
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workoutHistory.slice(0, 3).map((w) => (
                    <div key={w.id} className="interval-row">
                      <div>
                        <strong>🏋️ {w.name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {new Date(w.date).toLocaleDateString('fr-FR')} • {formatTimeMMSS(w.durationSec)}
                        </div>
                      </div>
                      <span className="ex-badge primary">{w.totalVolumeKg} kg</span>
                    </div>
                  ))}
                  {runHistory.slice(0, 3).map((r) => (
                    <div key={r.id} className="interval-row">
                      <div>
                        <strong>🏃 {r.title}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {new Date(r.date).toLocaleDateString('fr-FR')} • {formatTimeMMSS(r.durationSec)}
                        </div>
                      </div>
                      <span className="ex-badge equip">{r.distanceKm} km</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Heart size={14} color="var(--accent)" />
                  Mes Exercices Favoris ({favorites.length})
                </div>
                <button className="reset-link" onClick={() => setActiveTab('exercises')}>
                  Catalogue (1 324)
                </button>
              </div>
              {favorites.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Ajoute tes exercices préférés en touchant le cœur ❤️ dans l’onglet Exercices.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {favorites.slice(0, 5).map((fid) => {
                    const ex = exerciseMap.get(fid);
                    if (!ex) return null;
                    return (
                      <div
                        key={fid}
                        className="interval-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedExerciseId(fid);
                          setActiveTab('exercises');
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={ex.image}
                            alt={ex.name_fr}
                            style={{ width: 42, height: 42, borderRadius: 8, background: '#fff', objectFit: 'contain' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{ex.name_fr}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {ex.target_fr} • {ex.equipment_fr}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // ONGLET 2 : SÉANCES MUSCULATION (ENTRAÎNEMENT EN DIRECT + PROGRAMMES)
  // ══════════════════════════════════════════════════════════════════
  const renderWorkoutsTab = () => {
    const focusedEx = exerciseMap.get(focusedWorkoutExId) || selectedExercise;

    const leftPaneContent = (
      <div className="page-pad">
        {/* Si une séance de musculation est en cours */}
        {activeWorkout ? (
          <>
            <div className="hero-banner" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <span className="ex-badge primary">● SÉANCE EN DIRECT</span>
                  <h2 style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>
                    {activeWorkout.name}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTimeMMSS(workoutElapsedSec)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Durée totale</div>
                </div>
              </div>

              {/* Chronomètre de repos actif */}
              <div className="rest-timer-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Timer size={20} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>
                      CHRONO DE REPOS
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: restTimerSec > 0 ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                      {restTimerSec > 0 ? formatTimeMMSS(restTimerSec) : 'Prêt pour la série !'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="cat-pill"
                    onClick={() => setRestTimerSec((s) => Math.max(0, s - 15))}
                  >
                    -15s
                  </button>
                  <button
                    className="cat-pill"
                    onClick={() => setRestTimerSec((s) => s + 15)}
                  >
                    +15s
                  </button>
                  <button
                    className="cat-pill active"
                    onClick={() => setRestTimerSec(90)}
                  >
                    90s
                  </button>
                  {restTimerSec > 0 && (
                    <button className="cat-pill" onClick={() => setRestTimerSec(0)}>
                      Passer
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setPickingExerciseForSession(true);
                    setActiveTab('exercises');
                  }}
                >
                  <Plus size={15} /> Ajouter un exercice
                </button>
                <button
                  className="btn-success"
                  style={{ flex: 1 }}
                  onClick={finishActiveWorkout}
                >
                  <CheckCircle2 size={16} /> Terminer & Sauvegarder
                </button>
              </div>
            </div>

            {/* Liste des exercices de la séance active */}
            {activeWorkout.items.map((item, itemIdx) => {
              const ex = exerciseMap.get(item.exerciseId);
              const isFocused = focusedWorkoutExId === item.exerciseId;
              return (
                <div
                  key={`${item.exerciseId}-${itemIdx}`}
                  className={`workout-card ${isFocused && isSplitView ? 'selected' : ''}`}
                  onClick={() => setFocusedWorkoutExId(item.exerciseId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {ex && (
                        <img
                          src={ex.gif_url}
                          alt={ex.name_fr}
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            background: '#fff',
                            objectFit: 'contain',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: 14, display: 'block' }}>
                          {ex?.name_fr || `Exercice #${item.exerciseId}`}
                        </strong>
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          {ex?.target_fr} • Repos conseillé : {item.restSec}s
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {!isSplitView && ex && (
                        <button
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectExercise(ex);
                          }}
                          title="Voir le GIF et les instructions"
                        >
                          <BookOpen size={15} />
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWorkoutItem(itemIdx);
                        }}
                        title="Retirer cet exercice"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Tableau des séries */}
                  <table className="set-table">
                    <thead>
                      <tr>
                        <th>Série</th>
                        <th>Poids (kg)</th>
                        <th>Répétitions</th>
                        <th>Valider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.sets.map((s, setIdx) => (
                        <tr key={setIdx} className={`set-row ${s.done ? 'done' : ''}`}>
                          <td style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>
                            #{s.setNum}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="set-input"
                              value={s.weight}
                              min="0"
                              step="0.5"
                              onChange={(e) =>
                                updateSetField(itemIdx, setIdx, 'weight', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="set-input"
                              value={s.reps}
                              min="1"
                              onChange={(e) =>
                                updateSetField(itemIdx, setIdx, 'reps', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <button
                              className={`set-check-btn ${s.done ? 'done' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSetCompleted(itemIdx, setIdx);
                              }}
                            >
                              <Check size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    className="cat-pill"
                    style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addSetToWorkoutItem(itemIdx);
                    }}
                  >
                    <Plus size={13} /> Ajouter une série
                  </button>
                </div>
              );
            })}

            <button
              className="cat-pill"
              style={{ alignSelf: 'center', color: 'var(--danger)' }}
              onClick={() => setActiveWorkout(null)}
            >
              Abandonner la séance en cours
            </button>
          </>
        ) : creatingRoutine ? (
          /* Mode Création de Programme Personnalisé */
          <div className="section-card">
            <div className="section-header">
              <strong style={{ fontSize: 16 }}>➕ Créer ma séance personnalisée</strong>
              <button className="icon-btn" onClick={() => setCreatingRoutine(false)}>
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              className="search-input"
              placeholder="Nom de la séance (ex: Pecs & Biceps du Lundi)"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newRoutineExercises.map((item, idx) => {
                const ex = exerciseMap.get(item.exerciseId);
                return (
                  <div key={idx} className="interval-row">
                    <div>
                      <strong>{ex?.name_fr || item.exerciseId}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {item.sets} séries × {item.targetReps} reps
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() =>
                        setNewRoutineExercises((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              className="btn-secondary"
              onClick={() => {
                setPickingExerciseForSession(true);
                setActiveTab('exercises');
              }}
            >
              <Plus size={15} /> Choisir un exercice dans le catalogue (1 324)
            </button>

            <button
              className="btn-primary"
              disabled={!newRoutineName.trim() || newRoutineExercises.length === 0}
              onClick={() => {
                const created = {
                  id: 'custom-' + Date.now(),
                  name: newRoutineName.trim(),
                  category: 'Personnalisé',
                  level: 'Sur mesure',
                  durationMin: newRoutineExercises.length * 10,
                  icon: '⭐',
                  description: 'Programme créé sur mesure.',
                  exercises: newRoutineExercises
                };
                setCustomRoutines((prev) => [created, ...prev]);
                setCreatingRoutine(false);
                setNewRoutineName('');
                setNewRoutineExercises([]);
              }}
            >
              Enregistrer ma séance
            </button>
          </div>
        ) : (
          /* Liste des Programmes Prêts à l'emploi + Séances Perso */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: 19, fontWeight: 900 }}>Programmes & Séances</h1>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Lance un programme pré-configuré ou crée ta propre séance.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setCreatingRoutine(true)}>
                  <Plus size={15} /> Créer une séance
                </button>
                <button className="btn-primary" onClick={startEmptyWorkout}>
                  <Play size={15} /> Séance libre
                </button>
              </div>
            </div>

            {customRoutines.length > 0 && (
              <div className="section-card">
                <div className="section-title">⭐ Mes Séances Personnalisées</div>
                {customRoutines.map((cr) => (
                  <div key={cr.id} className="workout-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>
                        {cr.icon} {cr.name}
                      </strong>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => startWorkoutFromTemplate(cr)}
                        >
                          Démarrer
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() =>
                            setCustomRoutines((prev) => prev.filter((x) => x.id !== cr.id))
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PRESET_WORKOUTS.map((pw) => (
                <div key={pw.id} className="workout-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <span className="ex-badge primary">{pw.category}</span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                        {pw.icon} {pw.name}
                      </h3>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {pw.description}
                      </p>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ flexShrink: 0 }}
                      onClick={() => startWorkoutFromTemplate(pw)}
                    >
                      <Play size={14} /> Lancer
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {pw.exercises.map((item, i) => {
                      const ex = exerciseMap.get(item.exerciseId);
                      return (
                        <button
                          key={i}
                          className="cat-pill"
                          onClick={() => {
                            setFocusedWorkoutExId(item.exerciseId);
                            if (ex) handleSelectExercise(ex);
                          }}
                        >
                          {ex?.name_fr || `#${item.exerciseId}`} ({item.sets}×{item.targetReps})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );

    if (!isSplitView) return <div className="primary-pane">{leftPaneContent}</div>;

    return (
      <>
        <div className="primary-pane">{leftPaneContent}</div>
        <aside className="secondary-pane">
          {renderExerciseDetail(focusedEx, false)}
        </aside>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // ONGLET 3 : MODE COURSE À PIED PRO (CARTE GPS, JAUGE SVG, TÉLÉMÉTRIE, ZONES FC)
  // ══════════════════════════════════════════════════════════════════
  const renderRunningTab = () => (
    <RunningView
      isSplitView={isSplitView}
      activeRun={activeRun}
      setActiveRun={setActiveRun}
      selectedRunProgramId={selectedRunProgramId}
      setSelectedRunProgramId={setSelectedRunProgramId}
      startRunningSession={startRunningSession}
      startFreeRun={startFreeRun}
      skipRunInterval={skipRunInterval}
      finishRunningSession={finishRunningSession}
      voiceCoachEnabled={voiceCoachEnabled}
      setVoiceCoachEnabled={setVoiceCoachEnabled}
      gpsActive={gpsActive}
      setGpsActive={setGpsActive}
      paceMinPerKm={paceMinPerKm}
      setPaceMinPerKm={setPaceMinPerKm}
      exerciseMap={exerciseMap}
      onSelectExercise={handleSelectExercise}
      runHistory={runHistory}
    />
  );

  // ══════════════════════════════════════════════════════════════════
  // ONGLET 4 : CATALOGUE DES 1 324 EXERCICES EN FRANÇAIS
  // ══════════════════════════════════════════════════════════════════
  const renderExercisesTab = () => {
    const activeFilterCount =
      selectedTargets.length +
      selectedEquipments.length +
      (selectedBodyPart !== 'all' ? 1 : 0) +
      (onlyFavorites ? 1 : 0);

    const catalogLeft = (
      <section className="primary-pane" style={{ overflow: 'hidden' }}>
        {pickingExerciseForSession && (
          <div className="live-banner" onClick={() => setPickingExerciseForSession(false)}>
            <span>🎯 Touche un exercice ou son bouton « + » pour l’ajouter à ta séance</span>
            <button className="cat-pill">Annuler</button>
          </div>
        )}

        <div className="controls-header">
          <div className="search-row">
            <div className="search-input-wrap">
              <Search size={15} className="search-input-icon" />
              <input
                type="search"
                className="search-input"
                placeholder="Rechercher parmi 1 324 exercices (ex: développé couché, dos, haltères...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear-btn" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              className={`icon-btn ${onlyFavorites ? 'active' : ''}`}
              onClick={() => setOnlyFavorites((f) => !f)}
              title="Filtrer mes favoris"
            >
              <Heart size={16} fill={onlyFavorites ? 'currentColor' : 'none'} />
            </button>

            <button
              className={`icon-btn ${
                selectedTargets.length + selectedEquipments.length > 0 ? 'active' : ''
              }`}
              onClick={() => setFilterDrawerOpen(true)}
              title="Filtres avancés (Muscle & Matériel)"
            >
              <SlidersHorizontal size={16} />
              {selectedTargets.length + selectedEquipments.length > 0 && (
                <span className="badge-dot">
                  {selectedTargets.length + selectedEquipments.length}
                </span>
              )}
            </button>

            <button
              className="icon-btn"
              onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
              title="Vue Grille / Liste"
            >
              {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
            </button>
          </div>

          <div className="category-rail">
            {BODY_PART_ORDER.map((bp) => {
              const active = selectedBodyPart === bp.key;
              const count = bodyPartCounts[bp.key] || 0;
              return (
                <button
                  key={bp.key}
                  className={`cat-pill ${active ? 'active' : ''}`}
                  onClick={() => setSelectedBodyPart(bp.key)}
                >
                  <span>{bp.icon}</span>
                  <span>{bp.label}</span>
                  <span className="cat-pill-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="status-bar">
          <span>
            <strong>{filteredExercises.length}</strong> exercice
            {filteredExercises.length > 1 ? 's' : ''}
          </span>
          {activeFilterCount > 0 && (
            <div className="active-tags">
              <button className="reset-link" onClick={clearAllFilters}>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        <div className="catalog-scroll" ref={catalogScrollRef}>
          {loading ? (
            <div className="empty-box">
              <Dumbbell size={32} color="var(--accent)" />
              <p>Chargement des 1 324 exercices…</p>
            </div>
          ) : (
            <>
              <div className={`exercise-grid ${viewMode === 'list' ? 'view-list' : ''}`}>
                {visibleExercises.map((ex) => {
                  const isSelected = isSplitView && selectedExercise?.id === ex.id;
                  const isFav = favSet.has(ex.id);
                  return (
                    <article
                      key={ex.id}
                      className={`ex-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (pickingExerciseForSession) {
                          addExerciseToActiveWorkout(ex.id);
                        } else {
                          handleSelectExercise(ex);
                        }
                      }}
                    >
                      <div className="ex-media">
                        <img
                          className="ex-img"
                          src={animateGridGifs ? ex.gif_url : ex.image}
                          alt={ex.name_fr}
                          loading="lazy"
                        />
                        <button
                          className={`fav-card-btn ${isFav ? 'is-fav' : ''}`}
                          onClick={(e) => toggleFavorite(ex.id, e)}
                        >
                          <Heart size={13} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                        <span className="gif-badge">GIF</span>
                      </div>

                      <div className="ex-info">
                        <h3 className="ex-title-fr">{ex.name_fr}</h3>
                        <p className="ex-title-en">{ex.name}</p>
                        <div className="ex-badges">
                          <span className="ex-badge primary">{ex.target_fr}</span>
                          <span className="ex-badge equip">{ex.equipment_fr}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {pageSize < filteredExercises.length && (
                <button
                  className="load-more-btn"
                  onClick={() => setPageSize((p) => p + 48)}
                >
                  Afficher plus ({filteredExercises.length - pageSize} restants)
                </button>
              )}
            </>
          )}
        </div>
      </section>
    );

    if (!isSplitView) return catalogLeft;

    return (
      <>
        {catalogLeft}
        <aside className="secondary-pane">
          {renderExerciseDetail(selectedExercise, false)}
        </aside>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // ONGLET 5 : SUIVI, HISTORIQUE, RECORDS & OUTILS SALLE
  // ══════════════════════════════════════════════════════════════════
  const renderStatsTab = () => {
    const est1RM = Math.round(calcWeight * (1 + calcReps / 30));
    // Calculateur de disques par côté (barre olympique 20 kg)
    const getPlatesPerSide = (totalKg) => {
      let rem = Math.max(0, (totalKg - 20) / 2);
      const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
      const res = [];
      for (const p of plates) {
        while (rem >= p - 0.01) {
          res.push(p);
          rem -= p;
        }
      }
      return res;
    };
    const platesSide = getPlatesPerSide(calcWeight);

    const leftStats = (
      <div className="page-pad">
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>📊 Suivi, Records & Outils</h1>

        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-val">{globalKpis.totalWorkouts}</span>
            <span className="kpi-lbl">Séances Muscu</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-val" style={{ color: 'var(--accent-light)' }}>
              {globalKpis.totalVolumeTons} t
            </span>
            <span className="kpi-lbl">Tonnage Total</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-val" style={{ color: 'var(--success)' }}>
              {globalKpis.totalRuns}
            </span>
            <span className="kpi-lbl">Sorties Running</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-val" style={{ color: '#60a5fa' }}>
              {globalKpis.totalRunKm} km
            </span>
            <span className="kpi-lbl">Cumul Course</span>
          </div>
        </div>

        {/* Records Personnels (PRs) */}
        <div className="section-card">
          <div className="section-title">
            <Trophy size={14} color="var(--accent)" />
            Records Personnels (PRs & 1RM Estimé)
          </div>
          {personalRecords.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Termine ta première séance de musculation pour débloquer automatiquement tes records par exercice !
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {personalRecords.map((pr) => (
                <div key={pr.exerciseId} className="interval-row">
                  <div>
                    <strong>{pr.exerciseName}</strong>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Meilleure série : {pr.maxWeight} kg × {pr.repsAtMax} reps
                    </div>
                  </div>
                  <span className="ex-badge primary">1RM : ~{pr.est1RM} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique complet Muscu & Course */}
        <div className="section-card">
          <div className="section-title">📅 Historique des Entraînements</div>
          {workoutHistory.length === 0 && runHistory.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Aucun entraînement enregistré pour l’instant.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workoutHistory.map((w) => (
                <div key={w.id} className="workout-card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>🏋️ {w.name}</strong>
                    <span className="ex-badge primary">{w.totalVolumeKg} kg</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(w.date).toLocaleDateString('fr-FR')} • Durée : {formatTimeMMSS(w.durationSec)} • {w.totalSetsDone} séries validées
                  </div>
                </div>
              ))}
              {runHistory.map((r) => (
                <div key={r.id} className="workout-card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>🏃 {r.title}</strong>
                    <span className="ex-badge equip">{r.distanceKm} km</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(r.date).toLocaleDateString('fr-FR')} • Durée : {formatTimeMMSS(r.durationSec)} • ~{r.calories} kcal
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isSplitView && renderToolsAndSettings(est1RM, platesSide)}
      </div>
    );

    if (!isSplitView) return <div className="primary-pane">{leftStats}</div>;

    return (
      <>
        <div className="primary-pane">{leftStats}</div>
        <aside className="secondary-pane">
          <div className="page-pad">{renderToolsAndSettings(est1RM, platesSide)}</div>
        </aside>
      </>
    );
  };

  const renderToolsAndSettings = (est1RM, platesSide) => (
    <>
      <div className="section-card">
        <div className="section-title">
          <Calculator size={14} color="var(--accent)" />
          Calculateur 1RM & Disques (Barre 20 kg)
        </div>
        <div className="meta-grid">
          <div className="meta-box">
            <span className="meta-label">Charge (kg)</span>
            <input
              type="number"
              className="set-input"
              style={{ width: '100%', marginTop: 4 }}
              value={calcWeight}
              onChange={(e) => setCalcWeight(Number(e.target.value) || 0)}
            />
          </div>
          <div className="meta-box">
            <span className="meta-label">Répétitions</span>
            <input
              type="number"
              className="set-input"
              style={{ width: '100%', marginTop: 4 }}
              value={calcReps}
              onChange={(e) => setCalcReps(Number(e.target.value) || 1)}
            />
          </div>
          <div className="meta-box">
            <span className="meta-label">1RM Maximale Estimée</span>
            <span className="meta-val" style={{ color: 'var(--accent-light)', fontSize: 18 }}>
              {est1RM} kg
            </span>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
          <strong>Disques à charger par côté (barre 20 kg) :</strong>{' '}
          {platesSide.length > 0 ? platesSide.map((p) => `${p}kg`).join(' + ') : 'Barre à vide (20 kg)'}
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <Smartphone size={14} color="var(--accent)" />
          Compatibilité Tous Téléphones & Galaxy Z Fold 5
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          En mode <strong>Auto (Recommandé)</strong>, l’application s’adapte automatiquement à tous les téléphones classiques (iPhone, Samsung S, Pixel, Xiaomi...) en mode 1 écran mobile, et bascule en mode double écran côte-à-côte uniquement sur grand écran ou quand un téléphone pliable (Z Fold 5) est ouvert.
        </p>
      </div>
    </>
  );

  const rootModeClass =
    devicePreview === 'phone'
      ? 'sim-phone'
      : devicePreview === 'folded'
      ? 'sim-folded'
      : devicePreview === 'unfolded'
      ? 'sim-unfolded'
      : 'mode-auto';

  return (
    <div className={`workspace-root ${rootModeClass}`}>
      <div className="device-frame">
        {/* ── Barre Supérieure Universelle ── */}
        <header className="top-bar">
          <div className="brand">
            <div className="brand-icon">
              <Dumbbell size={18} />
            </div>
            <div>
              <div className="brand-title">
                KEG-<span>Sporting</span>
              </div>
            </div>
            <span className="brand-badge hide-on-mobile">
              {isSplitView ? 'Vue Double Écran' : 'Vue Mobile Standard'}
            </span>
          </div>

          <div className="top-actions">
            {/* Sélecteur d'aperçu d'appareil (Auto / Smartphone classique / Z Fold Déplié) */}
            <div className="posture-Readout" title="Aperçu de l'interface selon le téléphone">
              <button
                className={`posture-btn ${devicePreview === 'auto' ? 'active' : ''}`}
                onClick={() => setDevicePreview('auto')}
              >
                <Sparkles size={12} />
                <span>Auto</span>
              </button>
              <button
                className={`posture-btn ${devicePreview === 'phone' ? 'active' : ''}`}
                onClick={() => setDevicePreview('phone')}
                title="Tester le rendu sur un smartphone classique (non pliable)"
              >
                <Smartphone size={12} />
                <span>Mobile</span>
              </button>
              <button
                className={`posture-btn ${devicePreview === 'unfolded' ? 'active' : ''}`}
                onClick={() => setDevicePreview('unfolded')}
                title="Tester le rendu sur Z Fold 5 déplié (Double écran)"
              >
                <BookOpen size={12} />
                <span>Z Fold</span>
              </button>
            </div>

            <button
              className={`icon-btn ${animateGridGifs ? 'active' : ''}`}
              onClick={() => setAnimateGridGifs((g) => !g)}
              title="Animer les GIFs dans la liste"
            >
              <Play size={15} fill={animateGridGifs ? 'currentColor' : 'none'} />
            </button>

            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Thème Sombre AMOLED / Clair"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
              className="icon-btn"
              onClick={() => setInfoModalOpen(true)}
              title="Installer sur téléphone"
            >
              <Share2 size={15} />
            </button>
          </div>
        </header>

        {/* ── Bannière Flottante si une séance Muscu ou Course tourne en arrière-plan ── */}
        {activeWorkout && activeTab !== 'workouts' && (
          <div className="live-banner" onClick={() => setActiveTab('workouts')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-pulse" />
              <strong>🏋️ {activeWorkout.name}</strong>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                ({formatTimeMMSS(workoutElapsedSec)})
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)' }}>
              {restTimerSec > 0 ? `Repos ${formatTimeMMSS(restTimerSec)}` : 'Revenir →'}
            </span>
          </div>
        )}

        {activeRun && activeTab !== 'running' && (
          <div className="live-banner" onClick={() => setActiveTab('running')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-pulse" />
              <strong>🏃 Course en cours</strong>
              <span style={{ fontSize: 12 }}>
                ({formatTimeMMSS(activeRun.remainingSec)} restant)
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>
              Ouvrir →
            </span>
          </div>
        )}

        {/* ── Contenu Principal Adaptatif ── */}
        <main className={`fold-body ${isSplitView ? 'split-view' : ''}`}>
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'workouts' && renderWorkoutsTab()}
          {activeTab === 'running' && renderRunningTab()}
          {activeTab === 'exercises' && renderExercisesTab()}
          {activeTab === 'stats' && renderStatsTab()}
        </main>

        {/* ── Barre de Navigation Mobile Inférieure (5 Onglets) ── */}
        <nav className="bottom-nav">
          <button
            className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={19} />
            <span>Accueil</span>
          </button>

          <button
            className={`nav-tab ${activeTab === 'workouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('workouts')}
          >
            {activeWorkout && <span className="nav-live-dot" />}
            <Dumbbell size={19} />
            <span>Séances</span>
          </button>

          <button
            className={`nav-tab ${activeTab === 'running' ? 'active' : ''}`}
            onClick={() => setActiveTab('running')}
          >
            {activeRun && <span className="nav-live-dot" />}
            <Footprints size={19} />
            <span>Course</span>
          </button>

          <button
            className={`nav-tab ${activeTab === 'exercises' ? 'active' : ''}`}
            onClick={() => setActiveTab('exercises')}
          >
            <BookOpen size={19} />
            <span>Exercices</span>
          </button>

          <button
            className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <Trophy size={19} />
            <span>Suivi</span>
          </button>
        </nav>

        {/* ── Fiche Exercice Mobile (Bottom Sheet sur Smartphone classique / Z Fold plié) ── */}
        {!isSplitView && mobileDetailOpen && selectedExercise && (
          <div className="sheet-backdrop" onClick={() => setMobileDetailOpen(false)}>
            <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle-bar">
                <div className="sheet-handle" />
              </div>
              {renderExerciseDetail(selectedExercise, true)}
            </div>
          </div>
        )}

        {/* ── Tiroir de Filtres Avancés (Muscle & Matériel) ── */}
        {filterDrawerOpen && (
          <div className="sheet-backdrop" onClick={() => setFilterDrawerOpen(false)}>
            <div
              className="sheet-panel filter-sheet-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-handle-bar">
                <div className="sheet-handle" />
              </div>
              <div className="detail-sticky-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={17} color="var(--accent)" />
                  <strong style={{ fontSize: 15 }}>Filtres avancés</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="cat-pill"
                    onClick={() => {
                      setSelectedTargets([]);
                      setSelectedEquipments([]);
                    }}
                  >
                    Effacer
                  </button>
                  <button
                    className="cat-pill active"
                    onClick={() => setFilterDrawerOpen(false)}
                  >
                    Voir ({filteredExercises.length})
                  </button>
                </div>
              </div>

              <div className="filter-drawer-body">
                <div>
                  <div className="filter-group-title">
                    🎯 Muscle Ciblé Principal ({targetOptions.length})
                  </div>
                  <div className="filter-chips-wrap">
                    {targetOptions.map((opt) => {
                      const active = selectedTargets.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          className={`filter-chip ${active ? 'active' : ''}`}
                          onClick={() => toggleArrayFilter(setSelectedTargets, opt.key)}
                        >
                          {opt.label} ({opt.count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="filter-group-title">
                    🏋️ Matériel / Équipement ({equipmentOptions.length})
                  </div>
                  <div className="filter-chips-wrap">
                    {equipmentOptions.map((opt) => {
                      const active = selectedEquipments.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          className={`filter-chip ${active ? 'active' : ''}`}
                          onClick={() => toggleArrayFilter(setSelectedEquipments, opt.key)}
                        >
                          {opt.label} ({opt.count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Guide d'installation sur n'importe quel Smartphone ou Z Fold 5 ── */}
        {infoModalOpen && (
          <div className="sheet-backdrop" onClick={() => setInfoModalOpen(false)}>
            <div
              className="sheet-panel filter-sheet-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-handle-bar">
                <div className="sheet-handle" />
              </div>
              <div className="detail-sticky-top">
                <strong style={{ fontSize: 15 }}>
                  📱 Installer l’application sur téléphone (Classique ou Pliable)
                </strong>
                <button className="icon-btn" onClick={() => setInfoModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="filter-drawer-body" style={{ lineHeight: 1.6 }}>
                <div className="section-card">
                  <strong style={{ color: 'var(--accent-light)' }}>
                    1. Ouvrir sur ton téléphone (Wi-Fi)
                  </strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    Connecte ton téléphone au même Wi-Fi que ton PC et ouvre <code>http://192.168.1.25:5173</code> dans Chrome, Safari ou Samsung Internet.
                  </p>
                </div>

                <div className="section-card">
                  <strong style={{ color: 'var(--accent-light)' }}>
                    2. Ajouter à l’écran d’accueil (PWA)
                  </strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    Menu <strong>⋮</strong> (Android) ou <strong>Partager</strong> (iPhone) → <strong>« Installer l’application » / « Sur l’écran d’accueil »</strong>.
                  </p>
                </div>

                <div className="section-card">
                  <strong style={{ color: 'var(--accent-light)' }}>
                    3. Adaptée à tous les téléphones
                  </strong>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    • <strong>Smartphone classique (non pliable) :</strong> Interface mobile à 1 écran avec barre de navigation en bas.<br />
                    • <strong>Samsung Galaxy Z Fold 5 :</strong> Bascule automatiquement de 1 écran (fermé) à 2 panneaux côte-à-côte (déplié).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
