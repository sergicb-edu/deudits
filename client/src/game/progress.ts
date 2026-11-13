/**
 * M4 — Regles de gamificació, progrés, insígnies i missatges positius (RF-13..RF-16, Ap. 10).
 * Lògica pura sense dependència del DOM.
 */

import type {
  LevelConfig,
  LevelProgressRecord,
  SessionSummary,
} from '@contracts/domain';

export interface BadgeDefinition {
  id: string;
  titleCa: string;
  descriptionCa: string;
  iconSymbol: string;
}

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  badge_home_index: {
    id: 'badge_home_index',
    titleCa: 'Índexs a lloc!',
    descriptionCa: 'Has dominat les tecles guia F i J amb totes dues mans.',
    iconSymbol: '🧭',
  },
  badge_home_middle: {
    id: 'badge_home_middle',
    titleCa: 'Equilibri al mig',
    descriptionCa: 'Coordines els dits índex i cor amb precisió.',
    iconSymbol: '🌱',
  },
  badge_home_ring: {
    id: 'badge_home_ring',
    titleCa: 'Mans completes',
    descriptionCa: 'Ja domines sis tecles de la fila base.',
    iconSymbol: '⭐',
  },
  badge_constancy_3: {
    id: 'badge_constancy_3',
    titleCa: 'Constància en marxa',
    descriptionCa: 'Has completat 3 exercicis seguint el teu ritme.',
    iconSymbol: '🚀',
  },
};

export interface ProgressApplicationResult {
  updatedLevelProgress: LevelProgressRecord;
  levelJustCompleted: boolean;
  newlyUnlockedLevelId?: string;
  newlyUnlockedBadges: BadgeDefinition[];
  encouragementMessageCa: string;
}

/**
 * Aplica el resultat d'una sessió (SessionSummary) a l'estat de progrés d'un alumne (M4).
 */
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
    qualifying_sessions_count: 0,
    sessions_count: 0,
  };

  const qualifies =
    session.completed && session.accuracy >= currentLevelConfig.passCriteria.minAccuracy;
  const newQualifyingCount = prev.qualifying_sessions_count + (qualifies ? 1 : 0);
  const wasCompleted = prev.status === 'completed';
  const isNowCompleted =
    wasCompleted || newQualifyingCount >= currentLevelConfig.passCriteria.requiredSessions;
  const levelJustCompleted = !wasCompleted && isNowCompleted;

  const updatedLevelProgress: LevelProgressRecord = {
    student_id: studentId,
    level_id: currentLevelConfig.id,
    status: isNowCompleted ? 'completed' : 'in_progress',
    best_accuracy: Math.max(prev.best_accuracy, session.accuracy),
    best_stars: Math.max(prev.best_stars, session.stars) as 0 | 1 | 2 | 3,
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
    levelJustCompleted,
    newlyUnlockedLevelId,
    newlyUnlockedBadges,
    encouragementMessageCa: buildPositiveMessage(
      session.accuracy,
      levelJustCompleted,
      newQualifyingCount,
      currentLevelConfig.passCriteria.requiredSessions
    ),
  };
}

function buildPositiveMessage(
  accuracy: number,
  levelJustCompleted: boolean,
  qualifyingCount: number,
  requiredSessions: number
): string {
  if (levelJustCompleted) {
    return 'Fantàstic! Has completat aquest nivell amb molta precisió i ja tens el següent disponible!';
  }
  if (accuracy >= 0.95) {
    const remaining = Math.max(0, requiredSessions - qualifyingCount);
    return remaining > 0
      ? `Excel·lent precisió (${Math.round(accuracy * 100)}%)! Et falten ${remaining} sessions com aquesta per superar el nivell.`
      : `Excel·lent precisió (${Math.round(accuracy * 100)}%)! Continua així!`;
  }
  if (accuracy >= 0.85) {
    return `Molt bon treball (${Math.round(accuracy * 100)}%)! Anant a poc a poc aconseguiràs encara més precisió.`;
  }
  return 'Bon esforç! Recorda mirar la pantalla i deixar que els dits trobin el seu lloc sense pressa.';
}
