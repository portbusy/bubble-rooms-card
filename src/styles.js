// src/styles.js
import { areaEntities } from './area-entities.js';

export function buildRoomStyles(hass, entityId, areaId, excludeEntities) {
  const attivo = hass.states[entityId] && hass.states[entityId].state === 'on';
  const trans = attivo
    ? 'background-color 0.45s ease, color 0.45s ease'
    : 'background-color 180s linear, color 180s linear';
  const cardBg = attivo
    ? 'color-mix(in srgb, var(--bubble-main-background-color) 20%, transparent)'
    : 'color-mix(in srgb, var(--card-background-color, #fff) 40%, transparent)';
  const iconBg = attivo
    ? 'var(--bubble-icon-background-color)'
    : 'color-mix(in srgb, var(--card-background-color, #fff) 55%, transparent)';
  const iconFg = attivo ? '#ffffff' : 'var(--secondary-text-color)';
  const stateFg = attivo ? 'var(--bubble-accent-color)' : 'var(--secondary-text-color)';

  const excluded = new Set(excludeEntities || []);
  const lights = areaEntities(hass, areaId, 'light').filter((e) => !excluded.has(e));
  const covers = areaEntities(hass, areaId, 'cover').filter((e) => !excluded.has(e));

  const bottomButtons = [];
  for (const light of lights) {
    bottomButtons.push({
      entity: light,
      state_background: true,
      show_name: true,
      show_state: false,
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' }
    });
  }
  for (const cover of covers) {
    bottomButtons.push({
      entity: cover,
      state_background: true,
      show_name: true,
      show_state: false,
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' }
    });
  }

  const css = (
    'ha-card {\n' +
    `  background: ${cardBg} !important;\n` +
    '  -webkit-backdrop-filter: blur(20px) saturate(1.7); backdrop-filter: blur(20px) saturate(1.7);\n' +
    '  border: 0.5px solid rgba(255,255,255,0.55) !important;\n' +
    '  border-radius: 28px !important;\n' +
    '  box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 10px 30px rgba(40,55,90,0.13), 0 1px 3px rgba(0,0,0,0.05) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    '.bubble-icon-container {\n' +
    `  background: ${iconBg} !important;\n` +
    '  box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.7), 0 2px 6px rgba(60,70,90,0.12) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    `.bubble-icon { color: ${iconFg} !important; transition: ${trans} !important; }\n` +
    '.bubble-name { color: var(--primary-text-color) !important; font-weight: 600 !important; letter-spacing: -0.02em !important; }\n' +
    '.bubble-state, .bubble-last-changed {\n' +
    `  color: ${stateFg} !important; font-weight: 500 !important;\n` +
    `  transition: color ${attivo ? '0.45s' : '180s'} linear !important;\n` +
    '}\n' +
    '.bubble-sub-button {\n' +
    '  border-radius: 999px !important;\n' +
    '  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);\n' +
    '  border: 0.5px solid rgba(255,255,255,0.5) !important;\n' +
    '  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6) !important;\n' +
    '}\n' +
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  ha-card, .bubble-icon-container, .bubble-icon, .bubble-state, .bubble-last-changed { transition: none !important; }\n' +
    '}\n'
  );

  return { css, bottomButtons };
}
