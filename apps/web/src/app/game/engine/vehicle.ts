import type { EngineEvent } from '@chantier/domain';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import {
  PhysicsEventType,
  type IPhysicsCollisionEvent,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import type { KeyboardInput } from './input';
import { coneIdOf } from './load-assets';
import { headingOf } from './transform';

/** Vitesses en mètres par seconde, rotation en radians par seconde. */
const MAX_FORWARD_SPEED = 8;
const MAX_REVERSE_SPEED = 3;
const ACCELERATION = 12;
const BRAKING = 20;
const TURN_RATE = 1.6;
/** Regroupement des événements MOVED pour limiter la taille du journal. */
const MOVED_BATCH_MS = 100;
const MIN_MOVED_DISTANCE = 0.001;

export type ArrivalZone = {
  x: number;
  z: number;
  radius: number;
};

/**
 * Pilotage de l'engin par la physique : à chaque image, on fixe la vitesse linéaire dans le cap
 * et la vitesse angulaire autour de l'axe vertical. Havok s'occupe des contacts (sol, cônes), ce
 * qui permet de détecter les collisions et de faire réagir les cônes.
 *
 * La distance est mesurée entre deux positions successives, donc elle reste juste même quand la
 * physique corrige le déplacement. Elle est émise par lots de 100 ms sous forme de `MOVED`.
 */
export class VehicleController {
  private speed = 0;
  private enabled = true;
  private pendingDistance = 0;
  private elapsedMs = 0;
  private arrivalEmitted = false;
  private previousX: number;
  private previousZ: number;
  private readonly hitCones = new Set<string>();
  private readonly collisionObserver;

  constructor(
    private readonly root: TransformNode,
    private readonly body: PhysicsBody,
    private readonly input: KeyboardInput,
    private readonly onEvent: (event: EngineEvent) => void,
    private readonly arrival: ArrivalZone,
  ) {
    this.previousX = root.position.x;
    this.previousZ = root.position.z;
    this.collisionObserver = body
      .getCollisionObservable()
      .add((event) => this.handleCollision(event));
  }

  /** Vitesse signée actuelle, en m/s (négative en marche arrière). */
  get currentSpeed(): number {
    return this.speed;
  }

  /** Identifiants des cônes déjà signalés (un seul `CONE_HIT` par cône). */
  get hitConeIds(): readonly string[] {
    return [...this.hitCones];
  }

  update(deltaSeconds: number): void {
    if (!this.enabled) return;

    const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);

    const turn = (this.input.isDown('right') ? 1 : 0) - (this.input.isDown('left') ? 1 : 0);
    const forward = this.input.isDown('forward');
    const backward = this.input.isDown('backward');
    const targetSpeed = forward ? MAX_FORWARD_SPEED : backward ? -MAX_REVERSE_SPEED : 0;
    const rate = forward || backward ? ACCELERATION : BRAKING;
    this.speed = moveTowards(this.speed, targetSpeed, rate * dt);

    const heading = headingOf(this.root);
    const velocity = this.body.getLinearVelocity();
    velocity.x = Math.sin(heading) * this.speed;
    velocity.z = Math.cos(heading) * this.speed;
    this.body.setLinearVelocity(velocity);
    this.body.setAngularVelocity(new Vector3(0, turn * TURN_RATE, 0));

    this.pendingDistance += Math.hypot(
      this.root.position.x - this.previousX,
      this.root.position.z - this.previousZ,
    );
    this.previousX = this.root.position.x;
    this.previousZ = this.root.position.z;

    this.elapsedMs += dt * 1000;
    if (this.elapsedMs >= MOVED_BATCH_MS) {
      this.elapsedMs -= MOVED_BATCH_MS;
      this.flushMoved();
    } else if (this.speed === 0) {
      // Ne pas perdre le reliquat quand le joueur relâche les touches.
      this.flushMoved();
    }

    this.checkArrival();
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
    this.body.setLinearVelocity(Vector3.Zero());
    this.body.setAngularVelocity(Vector3.Zero());
    this.flushMoved();
  }

  /** Réactive les commandes après un redémarrage. */
  enable(): void {
    this.enabled = true;
  }

  dispose(): void {
    this.body.getCollisionObservable().remove(this.collisionObserver);
    this.hitCones.clear();
  }

  private handleCollision(event: IPhysicsCollisionEvent): void {
    if (event.type !== PhysicsEventType.COLLISION_STARTED) return;

    const other = event.collider === this.body ? event.collidedAgainst : event.collider;
    const coneId = other.transformNode ? coneIdOf(other.transformNode) : undefined;
    if (!coneId || this.hitCones.has(coneId)) return;

    this.hitCones.add(coneId);
    this.onEvent({ type: 'CONE_HIT', id: coneId });
  }

  private checkArrival(): void {
    if (this.arrivalEmitted) return;

    const distance = Math.hypot(
      this.root.position.x - this.arrival.x,
      this.root.position.z - this.arrival.z,
    );
    if (distance > this.arrival.radius) return;

    this.arrivalEmitted = true;
    this.onEvent({ type: 'REACHED_TARGET' });
  }
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
