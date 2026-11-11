export type InputAction = 'forward' | 'backward' | 'left' | 'right';

/**
 * Touches par `event.key` : QWERTY (W/A/S/D), AZERTY (Z/Q/S/D) et flèches.
 * L'étape 4 lira `isDown()` à chaque image ; l'étape 3 ne l'utilise que pour l'inspecteur.
 */
const ACTION_KEYS: Record<InputAction, readonly string[]> = {
  forward: ['w', 'z', 'arrowup'],
  backward: ['s', 'arrowdown'],
  left: ['a', 'q', 'arrowleft'],
  right: ['d', 'arrowright'],
};

export class KeyboardInput {
  private readonly pressed = new Set<string>();

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (key === 'i') {
      event.preventDefault();
      this.onToggleInspector();
      return;
    }

    this.pressed.add(key);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.key.toLowerCase());
  };

  private readonly handleBlur = (): void => {
    this.pressed.clear();
  };

  constructor(private readonly onToggleInspector: () => void) {
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
