// test/styles.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomStyles } from '../src/styles.js';

function baseHass(overrides = {}) {
  return {
    entities: {
      'light.sala_madia': { area_id: 'sala', device_id: null },
      'cover.sala_tapparella': { area_id: 'sala', device_id: null },
      ...(overrides.entities || {})
    },
    devices: {},
    states: {
      'binary_sensor.sala_motion': { state: 'on' },
      'light.sala_madia': { state: 'off' },
      'cover.sala_tapparella': { state: 'closed' },
      ...(overrides.states || {})
    }
  };
}

test('active room uses the active card background and 0.45s transition', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: rgba\(135,145,203,0\.19\) !important/);
  assert.match(css, /transition: background-color 0\.45s ease, color 0\.45s ease !important/);
});

test('inactive room uses the inactive card background and 180s transition', () => {
  const hass = baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: rgba\(255,255,255,0\.4\) !important/);
  assert.match(css, /transition: background-color 180s linear, color 180s linear !important/);
});

test('an on light gets the honey background/foreground', () => {
  const hass = baseHass({ states: { 'light.sala_madia': { state: 'on' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background:rgba\(200,170,120,0\.28\) !important;color:#7E6438 !important/);
});

test('an off light gets the neutral glass background/foreground', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background:rgba\(255,255,255,0\.42\) !important;color:#6A7078 !important/);
});

test('a cover always gets the slate background/foreground', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background:rgba\(120,140,162,0\.22\) !important;color:#4C6078 !important/);
});

test('bottomButtons lists lights before covers, excluding excludeEntities', () => {
  const hass = baseHass();
  const { bottomButtons } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', ['cover.sala_tapparella']);
  assert.deepEqual(bottomButtons.map((b) => b.entity), ['light.sala_madia']);
  assert.deepEqual(bottomButtons[0], {
    entity: 'light.sala_madia',
    state_background: true,
    show_name: true,
    show_state: false,
    tap_action: { action: 'toggle' },
    hold_action: { action: 'more-info' }
  });
});
