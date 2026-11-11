import type { EngineEvent } from '@chantier/domain';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { KeyboardInput } from './input';

/** Vitesses en mètres par seconde, rotation en radians par seconde. */
const MAX_FORWARD_SPEED = 8;
const MAX_REVERSE_SPEED = 3;
const ACCELERATION = 12;
const BRAKING = 20;
const TURN_RATE = 1.6;
/** Regroupement des événements MOVED pour limiter la taille du journal. */
const MOVED_BATCH_MS = 100;
const MIN_MOVED_DISTANCE = 0.001;

/**
 * Pilotage de l'engin sans physique : vitesse linéaire dans son cap et vitesse angulaire
 * fixées à chaque image. La distance réellement parcourue est émise par lots de 100 ms
 * sous forme d'événements `MOVED`, prêts pour le GameController.
 */
export class VehicleController {
  private speed = 0;
  private enabled = true;
  private pendingDistance = 0;
  private elapsedMs = 0;

  constructor(
    private readonly root: TransformNode,
    private readonly input: KeyboardInput,
    private readonly onEvent: (event: EngineEvent) => void,
  ) {}

  /** Vitesse signée actuelle, en m/s (négative en marche arrière). */
  get currentSpeed(): number {
    return this.speed;
  }

  update(deltaSeconds: number): void {
    if (!this.enabled) return;

    const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);

    const turn = (this.input.isDown('right') ? 1 : 0) - (this.input.isDown('left') ? 1 : 0);
    if (turn !== 0) {
      this.root.rotation.y += turn * TURN_RATE * dt;
    }

    const forward = this.input.isDown('forward');
    const backward = this.input.isDown('backward');
    const targetSpeed = forward ? MAX_FORWARD_SPEED : backward ? -MAX_REVERSE_SPEED : 0;
    const rate = forward || backward ? ACCELERATION : BRAKING;
    this.speed = moveTowards(this.speed, targetSpeed, rate * dt);

    const previousX = this.root.position.x;
    const previousZ = this.root.position.z;
    const heading = this.root.rotation.y;
    this.root.position.x += Math.sin(heading) * this.speed * dt;
    this.root.position.z += Math.cos(heading) * this.speed * dt;

    // Distance du plan au sol, mesurée entre deux positions : elle reste juste même si
    // une autre couche déplace l'engin plus tard (physique, collision).
    this.pendingDistance += Math.hypot(
      this.root.position.x - previousX,
      this.root.position.z - previousZ,
    );

    this.elapsedMs += dt * 1000;
    if (this.elapsedMs >= MOVED_BATCH_MS) {
      this.elapsedMs -= MOVED_BATCH_MS;
      this.flushMoved();
    } else if (this.speed === 0) {
      // Ne pas perdre le reliquat quand le joueur relâche les touches.
      this.flushMoved();
    }
  }

  /** Émet immédiatement la distance en attente (fin de partie, arrêt, destruction). */
  flushMoved(): void {
    if (this.pendingDistance < MIN_MOVED_DISTANCE) {
      this.pendingDistance = 0;
      return;
    }

    this.onEvent({ type: 'MOVED', distance: this.pendingDistance });
    this.pendingDistance = 0;
    this.elapsedMs = 0;
  }

  /** Coupe les commandes et arrête l'engin (commande END, étape 6). */
  disable(): void {
    this.enabled = false;
    this.speed = 0;
    this.flushMoved();
  }

  /** Réactive les commandes après un redémarrage. */
  enable(): void {
    this.enabled = true;
  }
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
