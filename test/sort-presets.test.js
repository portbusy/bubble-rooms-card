// test/sort-presets.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SORT_PRESETS, resolveSortSteps } from '../src/sort-presets.js';

test('SORT_PRESETS has the four expected keys with the right steps', () => {
  assert.deepEqual(SORT_PRESETS.active_recent.steps, [
    { attribute: 'last_changed', reverse: true },
    { attribute: 'state', reverse: true }
  ]);
  assert.deepEqual(SORT_PRESETS.recent.steps, [{ attribute: 'last_changed', reverse: true }]);
  assert.deepEqual(SORT_PRESETS.active.steps, [{ attribute: 'state', reverse: true }]);
  assert.deepEqual(SORT_PRESETS.none.steps, []);
});

test('resolveSortSteps prefers an explicit sort array over sort_preset', () => {
  const explicit = [{ attribute: 'state', reverse: false }];
  const result = resolveSortSteps({ sort: explicit, sort_preset: 'none' });
  assert.deepEqual(result, explicit);
});

test('resolveSortSteps uses the named preset when sort is absent', () => {
  const result = resolveSortSteps({ sort_preset: 'recent' });
  assert.deepEqual(result, [{ attribute: 'last_changed', reverse: true }]);
});

test('resolveSortSteps falls back to active_recent when sort_preset is missing or unknown', () => {
  assert.deepEqual(resolveSortSteps({}), SORT_PRESETS.active_recent.steps);
  assert.deepEqual(resolveSortSteps({ sort_preset: 'nonexistent' }), SORT_PRESETS.active_recent.steps);
});
