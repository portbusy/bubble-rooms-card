import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRooms } from '../src/rooms.js';

test('resolveRooms returns entities with the given label, sorted by entity_id', () => {
  const hass = {
    entities: {
      'binary_sensor.sala_motion': { labels: ['gruppo_movimento_stanza'], area_id: 'sala', device_id: null },
      'binary_sensor.camera_motion': { labels: ['gruppo_movimento_stanza'], area_id: 'camera', device_id: null },
      'binary_sensor.unrelated': { labels: [], area_id: 'sala', device_id: null }
    },
    devices: {}
  };
  const result = resolveRooms(hass, 'gruppo_movimento_stanza');
  assert.deepEqual(result, [
    { entityId: 'binary_sensor.camera_motion', areaId: 'camera' },
    { entityId: 'binary_sensor.sala_motion', areaId: 'sala' }
  ]);
});

test('resolveRooms falls back to the device area when the entity has none', () => {
  const hass = {
    entities: {
      'binary_sensor.bagno_motion': { labels: ['gruppo_movimento_stanza'], area_id: null, device_id: 'dev1' }
    },
    devices: {
      dev1: { area_id: 'bagno' }
    }
  };
  const result = resolveRooms(hass, 'gruppo_movimento_stanza');
  assert.deepEqual(result, [{ entityId: 'binary_sensor.bagno_motion', areaId: 'bagno' }]);
});

test('resolveRooms returns an empty array when no entity has the label', () => {
  const hass = { entities: {}, devices: {} };
  assert.deepEqual(resolveRooms(hass, 'gruppo_movimento_stanza'), []);
});
