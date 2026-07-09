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

test('room card uses the Bubble Card main background variable and 0.45s active transition', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: var\(--bubble-main-background-color, var\(--card-background-color, #fff\)\) !important/);
  assert.match(css, /transition: background-color 0\.45s ease, color 0\.45s ease !important/);
});

test('inactive room keeps the Bubble Card main background variable and 180s transition', () => {
  const hass = baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: var\(--bubble-main-background-color, var\(--card-background-color, #fff\)\) !important/);
  assert.match(css, /transition: background-color 180s linear, color 180s linear !important/);
});

test('card chrome follows Bubble Card border radius, border, and shadow variables', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /border: var\(--bubble-border, var\(--ha-card-border-width, 1px\) solid var\(--divider-color, transparent\)\) !important/);
  assert.match(css, /border-radius: var\(--bubble-border-radius, var\(--ha-card-border-radius, 12px\)\) !important/);
  assert.match(css, /box-shadow: var\(--bubble-box-shadow, var\(--ha-card-box-shadow, none\)\) !important/);
});

test('icon container uses Bubble Card icon variables', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /\.bubble-icon-container \{\n {2}background: var\(--bubble-icon-background-color, var\(--bubble-secondary-background-color, var\(--card-background-color, #fff\)\)\) !important;/);
  assert.match(css, /\.bubble-icon-container \{[\s\S]*border-radius: var\(--bubble-icon-border-radius, var\(--bubble-border-radius, 50%\)\) !important;/);
});

test('.bubble-name follows the theme primary text color instead of a fixed hex', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /\.bubble-name \{ color: var\(--primary-text-color\) !important; font-weight: 600 !important; letter-spacing: -0\.02em !important; \}/);
});

test('state text uses bubble-accent-color when active, secondary-text-color when inactive', () => {
  const active = buildRoomStyles(baseHass(), 'binary_sensor.sala_motion', 'sala', []).css;
  assert.match(active, /\.bubble-state, \.bubble-last-changed \{\n {2}color: var\(--bubble-accent-color\) !important;/);
  assert.match(active, /\.bubble-icon \{ color: var\(--bubble-accent-color\) !important;/);

  const inactive = buildRoomStyles(
    baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } }),
    'binary_sensor.sala_motion', 'sala', []
  ).css;
  assert.match(inactive, /\.bubble-state, \.bubble-last-changed \{\n {2}color: var\(--secondary-text-color\) !important;/);
});

test('sub-buttons keep native Bubble Card state backgrounds and radius variable', () => {
  const hass = baseHass({ states: { 'light.sala_madia': { state: 'on' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.doesNotMatch(css, /\.bubble-sub-button-\d+/);
  assert.match(css, /\.bubble-sub-button \{\n {2}border-radius: var\(--bubble-sub-button-border-radius, var\(--bubble-border-radius, 999px\)\) !important;/);
  assert.doesNotMatch(css, /--bubble-sub-button-background-color/);
});

test('custom glass styling no longer overrides Bubble Card variables', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.doesNotMatch(css, /color-mix/);
  assert.doesNotMatch(css, /backdrop-filter/);
  assert.doesNotMatch(css, /rgba\(/);
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
