import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomConfig } from '../src/room-config.js';

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
    tap_action: { action: 'toggle' },
    hold_action: { action: 'more-info' }
  });
  assert.match(config.styles, /background: color-mix\(in srgb, var\(--bubble-main-background-color\) 20%, transparent\)/);
  assert.deepEqual(config.sub_button.main, [
    { show_last_updated: true, show_state: false, show_icon: false, state_background: false }
  ]);
  assert.equal(config.sub_button.bottom.length, 1);
  assert.equal(config.sub_button.bottom_layout, 'inline');
});
