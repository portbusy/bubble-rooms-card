import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaScopedEntityIds } from '../src/bubble-rooms-card-editor.js';

const hass = {
  entities: {
    'binary_sensor.sala_motion': { area_id: 'sala' },
    'light.sala_madia': { area_id: 'sala' },
    'sensor.sala_temperatura': { device_id: 'termometro_sala' },
    'light.camera': { area_id: 'camera' },
    'group.luci_piano_terra': {}
  },
  devices: {
    termometro_sala: { area_id: 'sala' }
  },
  states: {
    'binary_sensor.sala_motion': { attributes: { device_class: 'motion' } },
    'light.sala_madia': { attributes: {} },
    'sensor.sala_temperatura': { attributes: { device_class: 'temperature' } },
    'light.camera': { attributes: {} },
    'group.luci_piano_terra': { attributes: {} }
  }
};

test('areaScopedEntityIds includes direct and device-area entities only', () => {
  assert.deepEqual(
    areaScopedEntityIds(hass, 'sala', ['light', 'sensor']),
    ['light.sala_madia', 'sensor.sala_temperatura']
  );
});

test('areaScopedEntityIds keeps global groups and area-scoped entities for aggregate targets', () => {
  assert.deepEqual(
    areaScopedEntityIds(hass, 'sala', ['light', 'group']),
    ['group.luci_piano_terra', 'light.sala_madia']
  );
});

test('areaScopedEntityIds applies device-class filtering after area filtering', () => {
  assert.deepEqual(
    areaScopedEntityIds(hass, 'sala', 'sensor', ['temperature']),
    ['sensor.sala_temperatura']
  );
});
