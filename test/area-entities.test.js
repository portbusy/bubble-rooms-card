// test/area-entities.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaEntities } from '../src/area-entities.js';

test('areaEntities filters by area and domain', () => {
  const hass = {
    entities: {
      'light.sala_madia': { area_id: 'sala', device_id: null },
      'light.sala_interruttore': { area_id: 'sala', device_id: null },
      'cover.sala_tapparella': { area_id: 'sala', device_id: null },
      'light.camera': { area_id: 'camera', device_id: null }
    },
    devices: {}
  };
  assert.deepEqual(
    areaEntities(hass, 'sala', 'light'),
    ['light.sala_interruttore', 'light.sala_madia']
  );
});

test('areaEntities returns an empty array for an area with no matching domain', () => {
  const hass = { entities: {}, devices: {} };
  assert.deepEqual(areaEntities(hass, 'sala', 'light'), []);
});
