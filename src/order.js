export function computeOrder(hass, entityId) {
  const state = hass.states[entityId];
  if (!state) return Number.MAX_SAFE_INTEGER;
  const activeOffset = state.state === 'on' ? 0 : 1e15;
  const changedAt = new Date(state.last_changed).getTime();
  // Higher changedAt (more recent) must produce a lower order value.
  return activeOffset + (Number.MAX_SAFE_INTEGER - changedAt);
}
