/**
 * T0.7 — Script de desplegament per instància (clasp).
 * Ús: node scripts/deploy-instance.mjs <nom-tutor>
 * Llegeix .clasp.<nom-tutor>.json, genera el paquet a dist/ i el puja a l'Apps Script del tutor.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const tutorName = process.argv[2];
if (!tutorName || !/^[a-zA-Z0-9_-]+$/.test(tutorName)) {
  console.error('Ús: node scripts/deploy-instance.mjs <nom-instancia-tutor>');
  console.error('Exemple: node scripts/deploy-instance.mjs pilot-mestra');
  process.exit(1);
}

const configPath = path.resolve(process.cwd(), `.clasp.${tutorName}.json`);
if (!fs.existsSync(configPath)) {
  console.error(`No s'ha trobat el fitxer ${configPath}.`);
  console.error('Copia .clasp.example.json a aquest nom i posa-hi l\'scriptId del projecte d\'Apps Script.');
  process.exit(1);
}

console.log(`[1/2] Construint paquets per a la instància '${tutorName}'...`);
execSync('npm run build', { stdio: 'inherit' });

console.log(`[2/2] Pujant amb clasp usant ${path.basename(configPath)}...`);
execSync(`npx clasp push --project ${configPath}`, { stdio: 'inherit' });
console.log(`Instància '${tutorName}' actualitzada correctament.`);
