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

function foregroundForHex(color) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!match) return '#ffffff';

  const hex = match[1].length === 3
    ? match[1].split('').map((char) => char + char).join('')
    : match[1];
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
  return luminance > 0.58 ? '#1f2937' : '#ffffff';
}

const ROOM_COLOR_PRESETS = [
  { keys: ['sala', 'soggiorno', 'living'], color: '#b98270' },
  { keys: ['camera', 'letto', 'bedroom'], color: '#8f9bd8' },
  { keys: ['bagno', 'bathroom'], color: '#4f9d96' },
  { keys: ['cucina', 'kitchen'], color: '#d08a4b' },
  { keys: ['studio', 'office'], color: '#7d8cc4' },
  { keys: ['ingresso', 'entrance', 'hall'], color: '#8f9a72' },
  { keys: ['corridorio', 'corridoio', 'disimpegno'], color: '#8a7db2' }
];

const FALLBACK_ROOM_COLORS = [
  '#b98270',
  '#8f9bd8',
  '#4f9d96',
  '#d08a4b',
  '#7d8cc4',
  '#8f9a72',
  '#a16f8f'
];

function colorForRoom(entityId, areaId, name) {
  const candidates = [areaId, name, entityId].map(normalizeRoomColorKey).filter(Boolean);
  const preset = ROOM_COLOR_PRESETS.find((entry) => (
    entry.keys.some((key) => candidates.some((candidate) => candidate.includes(key)))
  ));
  if (preset) return preset.color;

  const seed = candidates.join('|') || entityId;
  const hash = Array.from(seed).reduce((value, char) => (
    ((value << 5) - value + char.charCodeAt(0)) | 0
  ), 0);
  return FALLBACK_ROOM_COLORS[Math.abs(hash) % FALLBACK_ROOM_COLORS.length];
}

export function resolveRoomColor(roomColors, entityId, areaId, name, colorMode = 'manual') {
  const resolvedColorMode = colorMode === true ? 'auto' : colorMode === false ? 'manual' : colorMode;
  const autoRoomColors = resolvedColorMode === 'auto';
  if (resolvedColorMode === 'off') return null;

  if (!roomColors || typeof roomColors !== 'object') {
    const autoColor = colorForRoom(entityId, areaId, name);
    return autoRoomColors ? { color: autoColor, foreground: foregroundForHex(autoColor) } : null;
  }

  const normalizedColors = new Map(
    Object.entries(roomColors).map(([key, value]) => [normalizeRoomColorKey(key), value])
  );
  const candidates = [entityId, areaId, name].map(normalizeRoomColorKey).filter(Boolean);
  const rawColor = candidates.map((candidate) => normalizedColors.get(candidate)).find(Boolean);
  if (!rawColor) {
    const autoColor = colorForRoom(entityId, areaId, name);
    return autoRoomColors ? { color: autoColor, foreground: foregroundForHex(autoColor) } : null;
  }

  const color = safeCssValue(typeof rawColor === 'string' ? rawColor : rawColor.color);
  if (!color) return null;

  const foreground = safeCssValue(
    typeof rawColor === 'object' && rawColor ? rawColor.foreground : undefined
  );
  return { color, foreground: foreground || foregroundForHex(color) };
}

export function resolveRoomLink(roomLinks, entityId, areaId, name) {
  if (!roomLinks || typeof roomLinks !== 'object') return null;

  const normalizedLinks = new Map(
    Object.entries(roomLinks).map(([key, value]) => [normalizeRoomColorKey(key), value])
  );
  const candidates = [entityId, areaId, name].map(normalizeRoomColorKey).filter(Boolean);
  const rawLink = candidates.map((candidate) => normalizedLinks.get(candidate)).find(Boolean);
  return safeCssValue(rawLink);
}

export function buildRoomConfig(hass, entityId, areaId, options) {
  const state = hass.states[entityId];
  const rawName = (state.attributes && state.attributes.friendly_name) || entityId;
  const name = capitalize(rawName.replace(options.namePrefix, ''));
  const colorMode = options.colorMode || (options.autoRoomColors ? 'auto' : 'manual');
  const roomColor = resolveRoomColor(
    options.roomColors,
    entityId,
    areaId,
    name,
    colorMode
  );
  const roomLink = resolveRoomLink(
    options.roomLinks,
    entityId,
    areaId,
    name
  );
  const { css, bottomButtons, mainButtons } = buildRoomStyles(
    hass,
    entityId,
    areaId,
    options.excludeEntities,
    roomColor,
    {
      design: options.design || 'hero',
      showSummary: options.showSummary !== false
    }
  );
  const tapAction = roomLink
    ? { action: 'navigate', navigation_path: roomLink }
    : { action: 'more-info' };

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
      tap_action: tapAction,
      hold_action: { action: 'more-info' }
    },
    styles: css,
    sub_button: {
      main: [
        { show_last_updated: true, show_state: false, show_icon: false, state_background: false },
        ...mainButtons
      ],
      bottom: bottomButtons,
      bottom_layout: 'inline'
    }
  };
}
