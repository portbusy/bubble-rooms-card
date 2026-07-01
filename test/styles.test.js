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

test('active room uses a bubble-accent-tinted background and 0.45s transition', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: color-mix\(in srgb, var\(--bubble-main-background-color\) 70%, transparent\) !important/);
  assert.match(css, /transition: background-color 0\.45s ease, color 0\.45s ease !important/);
});

test('inactive room uses a neutral card-background-color mix and 180s transition', () => {
  const hass = baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: color-mix\(in srgb, var\(--card-background-color, #fff\) 70%, transparent\) !important/);
  assert.match(css, /transition: background-color 180s linear, color 180s linear !important/);
});

test('active icon container uses the bubble-card icon background variable directly', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /\.bubble-icon-container \{\n {2}background: var\(--bubble-icon-background-color\) !important;/);
});

test('inactive icon container falls back to a neutral card-background-color mix', () => {
  const hass = baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /\.bubble-icon-container \{\n {2}background: color-mix\(in srgb, var\(--card-background-color, #fff\) 80%, transparent\) !important;/);
});

test('.bubble-name follows the theme primary text color instead of a fixed hex', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /\.bubble-name \{ color: var\(--primary-text-color\) !important; font-weight: 600 !important; letter-spacing: -0\.02em !important; \}/);
});

test('state text uses bubble-accent-color when active, secondary-text-color when inactive', () => {
  const active = buildRoomStyles(baseHass(), 'binary_sensor.sala_motion', 'sala', []).css;
  assert.match(active, /\.bubble-state, \.bubble-last-changed \{\n {2}color: var\(--bubble-accent-color\) !important;/);

  const inactive = buildRoomStyles(
    baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } }),
    'binary_sensor.sala_motion', 'sala', []
  ).css;
  assert.match(inactive, /\.bubble-state, \.bubble-last-changed \{\n {2}color: var\(--secondary-text-color\) !important;/);
});

test('no per-index sub-button color CSS is generated (Bubble Card themes them natively)', () => {
  const hass = baseHass({ states: { 'light.sala_madia': { state: 'on' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.doesNotMatch(css, /\.bubble-sub-button-\d+/);
});

test('bottomButtons still lists lights before covers, with state_background true, excluding excludeEntities', () => {
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
