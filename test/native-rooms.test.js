import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  foregroundForColor,
  isActiveEntity,
  relativeTime,
  resolveRoomAction,
  resolveNativeRoom
} from '../src/native-rooms.js';

const hass = {
  areas: {
    sala: { name: 'Sala', icon: 'mdi:sofa' }
  },
  entities: {
    'light.sala_madia': { area_id: 'sala' },
    'light.sala_tavolo': { area_id: 'sala' },
    'cover.tapparella_sala': { area_id: 'sala' }
  },
  devices: {},
  states: {
    'binary_sensor.sala_motion': {
      state: 'on',
      last_changed: '2026-07-09T10:00:00.000Z',
      attributes: { friendly_name: 'Movimento sala' }
    },
    'light.sala_madia': {
      state: 'on',
      attributes: { friendly_name: 'Luce madia' }
    },
    'light.sala_tavolo': {
      state: 'off',
      attributes: { friendly_name: 'Luce tavolo' }
    },
    'light.luci_sala': {
      state: 'on',
      attributes: { friendly_name: 'Luci sala' }
    },
    'cover.tapparella_sala': {
      state: 'open',
      attributes: { friendly_name: 'Tapparella sala' }
    },
    'sensor.sala_temperatura': {
      state: '21.4',
      attributes: { unit_of_measurement: '°C' }
    },
    'sensor.sala_umidita': {
      state: '42',
      attributes: { unit_of_measurement: '%' }
    }
  }
};

test('resolveNativeRoom uses native area data and auto-discovers area entities', () => {
  const room = resolveNativeRoom(hass, {
    area: 'sala',
    motion: 'binary_sensor.sala_motion',
    temperature: 'sensor.sala_temperatura',
    humidity: 'sensor.sala_umidita'
  });

  assert.equal(room.name, 'Sala');
  assert.equal(room.icon, 'mdi:sofa');
  assert.equal(room.motionActive, true);
  assert.equal(room.active, true);
  assert.deepEqual(room.summaryTapAction, { action: 'more-info' });
  assert.deepEqual(room.lights, ['light.sala_madia', 'light.sala_tavolo']);
  assert.deepEqual(room.covers, ['cover.tapparella_sala']);
  assert.deepEqual(room.activeLights, ['light.sala_madia']);
  assert.deepEqual(room.activeCovers, ['cover.tapparella_sala']);
  assert.deepEqual(room.metrics.map((metric) => metric.value), ['21.4°C', '42%']);
});

test('resolveNativeRoom supports grouped summary entities for aggregate chips', () => {
  const room = resolveNativeRoom(hass, {
    area: 'sala',
    lights: ['light.sala_madia', 'light.sala_tavolo'],
    covers: ['cover.tapparella_sala'],
    lights_summary_entity: 'light.luci_sala',
    covers_summary_entity: 'group.tapparelle_sala'
  });

  assert.equal(room.lightsSummaryEntity, 'light.luci_sala');
  assert.equal(room.coversSummaryEntity, 'group.tapparelle_sala');
  assert.deepEqual(room.activeLights, ['light.sala_madia']);
  assert.deepEqual(room.activeCovers, ['cover.tapparella_sala']);
});

test('summary action supports simple form fields and advanced tap action objects', () => {
  assert.deepEqual(
    resolveRoomAction({
      summary_action: 'navigate',
      summary_navigation_path: '#sala'
    }, 'summary_tap_action'),
    { action: 'navigate', entity: undefined, navigation_path: '#sala' }
  );
  assert.deepEqual(
    resolveRoomAction({
      summary_tap_action: { action: 'toggle', entity_id: 'light.sala_madia' }
    }, 'summary_tap_action'),
    { action: 'toggle', entity_id: 'light.sala_madia' }
  );
});

test('resolveNativeRoom supports explicit entities, custom color, and disabled auto discovery', () => {
  const room = resolveNativeRoom(hass, {
    name: 'Relax',
    area: 'sala',
    auto_entities: false,
    lights: ['light.sala_tavolo'],
    covers: [],
    color: '#f5d67a',
    foreground: '#1f2937'
  });

  assert.equal(room.name, 'Relax');
  assert.deepEqual(room.lights, ['light.sala_tavolo']);
  assert.deepEqual(room.covers, []);
  assert.equal(room.color, '#f5d67a');
  assert.equal(room.foreground, '#1f2937');
  assert.equal(room.motionActive, false);
  assert.equal(room.active, false);
});

test('a room is active when devices are active even without motion', () => {
  const room = resolveNativeRoom(hass, {
    name: 'Media',
    area: 'sala',
    auto_entities: false,
    lights: ['light.sala_madia']
  });

  assert.equal(room.motionActive, false);
  assert.equal(room.active, true);
});

test('active state and relative time helpers match Home Assistant room semantics', () => {
  assert.equal(isActiveEntity(hass, 'light.sala_madia'), true);
  assert.equal(isActiveEntity(hass, 'light.sala_tavolo'), false);
  assert.equal(isActiveEntity(hass, 'cover.tapparella_sala'), true);
  assert.equal(relativeTime('2026-07-09T10:00:00.000Z', Date.parse('2026-07-09T11:05:00.000Z')), '1 ora fa');
});

test('foregroundForColor keeps room cards readable on light and dark colors', () => {
  assert.equal(foregroundForColor('#f5d67a'), '#1f2937');
  assert.equal(foregroundForColor('#4f5f9d'), '#ffffff');
});
