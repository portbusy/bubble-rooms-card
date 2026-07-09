import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomConfig, resolveRoomColor } from '../src/room-config.js';

test('buildRoomConfig produces a bubble-card config with stripped name and sub_button groups', () => {
  const hass = {
    entities: {
      'light.sala_madia': { area_id: 'sala', device_id: null }
    },
    devices: {},
    states: {
      'binary_sensor.sala_motion': {
        state: 'on',
        attributes: { icon: 'mdi:sofa', friendly_name: 'Sensori movimento Sala' }
      },
      'light.sala_madia': { state: 'on' }
    }
  };
  const config = buildRoomConfig(hass, 'binary_sensor.sala_motion', 'sala', {
    namePrefix: 'Sensori movimento ',
    excludeEntities: []
  });

  assert.equal(config.type, 'custom:bubble-card');
  assert.equal(config.card_type, 'button');
  assert.equal(config.button_type, 'state');
  assert.equal(config.card_layout, 'large');
  assert.equal(config.rows, 2);
  assert.equal(config.icon, 'mdi:sofa');
  assert.equal(config.entity, 'binary_sensor.sala_motion');
  assert.equal(config.name, 'Sala');
  assert.equal(config.show_state, true);
  assert.deepEqual(config.button_action, {
    tap_action: { action: 'more-info' },
    hold_action: { action: 'more-info' }
  });
  assert.match(config.styles, /background: linear-gradient\(135deg, color-mix/);
  assert.match(config.styles, /\.bubble-button-card-container, \.bubble-button-card, \.bubble-card-container/);
  assert.equal(config.sub_button.main[0].show_last_updated, true);
  assert.equal(config.sub_button.main.length, 1);
  assert.equal(config.sub_button.bottom.length, 1);
  assert.equal(config.sub_button.bottom_layout, 'inline');
});

test('buildRoomConfig applies a room color matched by area id', () => {
  const hass = {
    entities: {},
    devices: {},
    states: {
      'binary_sensor.sala_motion': {
        state: 'on',
        attributes: { icon: 'mdi:sofa', friendly_name: 'Sensori movimento Sala' }
      }
    }
  };
  const config = buildRoomConfig(hass, 'binary_sensor.sala_motion', 'sala', {
    namePrefix: 'Sensori movimento ',
    excludeEntities: [],
    roomColors: {
      sala: { color: '#b98270', foreground: '#ffffff' }
    }
  });

  assert.match(config.styles, /--bubble-room-color: #b98270;/);
  assert.match(config.styles, /--bubble-room-foreground-color: #ffffff;/);
  assert.match(config.styles, /--bubble-room-card-background: linear-gradient\(135deg, color-mix\(in srgb, #b98270 86%/);
  assert.match(config.styles, /background: linear-gradient\(135deg, color-mix\(in srgb, #b98270 86%/);
});

test('buildRoomConfig can auto-assign a room color from the room name', () => {
  const hass = {
    entities: {},
    devices: {},
    states: {
      'binary_sensor.cucina_motion': {
        state: 'off',
        attributes: { icon: 'mdi:countertop', friendly_name: 'Sensori movimento Cucina' }
      }
    }
  };
  const config = buildRoomConfig(hass, 'binary_sensor.cucina_motion', 'cucina', {
    namePrefix: 'Sensori movimento ',
    excludeEntities: [],
    autoRoomColors: true
  });

  assert.match(config.styles, /--bubble-room-color: #d08a4b;/);
});

test('buildRoomConfig navigates to a room link when configured', () => {
  const hass = {
    entities: {},
    devices: {},
    states: {
      'binary_sensor.sala_motion': {
        state: 'on',
        attributes: { icon: 'mdi:sofa', friendly_name: 'Sensori movimento Sala' }
      }
    }
  };
  const config = buildRoomConfig(hass, 'binary_sensor.sala_motion', 'sala', {
    namePrefix: 'Sensori movimento ',
    excludeEntities: [],
    roomLinks: { sala: '#sala' }
  });

  assert.deepEqual(config.button_action.tap_action, {
    action: 'navigate',
    navigation_path: '#sala'
  });
});

test('buildRoomConfig supports minimal design and hidden summary chips', () => {
  const hass = {
    entities: {
      'light.sala_madia': { area_id: 'sala', device_id: null }
    },
    devices: {},
    states: {
      'binary_sensor.sala_motion': {
        state: 'on',
        attributes: { icon: 'mdi:sofa', friendly_name: 'Sensori movimento Sala' }
      },
      'light.sala_madia': { state: 'on' }
    }
  };
  const config = buildRoomConfig(hass, 'binary_sensor.sala_motion', 'sala', {
    namePrefix: 'Sensori movimento ',
    excludeEntities: [],
    design: 'minimal',
    showSummary: false
  });

  assert.match(config.styles, /--bubble-rooms-design: minimal;/);
  assert.deepEqual(config.sub_button.main, [
    { show_last_updated: true, show_state: false, show_icon: false, state_background: false }
  ]);
});

test('buildRoomConfig can disable all room coloring', () => {
  const hass = {
    entities: {},
    devices: {},
    states: {
      'binary_sensor.sala_motion': {
        state: 'on',
        attributes: { icon: 'mdi:sofa', friendly_name: 'Sensori movimento Sala' }
      }
    }
  };
  const config = buildRoomConfig(hass, 'binary_sensor.sala_motion', 'sala', {
    namePrefix: 'Sensori movimento ',
    excludeEntities: [],
    colorMode: 'off'
  });

  assert.doesNotMatch(config.styles, /--bubble-room-color:/);
});

test('resolveRoomColor matches entity id, area id, or normalized room name and rejects unsafe values', () => {
  assert.deepEqual(
    resolveRoomColor({ 'binary_sensor.sala_motion': '#b98270' }, 'binary_sensor.sala_motion', 'sala', 'Sala'),
    { color: '#b98270', foreground: '#ffffff' }
  );
  assert.deepEqual(
    resolveRoomColor({ sala: '#b98270' }, 'binary_sensor.sala_motion', 'sala', 'Sala'),
    { color: '#b98270', foreground: '#ffffff' }
  );
  assert.deepEqual(
    resolveRoomColor({ 'sala grande': { color: 'rgb(185, 130, 112)', foreground: 'white' } }, 'binary_sensor.sala_motion', 'sala', 'Sala Grande'),
    { color: 'rgb(185, 130, 112)', foreground: 'white' }
  );
  assert.equal(
    resolveRoomColor({ sala: '#fff; background: red' }, 'binary_sensor.sala_motion', 'sala', 'Sala'),
    null
  );
  assert.deepEqual(
    resolveRoomColor({}, 'binary_sensor.bagno_motion', 'bagno', 'Bagno', true),
    { color: '#4f9d96', foreground: '#ffffff' }
  );
});
