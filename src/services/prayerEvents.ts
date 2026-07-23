type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribePrayerCompleted(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitPrayerCompleted() {
  listeners.forEach((listener) => listener());
}
