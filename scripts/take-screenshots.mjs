import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_DIR = 'e:/Musculation/screenshot';

fs.mkdirSync(OUT_DIR, { recursive: true });

const shots = [
  {
    file: '01-accueil-zfold-deplie.png',
    url: 'http://localhost:5173/?tab=home&mode=unfolded',
    size: '1100,920'
  },
  {
    file: '02-mobile-standard.png',
    url: 'http://localhost:5173/?tab=home&mode=phone',
    size: '520,920'
  },
  {
    file: '03-seances-musculation.png',
    url: 'http://localhost:5173/?tab=workouts&mode=unfolded',
    size: '1100,920'
  },
  {
    file: '04-coach-course-debutant.png',
    url: 'http://localhost:5173/?tab=running&mode=unfolded',
    size: '1100,920'
  },
  {
    file: '05-catalogue-1324-exercices.png',
    url: 'http://localhost:5173/?tab=exercises&mode=unfolded',
    size: '1100,920'
  }
];

for (const s of shots) {
  const outPath = path.join(OUT_DIR, s.file);
  console.log(`Capturing ${s.file}...`);
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${s.size}`,
    '--virtual-time-budget=3500',
    `--screenshot=${outPath}`,
    s.url
  ]);
}

console.log('All screenshots saved in e:/Musculation/screenshot');
