// src/sort-presets.js
export const SORT_PRESETS = {
  active_recent: {
    label: 'Attivo prima, poi più recente',
    steps: [
      { attribute: 'last_changed', reverse: true },
      { attribute: 'state', reverse: true }
    ]
  },
  recent: {
    label: 'Solo più recente',
    steps: [{ attribute: 'last_changed', reverse: true }]
  },
  active: {
    label: 'Solo stato (attivo prima)',
    steps: [{ attribute: 'state', reverse: true }]
  },
  none: {
    label: 'Nessuno (ordine alfabetico entity_id)',
    steps: []
  }
};

export function resolveSortSteps(config) {
  if (config.sort) return config.sort;
  const preset = SORT_PRESETS[config.sort_preset];
  return preset ? preset.steps : SORT_PRESETS.active_recent.steps;
}
