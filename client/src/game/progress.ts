/**
 * M4 — Regles de gamificació amb les 5 Barretines, complements d'en Bit per Catalunya
 * i progrés per subnivells (RF-13..RF-16, Versió 0.3).
 */

import type {
  BarretinesCount,
  LevelConfig,
  LevelProgressRecord,
  SessionSummary,
} from '@contracts/domain';
import { computeBarretines } from '@client/core/engine';

export interface BadgeDefinition {
  id: string;
  titleCa: string;
  descriptionCa: string;
  iconSymbol: string;
}

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  badge_home_index: {
    id: 'badge_home_index',
    titleCa: 'Visor Estel·lar del Montsec',
    descriptionCa: "Has ajudat en Bit a aterrar al Montsec amb els dits índex (F i J)!",
    iconSymbol: '🔭',
  },
  badge_home_middle: {
    id: 'badge_home_middle',
    titleCa: 'Faixa Castellera de Vilafranca',
    descriptionCa: "Has fet pinya i aixecat el castell amb els dits del mig (D i K)!",
    iconSymbol: '🏰',
  },
  badge_home_ring: {
    id: 'badge_home_ring',
    titleCa: 'Espardenyes de la Sardana de Girona',
    descriptionCa: 'Has ballat la sardana al compàs amb els dits anulars (S i L)!',
    iconSymbol: '🎶',
  },
  badge_home_full: {
    id: 'badge_home_full',
    titleCa: "Barretina d'Honor de la Patum de Berga",
    descriptionCa: 'Ja domines tota la fila base amb els menovells (A i Ç)!',
    iconSymbol: '🔥',
  },
  badge_constancy_3: {
    id: 'badge_constancy_3',
    titleCa: 'Motxilla Carregada d’en Bit',
    descriptionCa: 'Has completat 3 pantalles seguint el teu propi ritme.',
    iconSymbol: '🤖',
  },
};

export interface ProgressApplicationResult {
  updatedLevelProgress: LevelProgressRecord;
  barretinesEarned: BarretinesCount;
  sublevelUnlockedNext: boolean;
  levelJustCompleted: boolean;
  newlyUnlockedLevelId?: string;
  newlyUnlockedBadges: BadgeDefinition[];
  encouragementMessageCa: string;
}

export function applySessionToProgress(
  session: SessionSummary,
  currentLevelConfig: LevelConfig,
  allLevels: LevelConfig[],
  previousRecord: LevelProgressRecord | undefined,
  totalSessionsCompletedBefore: number,
  alreadyUnlockedBadges: string[]
): ProgressApplicationResult {
  const studentId = previousRecord?.student_id ?? 'A01';
  const prev: LevelProgressRecord = previousRecord ?? {
    student_id: studentId,
    level_id: currentLevelConfig.id,
    status: 'unlocked',
    best_accuracy: 0,
    best_stars: 0,
    best_barretines: 0,
    sublevels_barretines: {},
    qualifying_sessions_count: 0,
    sessions_count: 0,
  };

  const barretinesEarned =
    session.barretines ??
    computeBarretines(
      session.accuracy,
      currentLevelConfig.passCriteria.barretinesThresholds,
      session.completed
    );

  const minBarretinesNeeded = currentLevelConfig.passCriteria.minBarretinesToUnlockNext ?? 3;
  const sublevelUnlockedNext = session.completed && barretinesEarned >= minBarretinesNeeded;

  const sublevelsMap: Record<string, BarretinesCount> = {
    ...(prev.sublevels_barretines ?? {}),
  };
  if (session.sublevel_id) {
    const prevSub = sublevelsMap[session.sublevel_id] ?? 0;
    sublevelsMap[session.sublevel_id] = Math.max(prevSub, barretinesEarned) as BarretinesCount;
  }

  const qualifies =
    session.completed &&
    (session.accuracy >= currentLevelConfig.passCriteria.minAccuracy ||
      barretinesEarned >= minBarretinesNeeded);

  const newQualifyingCount = prev.qualifying_sessions_count + (qualifies ? 1 : 0);
  const wasCompleted = prev.status === 'completed';

  // Es completa el nivell si supera les Sessions requerides o totes les 5 pantalles amb >= 3 Barretines
  const allFiveSublevelsPassed =
    currentLevelConfig.sublevels &&
    currentLevelConfig.sublevels.length > 0 &&
    currentLevelConfig.sublevels.every(
      (sub) => (sublevelsMap[sub.id] ?? 0) >= minBarretinesNeeded
    );

  const isNowCompleted =
    wasCompleted ||
    Boolean(allFiveSublevelsPassed) ||
    newQualifyingCount >= currentLevelConfig.passCriteria.requiredSessions;

  const levelJustCompleted = !wasCompleted && isNowCompleted;

  const updatedLevelProgress: LevelProgressRecord = {
    student_id: studentId,
    level_id: currentLevelConfig.id,
    status: isNowCompleted ? 'completed' : 'in_progress',
    best_accuracy: Math.max(prev.best_accuracy, session.accuracy),
    best_stars: Math.max(prev.best_stars, session.stars) as 0 | 1 | 2 | 3,
    best_barretines: Math.max(prev.best_barretines ?? 0, barretinesEarned) as BarretinesCount,
    sublevels_barretines: sublevelsMap,
    qualifying_sessions_count: newQualifyingCount,
    sessions_count: prev.sessions_count + 1,
    first_completed_at:
      prev.first_completed_at ?? (isNowCompleted ? session.started_at : undefined),
  };

  let newlyUnlockedLevelId: string | undefined;
  if (levelJustCompleted) {
    const nextLvl = allLevels.find((l) => l.order === currentLevelConfig.order + 1);
    if (nextLvl) {
      newlyUnlockedLevelId = nextLvl.id;
    }
  }

  const newlyUnlockedBadges: BadgeDefinition[] = [];
  const badgeSet = new Set(alreadyUnlockedBadges);

  if (
    isNowCompleted &&
    currentLevelConfig.unlockBadgeId &&
    !badgeSet.has(currentLevelConfig.unlockBadgeId)
  ) {
    const badge = BADGE_CATALOG[currentLevelConfig.unlockBadgeId];
    if (badge) {
      newlyUnlockedBadges.push(badge);
      badgeSet.add(badge.id);
    }
  }

  const newTotalSessions = totalSessionsCompletedBefore + (session.completed ? 1 : 0);
  if (newTotalSessions >= 3 && !badgeSet.has('badge_constancy_3')) {
    const badge = BADGE_CATALOG.badge_constancy_3;
    if (badge) {
      newlyUnlockedBadges.push(badge);
      badgeSet.add(badge.id);
    }
  }

  return {
    updatedLevelProgress,
    barretinesEarned,
    sublevelUnlockedNext,
    levelJustCompleted,
    newlyUnlockedLevelId,
    newlyUnlockedBadges,
    encouragementMessageCa: buildBarretinesMessage(barretinesEarned, levelJustCompleted),
  };
}

function buildBarretinesMessage(
  barretines: BarretinesCount,
  levelJustCompleted: boolean
): string {
  if (levelJustCompleted) {
    return `Brutal! Has guanyat ${barretines} Barretines, has completat la missió d'en Bit i has desbloquejat la següent parada de Catalunya!`;
  }
  if (barretines === 5) {
    return '5 Barretines! Perfecció absoluta! En Bit té els circuits al 100% i ja pots passar a la pantalla següent!';
  }
  if (barretines >= 3) {
    return `Molt bé! Has aconseguit ${barretines} Barretines i ja tens desbloquejada la pantalla següent (o pots repetir per buscar les 5 Barretines!).`;
  }
  return `Has aconseguit ${barretines} Barretina. Necessites 3 Barretines (88% de precisió) per avançar. Anem sense pressa, tu pots!`;
}
