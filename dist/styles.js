import { areaEntities } from './area-entities.js';

export function buildRoomStyles(hass, entityId, areaId, excludeEntities) {
  const attivo = hass.states[entityId] && hass.states[entityId].state === 'on';
  const trans = attivo
    ? 'background-color 0.45s ease, color 0.45s ease'
    : 'background-color 180s linear, color 180s linear';
  const cardBg = attivo ? 'rgba(135,145,203,0.19)' : 'rgba(255,255,255,0.4)';
  const iconBg = attivo ? '#8791CB' : 'rgba(255,255,255,0.55)';
  const iconFg = attivo ? '#ffffff' : '#6A7078';
  const stateFg = attivo ? '#565F93' : '#7A808A';

  const excluded = new Set(excludeEntities || []);
  const lights = areaEntities(hass, areaId, 'light').filter((e) => !excluded.has(e));
  const covers = areaEntities(hass, areaId, 'cover').filter((e) => !excluded.has(e));

  const bottomButtons = [];
  let subButtonCss = '';
  let idx = 1; // slot 1 is reserved for the card's own "main" sub-button

  for (const light of lights) {
    idx += 1;
    const on = hass.states[light] && hass.states[light].state === 'on';
    const bg = on ? 'rgba(200,170,120,0.28)' : 'rgba(255,255,255,0.42)';
    const fg = on ? '#7E6438' : '#6A7078';
    subButtonCss += `.bubble-sub-button-${idx}{background:${bg} !important;color:${fg} !important;}`;
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
    idx += 1;
    subButtonCss += `.bubble-sub-button-${idx}{background:rgba(120,140,162,0.22) !important;color:#4C6078 !important;}`;
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
    '.bubble-name { color: #23262B !important; font-weight: 600 !important; letter-spacing: -0.02em !important; }\n' +
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
    subButtonCss +
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  ha-card, .bubble-icon-container, .bubble-icon, .bubble-state, .bubble-last-changed { transition: none !important; }\n' +
    '}\n'
  );

  return { css, bottomButtons };
}
