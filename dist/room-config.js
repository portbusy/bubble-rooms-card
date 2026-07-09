import { buildRoomStyles } from './styles.js';

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeRoomColorKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function safeCssValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /[;{}\n\r]/.test(trimmed)) return null;
  return trimmed;
}

export function resolveRoomColor(roomColors, entityId, areaId, name) {
  if (!roomColors || typeof roomColors !== 'object') return null;

  const normalizedColors = new Map(
    Object.entries(roomColors).map(([key, value]) => [normalizeRoomColorKey(key), value])
  );
  const candidates = [entityId, areaId, name].map(normalizeRoomColorKey).filter(Boolean);
  const rawColor = candidates.map((candidate) => normalizedColors.get(candidate)).find(Boolean);
  if (!rawColor) return null;

  const color = safeCssValue(typeof rawColor === 'string' ? rawColor : rawColor.color);
  if (!color) return null;

  const foreground = safeCssValue(
    typeof rawColor === 'object' && rawColor ? rawColor.foreground : undefined
  );
  return foreground ? { color, foreground } : { color };
}

export function buildRoomConfig(hass, entityId, areaId, options) {
  const state = hass.states[entityId];
  const rawName = (state.attributes && state.attributes.friendly_name) || entityId;
  const name = capitalize(rawName.replace(options.namePrefix, ''));
  const roomColor = resolveRoomColor(options.roomColors, entityId, areaId, name);
  const { css, bottomButtons } = buildRoomStyles(
    hass,
    entityId,
    areaId,
    options.excludeEntities,
    roomColor
  );

  return {
    type: 'custom:bubble-card',
    card_type: 'button',
    button_type: 'state',
    card_layout: 'large',
    rows: 2,
    icon: state.attributes && state.attributes.icon,
    entity: entityId,
    name,
    show_state: true,
    button_action: {
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' }
    },
    styles: css,
    sub_button: {
      main: [
        { show_last_updated: true, show_state: false, show_icon: false, state_background: false }
      ],
      bottom: bottomButtons,
      bottom_layout: 'inline'
    }
  };
}
