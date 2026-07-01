// test/sort.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortRooms } from '../src/sort.js';

function hassWith(states) {
  return { states };
}

test('default-equivalent steps: state desc primary, last_changed desc tie-breaker', () => {
  const rooms = [
    { entityId: 'binary_sensor.bagno', areaId: 'bagno' },
    { entityId: 'binary_sensor.camera', areaId: 'camera' },
    { entityId: 'binary_sensor.sala', areaId: 'sala' }
  ];
  const hass = hassWith({
    'binary_sensor.bagno': { state: 'off', last_changed: '2026-07-01T09:00:00Z' },
    'binary_sensor.camera': { state: 'on', last_changed: '2026-07-01T08:00:00Z' },
    'binary_sensor.sala': { state: 'on', last_changed: '2026-07-01T10:00:00Z' }
  });
  const sorted = sortRooms(hass, rooms, [
    { attribute: 'last_changed', reverse: true },
    { attribute: 'state', reverse: true }
  ]);
  assert.deepEqual(sorted.map((r) => r.entityId), [
    'binary_sensor.sala',   // on, most recent among 'on'
    'binary_sensor.camera', // on, older
    'binary_sensor.bagno'   // off
  ]);
});

test('sortRooms does not mutate the input array', () => {
  const rooms = [
    { entityId: 'binary_sensor.b', areaId: 'b' },
    { entityId: 'binary_sensor.a', areaId: 'a' }
  ];
  const original = [...rooms];
  const hass = hassWith({
    'binary_sensor.a': { state: 'on', last_changed: '2026-07-01T09:00:00Z' },
    'binary_sensor.b': { state: 'off', last_changed: '2026-07-01T10:00:00Z' }
  });
  sortRooms(hass, rooms, [{ attribute: 'state', reverse: true }]);
  assert.deepEqual(rooms, original);
});

test('a single ascending state sort puts off before on', () => {
  const rooms = [
    { entityId: 'binary_sensor.on_one', areaId: 'x' },
    { entityId: 'binary_sensor.off_one', areaId: 'y' }
  ];
  const hass = hassWith({
    'binary_sensor.on_one': { state: 'on', last_changed: '2026-07-01T09:00:00Z' },
    'binary_sensor.off_one': { state: 'off', last_changed: '2026-07-01T09:00:00Z' }
  });
  const sorted = sortRooms(hass, rooms, [{ attribute: 'state', reverse: false }]);
  assert.deepEqual(sorted.map((r) => r.entityId), ['binary_sensor.off_one', 'binary_sensor.on_one']);
});
