import { areaEntities } from './area-entities.js';

const DEFAULT_COLOR = '#8f9bd8';
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
const ACTIVE_COVER_STATES = new Set(['open', 'opening', 'closing']);

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function safeCssColor(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /[;{}\n\r]/.test(trimmed)) return null;
  return trimmed;
}

function colorForRoom(areaId, name, index) {
  const candidates = [areaId, name].map(normalizeKey).filter(Boolean);
  const preset = ROOM_COLOR_PRESETS.find((entry) => (
    entry.keys.some((key) => candidates.some((candidate) => candidate.includes(key)))
  ));
  if (preset) return preset.color;

  const seed = candidates.join('|') || String(index);
  const hash = Array.from(seed).reduce((value, char) => (
    ((value << 5) - value + char.charCodeAt(0)) | 0
  ), 0);
  return FALLBACK_ROOM_COLORS[Math.abs(hash) % FALLBACK_ROOM_COLORS.length];
}

export function foregroundForColor(color) {
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

export function entityName(hass, entityId) {
  const state = hass.states[entityId];
  return (state && state.attributes && state.attributes.friendly_name) || entityId;
}

export function isActiveEntity(hass, entityId) {
  const state = hass.states[entityId];
  if (!state) return false;
  if (entityId.startsWith('light.')) return state.state === 'on';
  if (entityId.startsWith('cover.')) return ACTIVE_COVER_STATES.has(state.state);
  if (entityId.startsWith('binary_sensor.')) return state.state === 'on';
  return !['off', 'closed', 'unavailable', 'unknown'].includes(state.state);
}

export function relativeTime(value, now = Date.now()) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'ora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
}

export function sensorMetric(hass, entityId, icon, label) {
  const state = entityId && hass.states[entityId];
  if (!state || ['unknown', 'unavailable'].includes(state.state)) return null;
  const unit = state.attributes && state.attributes.unit_of_measurement;
  return {
    entityId,
    icon,
    label,
    value: `${state.state}${unit || ''}`
  };
}

function firstConfiguredEntity(roomConfig, keys) {
  return keys.map((key) => roomConfig[key]).find(Boolean) || null;
}

export function resolveRoomAction(roomConfig, key, fallback = { action: 'more-info' }) {
  const nestedKey = key.replace(/_tap_action$/, '');
  const tapActions = roomConfig.tap_actions || {};
  const explicit = roomConfig[key]
    || roomConfig[`${key}_action`]
    || tapActions[nestedKey]
    || tapActions[key];
  if (explicit && typeof explicit === 'object') return explicit;
  if (typeof explicit === 'string') return { action: explicit };

  const legacyAction = roomConfig.summary_action;
  if (key === 'summary_tap_action' && typeof legacyAction === 'string') {
    return {
      action: legacyAction,
      entity: roomConfig.summary_entity || roomConfig.summary_entity_id,
      navigation_path: roomConfig.summary_navigation_path || roomConfig.summary_navigate
    };
  }
  return fallback;
}

export function resolveNativeRoom(hass, roomConfig, index = 0) {
  const areaId = roomConfig.area || roomConfig.area_id || '';
  const area = areaId && hass.areas ? hass.areas[areaId] : null;
  const name = roomConfig.name || (area && area.name) || areaId || `Stanza ${index + 1}`;
  const autoEntities = roomConfig.auto_entities !== false;
  const lights = asArray(roomConfig.lights);
  const covers = asArray(roomConfig.covers);
  const excludedLights = new Set(asArray(roomConfig.excluded_lights));
  const excludedCovers = new Set(asArray(roomConfig.excluded_covers));
  const sensors = roomConfig.sensors || {};
  const resolvedLights = lights.length || !autoEntities
    ? lights
    : areaEntities(hass, areaId, 'light').filter((entityId) => !excludedLights.has(entityId));
  const resolvedCovers = covers.length || !autoEntities
    ? covers
    : areaEntities(hass, areaId, 'cover').filter((entityId) => !excludedCovers.has(entityId));
  const motion = roomConfig.motion || roomConfig.motion_sensor || roomConfig.presence || null;
  const windowEntity = roomConfig.window || roomConfig.window_sensor || roomConfig.opening_sensor || null;
  const automationEntity = firstConfiguredEntity(roomConfig, [
    'automation',
    'automation_control',
    'automation_entity'
  ]);
  const color = safeCssColor(roomConfig.color) || colorForRoom(areaId, name, index) || DEFAULT_COLOR;
  const foreground = safeCssColor(roomConfig.foreground) || foregroundForColor(color);
  const activeLights = resolvedLights.filter((entityId) => isActiveEntity(hass, entityId));
  const activeCovers = resolvedCovers.filter((entityId) => isActiveEntity(hass, entityId));
  const motionState = motion ? hass.states[motion] : null;
  const motionActive = motion ? isActiveEntity(hass, motion) : false;
  const windowActive = windowEntity ? isActiveEntity(hass, windowEntity) : false;
  const automationActive = automationEntity ? isActiveEntity(hass, automationEntity) : false;
  const statusEntity = automationEntity || motion;
  const statusActive = automationEntity ? automationActive : motionActive;
  const active = motionActive || activeLights.length > 0 || activeCovers.length > 0;
  const lightsSummaryEntity = firstConfiguredEntity(roomConfig, [
    'lights_summary_entity',
    'light_summary_entity',
    'lights_group',
    'light_group'
  ]);
  const coversSummaryEntity = firstConfiguredEntity(roomConfig, [
    'covers_summary_entity',
    'cover_summary_entity',
    'covers_group',
    'cover_group'
  ]);
  const summaryTapAction = resolveRoomAction(roomConfig, 'summary_tap_action');
  const navigate = roomConfig.navigate || roomConfig.navigation_path || roomConfig.path || null;
  const cardDefaultAction = navigate
    ? { action: 'navigate', navigation_path: navigate }
    : { action: 'more-info' };
  const metrics = [
    {
      key: 'temperature',
      metric: sensorMetric(hass, sensors.temperature || roomConfig.temperature, 'mdi:thermometer', 'Temperatura')
    },
    {
      key: 'humidity',
      metric: sensorMetric(hass, sensors.humidity || roomConfig.humidity, 'mdi:water-percent', 'Umidità')
    },
    {
      key: 'illuminance',
      metric: sensorMetric(hass, sensors.illuminance || roomConfig.illuminance, 'mdi:brightness-5', 'Luce')
    }
  ].flatMap(({ key, metric }) => (
    metric ? [{ ...metric, tapAction: resolveRoomAction(roomConfig, `${key}_tap_action`, summaryTapAction) }] : []
  ));

  return {
    areaId,
    name,
    icon: roomConfig.icon || (area && area.icon) || 'mdi:home',
    color,
    foreground,
    navigate,
    motion,
    motionActive,
    windowEntity,
    windowActive,
    automationEntity,
    automationActive,
    statusEntity,
    statusActive,
    active,
    cardTapAction: resolveRoomAction(roomConfig, 'card_tap_action', cardDefaultAction),
    statusTapAction: resolveRoomAction(
      roomConfig,
      'status_tap_action',
      automationEntity ? { action: 'toggle' } : summaryTapAction
    ),
    windowTapAction: resolveRoomAction(roomConfig, 'window_tap_action', summaryTapAction),
    lightsTapAction: resolveRoomAction(roomConfig, 'lights_tap_action', { action: 'toggle' }),
    coversTapAction: resolveRoomAction(roomConfig, 'covers_tap_action', { action: 'more-info' }),
    summaryTapAction,
    showLastChanged: roomConfig.show_last_changed !== false,
    lastChanged: motionState ? relativeTime(motionState.last_changed || motionState.last_updated) : '',
    lights: resolvedLights,
    covers: resolvedCovers,
    lightsSummaryEntity,
    coversSummaryEntity,
    metrics,
    activeLights,
    activeCovers
  };
}

export function resolveNativeRooms(hass, roomsConfig = []) {
  return asArray(roomsConfig).map((roomConfig, index) => resolveNativeRoom(hass, roomConfig || {}, index));
}
