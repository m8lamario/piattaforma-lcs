const listeners = new Set<() => void>();

export function representativeFlowKey(teamId: string) {
  return `eph-rep-flow:${teamId}`;
}

export function subscribeRepresentativeFlow(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function emitRepresentativeFlow() {
  for (const listener of listeners) listener();
}

export function readRepresentativeFlowOpen(teamId: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(representativeFlowKey(teamId)) === "open";
  } catch {
    return false;
  }
}

export function writeRepresentativeFlow(teamId: string, state: "open" | "paused") {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(representativeFlowKey(teamId), state);
    emitRepresentativeFlow();
  } catch {
    return;
  }
}
