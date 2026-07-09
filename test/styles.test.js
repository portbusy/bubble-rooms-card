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
  assert.match(css, /background: var\(--bubble-room-card-background, var\(--bubble-main-background-color, var\(--card-background-color, #fff\)\)\) !important/);
  assert.match(css, /transition: background-color 0\.45s ease, color 0\.45s ease !important/);
});

test('inactive room keeps the Bubble Card main background variable and 180s transition', () => {
  const hass = baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: var\(--bubble-room-card-background, var\(--bubble-main-background-color, var\(--card-background-color, #fff\)\)\) !important/);
  assert.match(css, /transition: background-color 180s linear, color 180s linear !important/);
});

test('card chrome uses Bubble Card variables with premium fallbacks', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /position: relative !important/);
  assert.match(css, /border: var\(--bubble-border, 1px solid color-mix\(in srgb, var\(--bubble-room-color, var\(--divider-color, transparent\)\) 26%, transparent\)\) !important/);
  assert.match(css, /border-radius: var\(--bubble-border-radius, 28px\) !important/);
  assert.match(css, /box-shadow: var\(--bubble-box-shadow, 0 18px 38px color-mix/);
  assert.match(css, /--bubble-rooms-design: hero;/);
  assert.match(css, /ha-card::before/);
});

test('icon container uses Bubble Card icon variables', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /\.bubble-icon-container \{\n {2}background: var\(--bubble-icon-background-color, var\(--bubble-secondary-background-color, var\(--card-background-color, #fff\)\)\) !important;/);
  assert.match(css, /\.bubble-icon-container \{[\s\S]*border-radius: var\(--bubble-icon-border-radius, 20px\) !important;/);
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

test('room color overrides Bubble Card variables for a single card', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(
    hass,
    'binary_sensor.sala_motion',
    'sala',
    [],
    { color: '#b98270', foreground: '#ffffff' }
  );

  assert.match(css, /--bubble-room-color: #b98270;/);
  assert.match(css, /--bubble-room-foreground-color: #ffffff;/);
  assert.match(css, /--bubble-room-card-background: linear-gradient\(180deg, color-mix\(in srgb, var\(--bubble-room-color\) 82%, var\(--card-background-color, #fff\)\) 0%, color-mix\(in srgb, var\(--bubble-room-color\) 58%, var\(--card-background-color, #fff\)\) 44%, color-mix\(in srgb, var\(--card-background-color, #fff\) 92%, var\(--bubble-room-color\)\) 44%, var\(--card-background-color, #fff\) 100%\);/);
  assert.match(css, /--bubble-icon-background-color: color-mix\(in srgb, var\(--bubble-room-color\) 74%, #ffffff\);/);
  assert.match(css, /\.bubble-name \{ color: var\(--bubble-room-foreground-color, #ffffff\) !important;/);
  assert.match(css, /\.bubble-state, \.bubble-last-changed \{\n {2}color: var\(--bubble-room-foreground-color, #ffffff\) !important;/);
});

test('minimal design dials down radius and highlight treatment', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(
    hass,
    'binary_sensor.sala_motion',
    'sala',
    [],
    { color: '#b98270', foreground: '#ffffff' },
    { design: 'minimal' }
  );

  assert.match(css, /--bubble-rooms-design: minimal;/);
  assert.match(css, /border-radius: var\(--bubble-border-radius, 20px\) !important/);
  assert.match(css, /opacity: 0;/);
  assert.match(css, /\.bubble-sub-button \{\n {2}border-radius: var\(--bubble-sub-button-border-radius, 14px\) !important;/);
});

test('summary chips report active lights and covers', () => {
  const hass = baseHass({
    states: {
      'light.sala_madia': { state: 'on' },
      'cover.sala_tapparella': { state: 'open' }
    }
  });
  const { mainButtons } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);

  assert.deepEqual(mainButtons.map((button) => button.name), ['1 luce accesa', '1 tapparella attiva']);
});

test('sub-buttons get the redesign treatment without per-index overrides', () => {
  const hass = baseHass({ states: { 'light.sala_madia': { state: 'on' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.doesNotMatch(css, /\.bubble-sub-button-\d+/);
  assert.match(css, /\.bubble-sub-button \{\n {2}border-radius: var\(--bubble-sub-button-border-radius, 18px\) !important;/);
  assert.match(css, /\.bubble-sub-button:not\(\.is-on\)/);
  assert.doesNotMatch(css, /--bubble-sub-button-background-color/);
});

test('redesign avoids backdrop blur and per-index generated color CSS', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.doesNotMatch(css, /backdrop-filter/);
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
