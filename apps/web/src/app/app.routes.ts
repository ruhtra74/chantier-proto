import { Routes } from '@angular/router';
import { GameCanvasComponent } from './game/game-canvas.component';
import { EndScreenComponent } from './screens/end-screen.component';
import { HistoryScreenComponent } from './screens/history-screen.component';
import { StartScreenComponent } from './screens/start-screen.component';

export const routes: Routes = [
  { path: '', component: StartScreenComponent },
  { path: 'jeu', component: GameCanvasComponent },
  { path: 'fin', component: EndScreenComponent },
  { path: 'historique', component: HistoryScreenComponent },
  { path: '**', redirectTo: '' },
];
