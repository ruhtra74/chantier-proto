import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SessionSyncService } from './api/session-sync.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    // Au chargement : renvoie les sessions restées en attente lors d'une visite précédente.
    provideAppInitializer(() => {
      void inject(SessionSyncService).flush();
    }),
  ],
};
