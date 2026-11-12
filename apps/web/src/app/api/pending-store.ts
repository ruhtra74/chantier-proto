import { sessionSubmissionSchema, type SessionSubmission } from '@chantier/domain';

/** Session terminée pas encore acceptée par l'API. */
export type PendingSession = {
  localId: string;
  savedAt: string;
  submission: SessionSubmission;
};

const STORAGE_KEY = 'chantier.sessions-en-attente';

/**
 * Persistance des sessions non envoyées dans `localStorage`. Les erreurs de stockage (mode privé,
 * quota) sont journalisées sans interrompre la partie : la session reste alors seulement en mémoire.
 */
export function readPendingSessions(): PendingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPendingSession) : [];
  } catch (error: unknown) {
    console.warn('Lecture des sessions en attente impossible', error);
    return [];
  }
}

export function writePendingSessions(sessions: readonly PendingSession[]): void {
  try {
    if (sessions.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error: unknown) {
    console.warn('Enregistrement des sessions en attente impossible', error);
  }
}

/** Ignore les entrées corrompues ou écrites par une version antérieure du format. */
function isPendingSession(value: unknown): value is PendingSession {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PendingSession>;
  return (
    typeof item.localId === 'string' &&
    typeof item.savedAt === 'string' &&
    sessionSubmissionSchema.safeParse(item.submission).success
  );
}
