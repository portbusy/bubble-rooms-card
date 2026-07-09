import { areaEntities } from './area-entities.js';

function activeCover(state) {
  return state && !['closed', 'closing', 'unavailable', 'unknown'].includes(state.state);
}

function buildSummaryButtons(hass, lights, covers, showSummary) {
  if (!showSummary) return [];

  const activeLights = lights.filter((entity) => hass.states[entity] && hass.states[entity].state === 'on');
  const activeCovers = covers.filter((entity) => activeCover(hass.states[entity]));
  const buttons = [];

  if (activeLights.length > 0) {
    buttons.push({
      name: `${activeLights.length} ${activeLights.length === 1 ? 'luce accesa' : 'luci accese'}`,
      icon: 'mdi:lightbulb-on',
      show_name: true,
      show_state: false,
      state_background: false,
      tap_action: { action: 'none' }
    });
  }

  if (activeCovers.length > 0) {
    buttons.push({
      name: `${activeCovers.length} ${activeCovers.length === 1 ? 'tapparella attiva' : 'tapparelle attive'}`,
      icon: 'mdi:window-shutter-open',
      show_name: true,
      show_state: false,
      state_background: false,
      tap_action: { action: 'none' }
    });
  }

  return buttons;
}

export function buildRoomStyles(hass, entityId, areaId, excludeEntities, roomColor, options = {}) {
  const design = ['hero', 'soft', 'minimal'].includes(options.design) ? options.design : 'hero';
  const attivo = hass.states[entityId] && hass.states[entityId].state === 'on';
  const trans = attivo
    ? 'background-color 0.45s ease, color 0.45s ease'
    : 'background-color 180s linear, color 180s linear';
  const cardBg = 'var(--bubble-room-card-background, var(--bubble-main-background-color, var(--card-background-color, #fff)))';
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
      '  --bubble-room-card-background: linear-gradient(180deg, color-mix(in srgb, var(--bubble-room-color) 82%, var(--card-background-color, #fff)) 0%, color-mix(in srgb, var(--bubble-room-color) 58%, var(--card-background-color, #fff)) 44%, color-mix(in srgb, var(--card-background-color, #fff) 92%, var(--bubble-room-color)) 44%, var(--card-background-color, #fff) 100%);\n' +
      '  --bubble-icon-background-color: color-mix(in srgb, var(--bubble-room-color) 74%, #ffffff);\n' +
      '  --bubble-accent-color: var(--bubble-room-foreground-color);\n'
    )
    : '';

  const excluded = new Set(excludeEntities || []);
  const lights = areaEntities(hass, areaId, 'light').filter((e) => !excluded.has(e));
  const covers = areaEntities(hass, areaId, 'cover').filter((e) => !excluded.has(e));
  const mainButtons = buildSummaryButtons(hass, lights, covers, options.showSummary !== false);

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
    `  --bubble-rooms-design: ${design};\n` +
    `  background: ${cardBg} !important;\n` +
    '  position: relative !important;\n' +
    '  border: var(--bubble-border, 1px solid color-mix(in srgb, var(--bubble-room-color, var(--divider-color, transparent)) 26%, transparent)) !important;\n' +
    `  border-radius: var(--bubble-border-radius, ${design === 'minimal' ? '20px' : '28px'}) !important;\n` +
    `  box-shadow: var(--bubble-box-shadow, ${design === 'minimal' ? '0 1px 5px rgba(15, 23, 42, 0.10)' : '0 18px 38px color-mix(in srgb, var(--bubble-room-color, #1f2937) 22%, transparent), 0 2px 7px rgba(15, 23, 42, 0.13)'}) !important;\n` +
    '  overflow: hidden !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    'ha-card::before {\n' +
    '  content: "";\n' +
    '  position: absolute;\n' +
    '  inset: 0;\n' +
    '  pointer-events: none;\n' +
    `  opacity: ${design === 'minimal' ? '0' : '1'};\n` +
    '  background: radial-gradient(circle at 88% 20%, color-mix(in srgb, var(--bubble-room-foreground-color, #ffffff) 18%, transparent) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.20), transparent 48%);\n' +
    '}\n' +
    '.bubble-icon-container {\n' +
    `  background: ${iconBg} !important;\n` +
    '  border-radius: var(--bubble-icon-border-radius, 20px) !important;\n' +
    '  box-shadow: 0 10px 24px color-mix(in srgb, var(--bubble-room-color, #64748b) 34%, transparent), inset 0 1px 0 rgba(255,255,255,0.35) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    `.bubble-icon { color: ${iconFg} !important; transition: ${trans} !important; }\n` +
    `.bubble-name { color: ${nameFg} !important; font-weight: 600 !important; letter-spacing: -0.02em !important; }\n` +
    '.bubble-state, .bubble-last-changed {\n' +
    `  color: ${stateFg} !important; font-weight: 500 !important;\n` +
    `  transition: color ${attivo ? '0.45s' : '180s'} linear !important;\n` +
    '}\n' +
    '.bubble-state {\n' +
    '  background: color-mix(in srgb, var(--bubble-room-foreground-color, var(--secondary-background-color, #f3f4f6)) 18%, transparent) !important;\n' +
    '  border-radius: 999px !important;\n' +
    '  padding: 0.18em 0.58em !important;\n' +
    '  display: inline-flex !important;\n' +
    '  width: fit-content !important;\n' +
    '}\n' +
    '.bubble-sub-button {\n' +
    `  border-radius: var(--bubble-sub-button-border-radius, ${design === 'minimal' ? '14px' : '18px'}) !important;\n` +
    '  font-weight: 650 !important;\n' +
    '  box-shadow: inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 18px rgba(15,23,42,0.10) !important;\n' +
    '}\n' +
    '.bubble-sub-button:not(.is-on) {\n' +
    '  background: color-mix(in srgb, var(--bubble-room-foreground-color, var(--secondary-background-color, #f3f4f6)) 18%, transparent) !important;\n' +
    '  color: color-mix(in srgb, var(--bubble-room-foreground-color, var(--primary-text-color)) 80%, var(--primary-text-color)) !important;\n' +
    '}\n' +
    '.bubble-last-changed {\n' +
    '  background: color-mix(in srgb, var(--bubble-room-foreground-color, var(--secondary-background-color, #f3f4f6)) 18%, transparent) !important;\n' +
    '  border-radius: 999px !important;\n' +
    '  padding: 0.34em 0.72em !important;\n' +
    '  display: inline-flex !important;\n' +
    '  width: fit-content !important;\n' +
    '}\n' +
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  ha-card, .bubble-icon-container, .bubble-icon, .bubble-state, .bubble-last-changed { transition: none !important; }\n' +
    '}\n'
  );

  return { css, bottomButtons, mainButtons };
}
