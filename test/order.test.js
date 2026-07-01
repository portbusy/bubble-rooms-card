// test/order.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeOrder } from '../src/order.js';

test('active entities get a lower order than inactive ones', () => {
  const hass = {
    states: {
      'binary_sensor.a': { state: 'on', last_changed: '2026-07-01T10:00:00Z' },
      'binary_sensor.b': { state: 'off', last_changed: '2026-07-01T11:00:00Z' }
    }
  };
  const orderA = computeOrder(hass, 'binary_sensor.a');
  const orderB = computeOrder(hass, 'binary_sensor.b');
  assert.ok(orderA < orderB);
});

test('within the same state, more recent last_changed sorts first', () => {
  const hass = {
    states: {
      'binary_sensor.recent': { state: 'on', last_changed: '2026-07-01T12:00:00Z' },
      'binary_sensor.older': { state: 'on', last_changed: '2026-07-01T09:00:00Z' }
    }
  };
  const orderRecent = computeOrder(hass, 'binary_sensor.recent');
  const orderOlder = computeOrder(hass, 'binary_sensor.older');
  assert.ok(orderRecent < orderOlder);
});
