import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaScopedEntityIds, areaScopedEntitySelector } from '../src/bubble-rooms-card-editor.js';

const hass = {
  entities: {
    'binary_sensor.sala_motion': { area_id: 'sala' },
    'light.sala_madia': { area_id: 'sala' },
    'sensor.sala_temperatura': { device_id: 'termometro_sala' },
    'light.camera': { area_id: 'camera' },
    'group.luci_piano_terra': {}
  },
  devices: {
    termometro_sala: { area_id: 'sala' }
  }
};

test('areaScopedEntityIds includes direct and device-area entities only', () => {
  assert.deepEqual(
    areaScopedEntityIds(hass, 'sala', ['light', 'sensor']),
    ['light.sala_madia', 'sensor.sala_temperatura']
  );
});

test('areaScopedEntitySelector constrains native selectors after an area is selected', () => {
  const selector = areaScopedEntitySelector(hass, 'sala', {
    domains: ['light', 'group'],
    multiple: true,
    reorder: true
  });

  assert.deepEqual(selector, {
    entity: {
      filter: { domain: ['light', 'group'] },
      multiple: true,
      reorder: true,
      include_entities: ['group.luci_piano_terra', 'light.sala_madia']
    }
  });
});

test('areaScopedEntitySelector keeps only domain filtering before an area is chosen', () => {
  assert.deepEqual(
    areaScopedEntitySelector(hass, '', { domains: 'sensor' }),
    { entity: { filter: { domain: ['sensor'] } } }
  );
});
