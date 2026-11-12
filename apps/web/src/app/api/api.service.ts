import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  scenarioSchema,
  sessionCreatedSchema,
  sessionDetailSchema,
  sessionListSchema,
} from '@chantier/domain';
import type {
  Scenario,
  SessionCreated,
  SessionDetail,
  SessionSubmission,
  SessionSummary,
} from '@chantier/domain';
import { type Observable, TimeoutError, firstValueFrom, timeout } from 'rxjs';

/** Délai au-delà duquel l'API est considérée comme injoignable. */
const REQUEST_TIMEOUT_MS = 4000;

/**
 * - `unreachable` : réseau coupé, délai dépassé ou erreur 5xx : on peut réessayer plus tard ;
 * - `rejected` : erreur 4xx, la requête ne passera jamais telle quelle ;
 * - `invalid-response` : la réponse ne respecte pas le contrat Zod du paquet `domain`.
 */
export type ApiErrorKind = 'unreachable' | 'rejected' | 'invalid-response';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Schéma minimal attendu : tous les schémas Zod du paquet `domain` le respectent. */
type ResponseSchema<T> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: Error };
};

/**
 * Accès à l'API NestJS (`/api`, relayé par le proxy de développement d'Angular).
 * Toutes les réponses sont validées avec les schémas Zod du paquet `domain`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getScenario(id: string): Promise<Scenario> {
    return this.call(this.http.get(`/api/scenarios/${encodeURIComponent(id)}`), scenarioSchema);
  }

  submitSession(submission: SessionSubmission): Promise<SessionCreated> {
    return this.call(this.http.post('/api/sessions', submission), sessionCreatedSchema);
  }

  listSessions(): Promise<SessionSummary[]> {
    return this.call(this.http.get('/api/sessions'), sessionListSchema);
  }

  getSession(id: string): Promise<SessionDetail> {
    return this.call(this.http.get(`/api/sessions/${encodeURIComponent(id)}`), sessionDetailSchema);
  }

  private async call<T>(request: Observable<unknown>, schema: ResponseSchema<T>): Promise<T> {
    let body: unknown;
    try {
      body = await firstValueFrom(request.pipe(timeout(REQUEST_TIMEOUT_MS)));
    } catch (error: unknown) {
      throw toApiError(error);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        'invalid-response',
        `Réponse inattendue de l'API : ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof TimeoutError) {
    return new ApiError('unreachable', "L'API ne répond pas.");
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0 || error.status >= 500) {
      return new ApiError('unreachable', "L'API est injoignable.", error.status);
    }
    return new ApiError('rejected', describeRejection(error), error.status);
  }
  return new ApiError('unreachable', error instanceof Error ? error.message : String(error));
}

/** Message renvoyé par NestJS (`message` texte ou liste), sinon le statut HTTP. */
function describeRejection(error: HttpErrorResponse): string {
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return `Requête refusée (HTTP ${error.status}).`;
}
