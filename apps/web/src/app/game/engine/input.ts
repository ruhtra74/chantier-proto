export type InputAction = 'forward' | 'backward' | 'left' | 'right';

/**
 * Touches par `event.key` : QWERTY (W/A/S/D), AZERTY (Z/Q/S/D) et flèches.
 * L'état est lu à chaque image par le VehicleController.
 */
const ACTION_KEYS: Record<InputAction, readonly string[]> = {
  forward: ['w', 'z', 'arrowup'],
  backward: ['s', 'arrowdown'],
  left: ['a', 'q', 'arrowleft'],
  right: ['d', 'arrowright'],
};

const GAME_KEYS = new Set(Object.values(ACTION_KEYS).flat());

export class KeyboardInput {
  private readonly pressed = new Set<string>();

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;

    const key = event.key.toLowerCase();

    if (event.repeat) {
      // La touche est déjà dans l'ensemble ; on bloque seulement le défilement.
      if (GAME_KEYS.has(key)) event.preventDefault();
      return;
    }

    if (key === 'i') {
      event.preventDefault();
      this.onToggleInspector();
      return;
    }

    if (key === 'r') {
      event.preventDefault();
      this.onRestart();
      return;
    }

    if (GAME_KEYS.has(key)) {
      event.preventDefault();
    }

    this.pressed.add(key);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.key.toLowerCase());
  };

  private readonly handleBlur = (): void => {
    this.pressed.clear();
  };

  constructor(
    private readonly onToggleInspector: () => void,
    private readonly onRestart: () => void = () => {},
  ) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  isDown(action: InputAction): boolean {
    return ACTION_KEYS[action].some((key) => this.pressed.has(key));
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.pressed.clear();
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
