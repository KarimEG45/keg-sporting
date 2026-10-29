import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Volume2,
  VolumeX,
  Navigation,
  Flag,
  Heart,
  Activity,
  Compass,
  Flame,
  Footprints,
  Timer,
  Sparkles,
  Calculator,
  Plus,
  Minus,
  Wind,
  Award,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { RUNNING_PROGRAMS, BEGINNER_RUNNING_TIPS } from '../data/runningPrograms.js';
import { playMetronomeTick, playSetValidatedFeedback } from '../utils/sound.js';

function formatMMSS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function speedToPaceStr(speedKmh) {
  if (!speedKmh || speedKmh <= 0.5) return "--'--\"";
  const paceDecimal = 60 / speedKmh;
  const mins = Math.floor(paceDecimal);
  const secs = Math.round((paceDecimal - mins) * 60);
  if (secs === 60) return `${mins + 1}'00"`;
  return `${mins}'${String(secs).padStart(2, '0')}"`;
}

// Génère un circuit de course réaliste (boucle parc urbain) en coordonnées SVG (0..400, 0..200)
const TRACK_POINTS = (() => {
  const pts = [];
  const total = 120;
  for (let i = 0; i <= total; i++) {
    const t = (i / total) * Math.PI * 2;
    const x =
      200 +
      145 * Math.cos(t) +
      18 * Math.sin(3 * t) -
      10 * Math.cos(2 * t);
    const y =
      100 +
      64 * Math.sin(t) +
      12 * Math.cos(2 * t) +
      8 * Math.sin(4 * t);
    pts.push({ x: +x.toFixed(1), y: +y.toFixed(1) });
  }
  return pts;
})();

const HEART_RATE_ZONES = [
  {
    zone: 'Z1',
    name: 'Récupération Active',
    pct: '50 - 60%',
    bpm: '95 - 115 bpm',
    color: '#3b82f6',
    desc: 'Échauffement et marche de récupération. Respiration très calme.'
  },
  {
    zone: 'Z2',
    name: 'Endurance Fondamentale (Cible Débutant)',
    pct: '60 - 75%',
    bpm: '115 - 145 bpm',
    color: '#10b981',
    desc: 'LA zone idéale pour débuter : tu peux parler en courant, tu brûles les graisses et construis ton cardio sans t’épuiser.'
  },
  {
    zone: 'Z3',
    name: 'Allure Tempo / Aérobie',
    pct: '75 - 85%',
    bpm: '145 - 162 bpm',
    color: '#f59e0b',
    desc: 'Effort soutenu, parole hachée. Utile après plusieurs semaines de pratique.'
  },
  {
    zone: 'Z4',
    name: 'Seuil Anaérobie',
    pct: '85 - 92%',
    bpm: '162 - 176 bpm',
    color: '#f97316',
    desc: 'Allure rapide de compétition sur 5 km / 10 km.'
  },
  {
    zone: 'Z5',
    name: 'Puissance VMA / Sprint',
    pct: '92 - 100%',
    bpm: '176 - 190+ bpm',
    color: '#ef4444',
    desc: 'Effort maximal sur courtes répétitions (ex: fractionné 30s/30s).'
  }
];

const RUNNER_EXERCISES = [
  {
    id: '1377',
    role: 'Avant / Après Course',
    titleFr: 'Étirement et mobilité des mollets au mur',
    benefit: 'Prévient les périostites tibiales et les tendinites d’Achille.'
  },
  {
    id: '1512',
    role: 'Après la Course',
    titleFr: 'Étirement des quadriceps & fléchisseurs de hanche',
    benefit: 'Relâche la tension accumulée sur l’avant des cuisses et les genoux.'
  },
  {
    id: '1511',
    role: 'Après la Course',
    titleFr: 'Assouplissement des ischio-jambiers',
    benefit: 'Améliore l’amplitude de la foulée et protège le bas du dos.'
  },
  {
    id: '0336',
    role: 'Renforcement Coureur',
    titleFr: 'Fentes dynamiques (Stabilité genoux & fessiers)',
    benefit: 'Stabilise l’appui unipodal à chaque foulée.'
  }
];

export default function RunningView({
  isSplitView,
  activeRun,
  setActiveRun,
  selectedRunProgramId,
  setSelectedRunProgramId,
  startRunningSession,
  startFreeRun,
  skipRunInterval,
  finishRunningSession,
  voiceCoachEnabled,
  setVoiceCoachEnabled,
  gpsActive,
  setGpsActive,
  paceMinPerKm,
  setPaceMinPerKm,
  exerciseMap,
  onSelectExercise,
  runHistory
}) {
  // Sous-onglets internes pour une vraie expérience d'application Running
  // 'cockpit' | 'plans' | 'coach' | 'prep'
  const [subTab, setSubTab] = useState('cockpit');
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [targetCadence, setTargetCadence] = useState(168); // pas/min idéal débutant
  const [speedOverrideKmh, setSpeedOverrideKmh] = useState(null);
  const [manualLaps, setManualLaps] = useState([]);
  const [breathTick, setBreathTick] = useState(0);

  const selectedProgram =
    RUNNING_PROGRAMS.find((p) => p.id === selectedRunProgramId) || RUNNING_PROGRAMS[0];

  // Si aucune course n'est active, on montre un aperçu interactif du programme sélectionné dans le cockpit
  const currentInterval = activeRun
    ? activeRun.intervals[activeRun.currentIdx]
    : selectedProgram.intervals[0];

  const nextInterval = activeRun
    ? activeRun.intervals[activeRun.currentIdx + 1] || null
    : selectedProgram.intervals[1] || null;

  // Vitesse instantanée (km/h) et allure (min/km)
  const baseSpeedKmh = currentInterval?.speedKmh || 8.5;
  const currentSpeedKmh =
    speedOverrideKmh !== null
      ? speedOverrideKmh
      : activeRun && activeRun.paused
      ? 0
      : baseSpeedKmh;

  const currentPaceStr = speedToPaceStr(currentSpeedKmh || baseSpeedKmh);
  const avgSpeedKmh =
    activeRun && activeRun.elapsedSec > 5
      ? Math.max(4.5, (activeRun.distanceKm / (activeRun.elapsedSec / 3600)))
      : baseSpeedKmh;
  const avgPaceStr = speedToPaceStr(avgSpeedKmh);

  // Calcul FC estimée et Zone Cardiaque selon le type d'intervalle / vitesse
  const { estHeartRate, activeZoneIndex } = useMemo(() => {
    const type = currentInterval?.type || 'run';
    if (activeRun?.paused) return { estHeartRate: 88, activeZoneIndex: 0 };
    if (type === 'warmup' || type === 'cooldown') return { estHeartRate: 108, activeZoneIndex: 0 };
    if (type === 'walk') return { estHeartRate: 114, activeZoneIndex: 0 };
    if (currentSpeedKmh >= 11.5) return { estHeartRate: 172, activeZoneIndex: 3 };
    if (currentSpeedKmh >= 9.8) return { estHeartRate: 154, activeZoneIndex: 2 };
    return { estHeartRate: 136, activeZoneIndex: 1 }; // Zone 2 Endurance Fondamentale !
  }, [currentInterval, activeRun?.paused, currentSpeedKmh]);

  // Cadence, pas et dénivelé
  const liveCadence =
    activeRun && !activeRun.paused
      ? currentInterval?.type === 'walk' || currentInterval?.type === 'warmup'
        ? 118
        : targetCadence
      : 0;
  const estSteps = activeRun ? Math.round(activeRun.distanceKm * 1280) : 0;
  const estElevationGain = activeRun ? Math.round(activeRun.distanceKm * 11) : 0;
  const estCalories = activeRun
    ? Math.round(activeRun.distanceKm * 68 || (activeRun.elapsedSec / 60) * 8.5)
    : 0;

  // Métronome audio de cadence (aide le débutant à faire des petits pas fréquents)
  useEffect(() => {
    if (!metronomeOn || !activeRun || activeRun.paused) return;
    const intervalMs = Math.round((60 / targetCadence) * 1000);
    const id = setInterval(() => {
      playMetronomeTick();
    }, intervalMs);
    return () => clearInterval(id);
  }, [metronomeOn, activeRun, targetCadence]);

  // Guide de respiration rythmée (cycle de 5 pas : 3 inspirations + 2 expirations)
  useEffect(() => {
    const id = setInterval(() => {
      setBreathTick((t) => (t + 1) % 5);
    }, 850);
    return () => clearInterval(id);
  }, []);

  // Enregistrer un tour / Lap manuel
  const handleRecordLap = () => {
    if (!activeRun) return;
    playSetValidatedFeedback();
    setManualLaps((prev) => [
      {
        lapNum: prev.length + 1,
        timeSec: activeRun.elapsedSec,
        distanceKm: activeRun.distanceKm,
        pace: currentPaceStr,
        phase: currentInterval?.label || 'Course'
      },
      ...prev
    ]);
  };

  // Progression de l'anneau circulaire SVG
  const totalIntervalSec = currentInterval?.durationSec || 60;
  const remainingSec = activeRun ? activeRun.remainingSec : totalIntervalSec;
  const intervalProgressPct = Math.min(
    100,
    Math.max(0, ((totalIntervalSec - remainingSec) / totalIntervalSec) * 100)
  );

  // Progression globale de la séance
  const activeIntervalsList = activeRun ? activeRun.intervals : selectedProgram.intervals;
  const totalSessionSec = activeIntervalsList.reduce((acc, it) => acc + it.durationSec, 0);
  const sessionElapsedSec = activeRun ? activeRun.elapsedSec : 0;
  const sessionProgressPct = Math.min(
    100,
    Math.round((sessionElapsedSec / Math.max(1, totalSessionSec)) * 100)
  );

  // Position du coureur sur le tracé GPS SVG
  const runnerPointIndex = activeRun
    ? Math.min(
        TRACK_POINTS.length - 1,
        Math.floor(((activeRun.elapsedSec % 600) / 600) * TRACK_POINTS.length)
      )
    : 28;
  const activeTrackSlice = TRACK_POINTS.slice(0, Math.max(2, runnerPointIndex + 1));
  const runnerCoord = TRACK_POINTS[runnerPointIndex] || TRACK_POINTS[0];

  const fullTrackPointsAttr = TRACK_POINTS.map((p) => `${p.x},${p.y}`).join(' ');
  const activeTrackPointsAttr = activeTrackSlice.map((p) => `${p.x},${p.y}`).join(' ');

  const phaseMeta = {
    warmup: {
      color: '#10b981',
      badge: '🟢 ÉCHAUFFEMENT ARTICULAIRE & CARDIO',
      zoneText: 'Zone 1 • Marche dynamique'
    },
    run: {
      color: '#ff5500',
      badge: '🔥 COURSE — ENDURANCE FONDAMENTALE',
      zoneText: 'Zone 2 • Aisance respiratoire'
    },
    walk: {
      color: '#3b82f6',
      badge: '🔵 RÉCUPÉRATION ACTIVE (MARCHE)',
      zoneText: 'Zone 1-2 • Récupération souffle'
    },
    cooldown: {
      color: '#8b5cf6',
      badge: '🟣 RETOUR AU CALME & RELÂCHEMENT',
      zoneText: 'Zone 1 • Baisse progressive FC'
    }
  };
  const pInfo = phaseMeta[currentInterval?.type || 'run'];

  // Calculateur d'allure
  const speedKmhFromPace = (60 / paceMinPerKm).toFixed(1);
  const time5kMin = Math.round(paceMinPerKm * 5);
  const time10kMin = Math.round(paceMinPerKm * 10);

  // ── PANNEAU 1 : LE COCKPIT DE COURSE PRO (CARTE GPS + JAUGE CIRCULAIRE + TÉLÉMÉTRIE 8 CAPTEURS) ──
  const renderCockpitMain = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. CARTE GPS / RADAR TOPOGRAPHIQUE EN DIRECT */}
      <div className="run-map-card">
        <div className="run-map-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="gps-status-dot" style={{ background: gpsActive ? '#10b981' : '#f59e0b' }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em' }}>
              {gpsActive ? 'GPS HAUTE PRÉCISION ACTIF' : 'TRACÉ PARCOURS & SIMULATION TAPIS'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className={`cat-pill ${gpsActive ? 'active' : ''}`}
              style={{ padding: '4px 9px', fontSize: 11 }}
              onClick={() => setGpsActive((g) => !g)}
              title="Basculer entre le GPS réel du téléphone et le mode Tapis / Simulation"
            >
              <Navigation size={12} />
              {gpsActive ? 'GPS Réel' : 'Activer GPS'}
            </button>
            <button
              className={`cat-pill ${voiceCoachEnabled ? 'active' : ''}`}
              style={{ padding: '4px 9px', fontSize: 11 }}
              onClick={() => setVoiceCoachEnabled((v) => !v)}
              title="Activer / couper le coach vocal en français"
            >
              {voiceCoachEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              Voix FR
            </button>
          </div>
        </div>

        {/* Rendu SVG de la carte topographique et du tracé du coureur */}
        <div className="run-map-canvas">
          <svg viewBox="0 0 400 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="topoGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path
                  d="M 25 0 L 0 0 0 25"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              </pattern>
              <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#ff5500" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Grille topographique sombre */}
            <rect width="400" height="200" fill="url(#topoGrid)" />

            {/* Courbes de niveau décoratives */}
            <ellipse
              cx="200"
              cy="100"
              rx="175"
              ry="84"
              fill="none"
              stroke="rgba(59,130,246,0.08)"
              strokeDasharray="4 6"
            />
            <ellipse
              cx="195"
              cy="102"
              rx="110"
              ry="42"
              fill="none"
              stroke="rgba(16,185,129,0.08)"
              strokeDasharray="3 5"
            />

            {/* Boucle complète en grisé */}
            <polyline
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={fullTrackPointsAttr}
            />

            {/* Portion parcourue illuminée */}
            <polyline
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={activeTrackPointsAttr}
            />

            {/* Bornes kilométriques sur le parcours */}
            <g transform={`translate(${TRACK_POINTS[0].x}, ${TRACK_POINTS[0].y})`}>
              <circle r="5" fill="#10b981" />
              <text x="8" y="4" fill="#a1a1b2" fontSize="9" fontWeight="700">
                DÉPART
              </text>
            </g>
            <g transform={`translate(${TRACK_POINTS[40].x}, ${TRACK_POINTS[40].y})`}>
              <circle r="4" fill="#3b82f6" />
              <text x="-28" y="-7" fill="#93c5fd" fontSize="8.5" fontWeight="700">
                KM 1
              </text>
            </g>
            <g transform={`translate(${TRACK_POINTS[80].x}, ${TRACK_POINTS[80].y})`}>
              <circle r="4" fill="#f59e0b" />
              <text x="7" y="10" fill="#fcd34d" fontSize="8.5" fontWeight="700">
                KM 2
              </text>
            </g>

            {/* Position actuelle du coureur avec halo pulsant */}
            <g transform={`translate(${runnerCoord.x}, ${runnerCoord.y})`}>
              <circle r="13" fill={pInfo.color} opacity="0.25" />
              <circle r="6.5" fill={pInfo.color} stroke="#ffffff" strokeWidth="2" />
            </g>
          </svg>

          {/* Overlay météo / piste / altitude */}
          <div className="run-map-bottom-overlay">
            <span>📍 Circuit Parc / Route • Alt: 112 m (D+ {estElevationGain} m)</span>
            <span>Allure moy. : <strong>{avgPaceStr}/km</strong></span>
          </div>
        </div>
      </div>

      {/* 2. TÉLÉMÉTRIE COMPLÈTE DU COUREUR EN DIRECT (ALLURE, DISTANCE, FC, CADENCE) */}
      <div className="telemetry-grid">
        <div className="telemetry-card">
          <span className="telemetry-lbl">⚡ ALLURE</span>
          <span className="telemetry-val" style={{ color: 'var(--accent-light)' }}>
            {currentPaceStr}
          </span>
          <span className="telemetry-sub">min/km ({currentSpeedKmh.toFixed(1)} km/h)</span>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-lbl">📍 DISTANCE</span>
          <span className="telemetry-val" style={{ color: '#60a5fa' }}>
            {activeRun ? activeRun.distanceKm.toFixed(2) : '0.00'} <small>km</small>
          </span>
          <span className="telemetry-sub">
            {activeRun ? `${Math.round(activeRun.distanceKm * 1000)} m • ${estCalories} kcal` : 'Prêt au départ'}
          </span>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-lbl">❤️ ZONE FC</span>
          <span
            className="telemetry-val"
            style={{ color: HEART_RATE_ZONES[activeZoneIndex].color }}
          >
            {estHeartRate} <small>bpm</small>
          </span>
          <span className="telemetry-sub">
            {HEART_RATE_ZONES[activeZoneIndex].zone} • {HEART_RATE_ZONES[activeZoneIndex].name.split(' ')[0]}
          </span>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-lbl">👟 CADENCE</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <span className="telemetry-val" style={{ color: '#34d399' }}>
              {liveCadence || targetCadence}
            </span>
            <button
              className={`cat-pill ${metronomeOn ? 'active' : ''}`}
              style={{ padding: '2px 6px', fontSize: 10 }}
              onClick={() => setMetronomeOn((m) => !m)}
              title="Activer le bip métronome de cadence"
            >
              {metronomeOn ? '🔊 ON' : '🔇 Bip'}
            </button>
          </div>
          <span className="telemetry-sub">pas/min • Foulée 0.92m</span>
        </div>
      </div>

      {/* 3. CADRAN PRINCIPAL : ANNEAU DE PROGRESSION SVG + CHRONO + TIMELINE MULTICOLORE */}
      <div className="run-cockpit-card" style={{ borderColor: pInfo.color }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="run-phase-badge"
            style={{ background: pInfo.color, color: '#fff' }}
          >
            {pInfo.badge}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {activeRun
              ? `Bloc ${activeRun.currentIdx + 1} sur ${activeRun.intervals.length}`
              : `Aperçu : ${selectedProgram.title}`}
          </span>
        </div>

        {/* Anneau circulaire SVG + Grand Chronomètre */}
        <div className="run-gauge-row">
          <div className="run-ring-wrap">
            <svg viewBox="0 0 180 180" width="136" height="136">
              <circle
                cx="90"
                cy="90"
                r="76"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="12"
              />
              <circle
                cx="90"
                cy="90"
                r="76"
                fill="none"
                stroke={pInfo.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 76}
                strokeDashoffset={
                  2 * Math.PI * 76 * (1 - intervalProgressPct / 100)
                }
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
            <div className="run-ring-center">
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {activeRun ? 'Temps Bloc' : 'Durée Bloc 1'}
              </span>
              <div className="run-big-timer" style={{ fontSize: 31 }}>
                {formatMMSS(remainingSec)}
              </div>
              <span style={{ fontSize: 10, color: pInfo.color, fontWeight: 700 }}>
                {pInfo.zoneText}
              </span>
            </div>
          </div>

          {/* Infos Phase Actuelle + Phase Suivante + Contrôle Vitesse Tapis */}
          <div className="run-gauge-side">
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              {currentInterval?.label}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              💡 {currentInterval?.tip}
            </p>

            {nextInterval && (
              <div className="next-interval-pill">
                <span>⏭️ À suivre : <strong>{nextInterval.label}</strong></span>
                <strong>{formatMMSS(nextInterval.durationSec)}</strong>
              </div>
            )}

            {/* Réglage fin de l'allure / vitesse (utile sur tapis ou en extérieur) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Vitesse cible : <strong style={{ color: 'var(--text-primary)' }}>{(speedOverrideKmh ?? baseSpeedKmh).toFixed(1)} km/h</strong> ({currentPaceStr}/km)
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="icon-btn"
                  style={{ width: 28, height: 28 }}
                  onClick={() =>
                    setSpeedOverrideKmh((prev) =>
                      Math.max(4.0, +((prev ?? baseSpeedKmh) - 0.5).toFixed(1))
                    )
                  }
                  title="Réduire la vitesse (-0.5 km/h)"
                >
                  <Minus size={13} />
                </button>
                <button
                  className="icon-btn"
                  style={{ width: 28, height: 28 }}
                  onClick={() =>
                    setSpeedOverrideKmh((prev) =>
                      Math.min(18.0, +((prev ?? baseSpeedKmh) + 0.5).toFixed(1))
                    )
                  }
                  title="Augmenter la vitesse (+0.5 km/h)"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barre Timeline Visuelle de toute la séance (Proportionnelle aux blocs) */}
        <div style={{ width: '100%', marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>Progression de la séance : <strong>{sessionProgressPct}%</strong></span>
            <span>Temps écoulé : <strong>{formatMMSS(sessionElapsedSec)} / {formatMMSS(totalSessionSec)}</strong></span>
          </div>
          <div className="session-timeline-bar">
            {activeIntervalsList.map((intv, idx) => {
              const widthPct = (intv.durationSec / totalSessionSec) * 100;
              const col = phaseMeta[intv.type]?.color || '#ff5500';
              const isCurrent = activeRun && idx === activeRun.currentIdx;
              const isPast = activeRun && idx < activeRun.currentIdx;
              return (
                <div
                  key={idx}
                  style={{
                    width: `${widthPct}%`,
                    background: col,
                    opacity: isCurrent ? 1 : isPast ? 0.45 : 0.25,
                    border: isCurrent ? '1px solid #fff' : 'none'
                  }}
                  title={`${intv.label} (${formatMMSS(intv.durationSec)})`}
                />
              );
            })}
          </div>
        </div>

        {/* Barre de boutons d'action Course */}
        <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8, flexWrap: 'wrap' }}>
          {!activeRun ? (
            <>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={() => startRunningSession(selectedProgram)}
              >
                <Play size={16} /> Démarrer « {selectedProgram.level} » ({selectedProgram.totalMin} min)
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={startFreeRun}
              >
                Course Libre
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={() =>
                  setActiveRun((prev) => ({ ...prev, paused: !prev.paused }))
                }
              >
                {activeRun.paused ? <Play size={16} /> : <Pause size={16} />}
                {activeRun.paused ? 'Reprendre la course' : 'Pause'}
              </button>

              <button
                className="btn-secondary"
                onClick={handleRecordLap}
                title="Enregistrer un temps de passage (Tour / Lap)"
              >
                <Flag size={15} /> Tour
              </button>

              <button
                className="btn-secondary"
                onClick={skipRunInterval}
                title="Passer au bloc suivant"
              >
                <SkipForward size={15} /> Bloc suiv.
              </button>

              <button className="btn-success" onClick={finishRunningSession}>
                <CheckCircle2 size={16} /> Terminer
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. GUIDE DE RESPIRATION RYTHMÉE EN DIRECT (ANTI POINT DE CÔTÉ) */}
      <div className="breath-coach-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`breath-orb ${breathTick < 3 ? 'inhale' : 'exhale'}`}>
            <Wind size={18} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: breathTick < 3 ? '#34d399' : '#60a5fa' }}>
              {breathTick < 3
                ? `🫁 INSPIRE PAR LE NEZ & LA BOUCHE (Pas ${breathTick + 1}/3)`
                : `💨 EXPIRE PROFONDÉMENT PAR LA BOUCHE (Pas ${breathTick - 2}/2)`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Cadence respiratoire 3:2 (3 pas d’inspiration / 2 pas d’expiration) — évite les points de côté !
            </div>
          </div>
        </div>
      </div>

      {/* 5. TEMPS DE PASSAGE / TOURS (SPLITS & LAPS) */}
      {manualLaps.length > 0 && (
        <div className="section-card">
          <div className="section-title">
            <Flag size={14} color="var(--accent)" />
            Temps de passage & Tours enregistrés ({manualLaps.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {manualLaps.map((lap) => (
              <div key={lap.lapNum} className="interval-row">
                <span>
                  <strong>Tour #{lap.lapNum}</strong> • {lap.phase}
                </span>
                <span>
                  {lap.distanceKm.toFixed(2)} km • <strong>{lap.pace}/km</strong> ({formatMMSS(lap.timeSec)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── PANNEAU 2 : PLANS PROGRESSIFS DÉBUTANT (0 → 5 KM) ──
  const renderPlansSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="section-card">
        <div className="section-header">
          <div className="section-title">
            <Award size={15} color="var(--accent)" />
            Programme Progressif Débutant (De 0 à 5 km / 30 min)
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Sélectionne ton niveau actuel : chaque séance décompose automatiquement l’échauffement, les cycles d’alternance Course / Marche et le retour au calme avec guidage vocal.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RUNNING_PROGRAMS.map((rp) => {
            const isSel = rp.id === selectedRunProgramId;
            return (
              <div
                key={rp.id}
                className={`workout-card ${isSel ? 'selected' : ''}`}
                onClick={() => setSelectedRunProgramId(rp.id)}
                style={{ cursor: 'pointer', padding: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <span
                      className="ex-badge"
                      style={{ background: `${rp.color}22`, color: rp.color }}
                    >
                      {rp.badge}
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>
                      {rp.icon} {rp.title}
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {rp.goal}
                    </p>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 5 }}>
                      ⏱️ {rp.totalMin} min • {rp.intervals.length} blocs ({rp.summary})
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRunProgramId(rp.id);
                      startRunningSession(rp);
                      setSubTab('cockpit');
                    }}
                  >
                    <Play size={13} /> Lancer
                  </button>
                </div>

                {/* Mini aperçu coloré des blocs du programme */}
                <div className="session-timeline-bar" style={{ height: 6, marginTop: 6 }}>
                  {rp.intervals.map((intv, i) => (
                    <div
                      key={i}
                      style={{
                        width: `${(intv.durationSec / (rp.totalMin * 60)) * 100}%`,
                        background: phaseMeta[intv.type]?.color || '#ff5500'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail complet bloc par bloc du programme sélectionné */}
      <div className="section-card">
        <div className="section-title">
          <Timer size={14} color="var(--accent)" />
          Structure détaillée : {selectedProgram.title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
          {selectedProgram.intervals.map((intv, idx) => {
            const isCur = activeRun && activeRun.currentIdx === idx;
            return (
              <div key={idx} className={`interval-row ${isCur ? 'active' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: phaseMeta[intv.type]?.color || '#ff5500',
                      flexShrink: 0
                    }}
                  />
                  <span>
                    {idx + 1}. {intv.label}
                  </span>
                </div>
                <span style={{ fontWeight: 700 }}>
                  {formatMMSS(intv.durationSec)} ({speedToPaceStr(intv.speedKmh)}/km)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── PANNEAU 3 : ZONES CARDIAQUES, CALCULATEUR D'ALLURE & CONSEILS DÉBUTANT ──
  const renderCoachAndZonesSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Jauge des 5 Zones Cardiaques */}
      <div className="section-card">
        <div className="section-title">
          <Heart size={14} color="#ef4444" />
          Les 5 Zones Cardiaques en Course à Pied
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Pour progresser quand on débute, passe <strong>80 % de ton temps en Zone 2 (Endurance Fondamentale)</strong> : c’est l’allure où tu peux discuter sans manquer d’air.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {HEART_RATE_ZONES.map((z, idx) => {
            const isCurrentZone = idx === activeZoneIndex;
            return (
              <div
                key={z.zone}
                className="interval-row"
                style={{
                  borderColor: isCurrentZone ? z.color : 'var(--border)',
                  background: isCurrentZone ? `${z.color}18` : 'var(--bg-surface)',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <strong style={{ color: z.color, fontSize: 13 }}>
                    {z.zone} — {z.name} {isCurrentZone ? ' (Zone Actuelle 🎯)' : ''}
                  </strong>
                  <span className="ex-badge equip">{z.bpm} ({z.pct})</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{z.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculateur d'Allure & Prédicteur 5 km / 10 km / Semi */}
      <div className="section-card">
        <div className="section-title">
          <Calculator size={14} color="var(--accent)" />
          Convertisseur d’Allure (min/km ↔ km/h) & Prédicteur
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 13 }}>
            Allure :{' '}
            <strong style={{ color: 'var(--accent-light)' }}>
              {Math.floor(paceMinPerKm)}'{String(Math.round((paceMinPerKm % 1) * 60)).padStart(2, '0')}" / km
            </strong>
          </span>
          <input
            type="range"
            min="4.0"
            max="9.0"
            step="0.1"
            value={paceMinPerKm}
            onChange={(e) => setPaceMinPerKm(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
        <div className="meta-grid">
          <div className="meta-box">
            <span className="meta-label">Vitesse Tapis</span>
            <span className="meta-val" style={{ color: 'var(--accent-light)' }}>
              {speedKmhFromPace} km/h
            </span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Temps 5 km</span>
            <span className="meta-val">{time5kMin} min</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Temps 10 km</span>
            <span className="meta-val">{time10kMin} min</span>
          </div>
        </div>
      </div>

      {/* Les 4 règles d'or du débutant */}
      <div className="section-card">
        <div className="section-title">
          <Sparkles size={14} color="var(--success)" />
          Les 4 Règles d’Or pour Débuter sans se Blesser
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BEGINNER_RUNNING_TIPS.map((tip, idx) => (
            <div key={idx} className="meta-box">
              <strong style={{ fontSize: 13 }}>
                {tip.icon} {tip.title}
              </strong>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                {tip.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── PANNEAU 4 : ÉCHAUFFEMENT & ÉTIREMENTS SPÉCIAL COUREUR (AVEC GIFS ANIMÉS) ──
  const renderRunnerPrepSection = () => (
    <div className="section-card">
      <div className="section-title">
        <Activity size={14} color="var(--accent)" />
        Routine Mobilité, Renforcement & Étirements du Coureur (GIFs)
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
        Clique sur un exercice pour voir ses instructions complètes et son animation GIF : indispensable pour protéger tes genoux, chevilles et mollets !
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {RUNNER_EXERCISES.map((item) => {
          const ex = exerciseMap.get(item.id);
          return (
            <div
              key={item.id}
              className="workout-card"
              style={{ padding: 10, cursor: 'pointer' }}
              onClick={() => ex && onSelectExercise(ex)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {ex && (
                  <img
                    src={ex.gif_url}
                    alt={item.titleFr}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: '#fff',
                      objectFit: 'contain',
                      flexShrink: 0
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="ex-badge primary">{item.role}</span>
                  <strong style={{ display: 'block', fontSize: 14, marginTop: 3 }}>
                    {item.titleFr}
                  </strong>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {item.benefit}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Barre de sous-navigation du Mode Course (pour naviguer sur mobile ou choisir l'outil sur le panneau droit)
  const subNavBar = (
    <div className="category-rail" style={{ paddingBottom: 4 }}>
      <button
        className={`cat-pill ${subTab === 'cockpit' ? 'active' : ''}`}
        onClick={() => setSubTab('cockpit')}
      >
        🛰️ Cockpit & Carte GPS
      </button>
      <button
        className={`cat-pill ${subTab === 'plans' ? 'active' : ''}`}
        onClick={() => setSubTab('plans')}
      >
        📅 Plans Débutant (0→5 km)
      </button>
      <button
        className={`cat-pill ${subTab === 'coach' ? 'active' : ''}`}
        onClick={() => setSubTab('coach')}
      >
        ❤️ Zones FC & Allure
      </button>
      <button
        className={`cat-pill ${subTab === 'prep' ? 'active' : ''}`}
        onClick={() => setSubTab('prep')}
      >
        🧘 Étirements Coureur (GIFs)
      </button>
    </div>
  );

  // Sur Smartphone classique (1 écran)
  if (!isSplitView) {
    return (
      <div className="primary-pane">
        <div className="page-pad">
          {subNavBar}
          {subTab === 'cockpit' && renderCockpitMain()}
          {subTab === 'plans' && renderPlansSection()}
          {subTab === 'coach' && renderCoachAndZonesSection()}
          {subTab === 'prep' && renderRunnerPrepSection()}
        </div>
      </div>
    );
  }

  // Sur Grand Écran / Samsung Galaxy Z Fold 5 Déplié (Double Panneau Pro) :
  // - À gauche : Le Cockpit de Course en Direct (Carte GPS + Anneau Chrono + 8 Capeurs Télémétrie + Guide Respiration)
  // - À droite : Navigation rapide entre Plans 0→5km, Zones Cardiaques & Calculateur d'Allure, et Étirements GIFs !
  return (
    <>
      <div className="primary-pane">
        <div className="page-pad">{renderCockpitMain()}</div>
      </div>
      <aside className="secondary-pane">
        <div className="page-pad">
          <div className="category-rail" style={{ paddingBottom: 4 }}>
            <button
              className={`cat-pill ${subTab === 'cockpit' || subTab === 'plans' ? 'active' : ''}`}
              onClick={() => setSubTab('plans')}
            >
              📅 Plans 0 → 5 km
            </button>
            <button
              className={`cat-pill ${subTab === 'coach' ? 'active' : ''}`}
              onClick={() => setSubTab('coach')}
            >
              ❤️ Zones Cardiaques & Allure
            </button>
            <button
              className={`cat-pill ${subTab === 'prep' ? 'active' : ''}`}
              onClick={() => setSubTab('prep')}
            >
              🧘 Étirements & Renfo (GIFs)
            </button>
          </div>

          {(subTab === 'cockpit' || subTab === 'plans') && renderPlansSection()}
          {subTab === 'coach' && renderCoachAndZonesSection()}
          {subTab === 'prep' && renderRunnerPrepSection()}
        </div>
      </aside>
    </>
  );
}
