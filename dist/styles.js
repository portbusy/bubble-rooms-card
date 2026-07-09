import { areaEntities } from './area-entities.js';

export function buildRoomStyles(hass, entityId, areaId, excludeEntities, roomColor) {
  const attivo = hass.states[entityId] && hass.states[entityId].state === 'on';
  const trans = attivo
    ? 'background-color 0.45s ease, color 0.45s ease'
    : 'background-color 180s linear, color 180s linear';
  const cardBg = 'var(--bubble-main-background-color, var(--card-background-color, #fff))';
  const iconBg = 'var(--bubble-icon-background-color, var(--bubble-secondary-background-color, var(--card-background-color, #fff)))';
  const hasRoomColor = !!(roomColor && roomColor.color);
  const roomForeground = hasRoomColor
    ? (roomColor.foreground || '#ffffff')
    : null;
  const iconFg = hasRoomColor
    ? 'var(--bubble-room-foreground-color, #ffffff)'
    : (attivo ? 'var(--bubble-accent-color)' : 'var(--secondary-text-color)');
  const nameFg = hasRoomColor ? 'var(--bubble-room-foreground-color, #ffffff)' : 'var(--primary-text-color)';
  const stateFg = hasRoomColor
    ? 'var(--bubble-room-foreground-color, #ffffff)'
    : (attivo ? 'var(--bubble-accent-color)' : 'var(--secondary-text-color)');
  const roomColorVars = hasRoomColor
    ? (
      `  --bubble-room-color: ${roomColor.color};\n` +
      `  --bubble-room-foreground-color: ${roomForeground};\n` +
      '  --bubble-main-background-color: color-mix(in srgb, var(--bubble-room-color) 68%, var(--card-background-color, #fff));\n' +
      '  --bubble-icon-background-color: color-mix(in srgb, var(--bubble-room-color) 88%, var(--card-background-color, #fff));\n' +
      '  --bubble-accent-color: var(--bubble-room-foreground-color);\n'
    )
    : '';

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
    roomColorVars +
    `  background: ${cardBg} !important;\n` +
    '  border: var(--bubble-border, var(--ha-card-border-width, 1px) solid var(--divider-color, transparent)) !important;\n' +
    '  border-radius: var(--bubble-border-radius, var(--ha-card-border-radius, 12px)) !important;\n' +
    '  box-shadow: var(--bubble-box-shadow, var(--ha-card-box-shadow, none)) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    '.bubble-icon-container {\n' +
    `  background: ${iconBg} !important;\n` +
    '  border-radius: var(--bubble-icon-border-radius, var(--bubble-border-radius, 50%)) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    `.bubble-icon { color: ${iconFg} !important; transition: ${trans} !important; }\n` +
    `.bubble-name { color: ${nameFg} !important; font-weight: 600 !important; letter-spacing: -0.02em !important; }\n` +
    '.bubble-state, .bubble-last-changed {\n' +
    `  color: ${stateFg} !important; font-weight: 500 !important;\n` +
    `  transition: color ${attivo ? '0.45s' : '180s'} linear !important;\n` +
    '}\n' +
    '.bubble-sub-button {\n' +
    '  border-radius: var(--bubble-sub-button-border-radius, var(--bubble-border-radius, 999px)) !important;\n' +
    '}\n' +
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  ha-card, .bubble-icon-container, .bubble-icon, .bubble-state, .bubble-last-changed { transition: none !important; }\n' +
    '}\n'
  );

  return { css, bottomButtons };
}
