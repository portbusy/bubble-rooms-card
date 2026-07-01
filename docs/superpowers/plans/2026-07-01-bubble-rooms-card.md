# Bubble Rooms Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `bubble-rooms-card`, a custom Lovelace card that reproduces the current motion-room dashboard cards (icon, colors, sub-buttons for lights/covers, sort by active-then-recency) without the DOM-recreation flash caused by the current `auto-entities` + Jinja template approach.

**Architecture:** Single vanilla-JS ES module custom element. Pure helper functions (room resolution, sort order, per-room CSS/config building) are separated from the DOM-integration class so they can be unit-tested with Node's built-in test runner. The element keeps a persistent `Map<entityId, {el, wrapper}>` of real `<bubble-card>` child instances across `hass` updates — it updates them in place (`.hass =`, `.setConfig()`) instead of letting Lovelace destroy/recreate them, and reorders visually via CSS `order` instead of DOM reordering.

**Tech Stack:** Vanilla JavaScript (ES modules), no build step, no runtime dependencies besides `bubble-card` (>= 3.2.3) being installed in the user's Home Assistant. Node's built-in `node:test`/`node:assert` for unit tests (no npm packages).

## Global Constraints

- No build step: the file loaded by Lovelace must be plain, unbundled JS.
- No dependency on `card_mod` — styling goes through bubble-card's native `styles` config field.
- Room discovery stays label-based (`label_entities` equivalent), default label `gruppo_movimento_stanza`, configurable via `label:` in card config.
- Config also supports `name_strip_prefix` (default `"Sensori movimento "`) and `exclude_entities` (list of entity_ids excluded from sub-buttons, replacing the hardcoded `reject('match', ...)` calls in the old Jinja).
- Colors/transitions are hardcoded defaults matching the current design exactly (see Task 4 for exact values) — not exposed as config in v1.
- Repo: public GitHub repo `portbusy/bubble-rooms-card`, structure `hacs.json`, `README.md`, `src/bubble-rooms-card.js`, `dist/bubble-rooms-card.js` (identical content, no build step).

---

### Task 1: Repo scaffolding

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/hacs.json`
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/README.md`
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/package.json`
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/.gitignore`

**Interfaces:**
- Produces: `package.json` with `"type": "module"` so later Node test files can use ES module `import`/`export` with zero dependencies.

- [ ] **Step 1: Create `hacs.json`**

```json
{
  "name": "Bubble Rooms Card",
  "render_readme": true,
  "filename": "bubble-rooms-card.js"
}
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "bubble-rooms-card",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/"
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
.DS_Store
node_modules/
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Bubble Rooms Card

Custom Lovelace card for Home Assistant that renders one [Bubble Card](https://github.com/Clooos/Bubble-Card)
button per room, auto-discovered from a label on motion-sensor entities.
Unlike `auto-entities` + a Jinja template, this card keeps the same
`bubble-card` DOM instances alive across state updates (no destroy/recreate),
so there's no flash of unstyled content when any tracked entity changes.

## Requirements

- [Bubble Card](https://github.com/Clooos/Bubble-Card) >= 3.2.3, installed via HACS.

## Installation (HACS)

1. HACS → the three-dot menu → **Custom repositories**.
2. Add `https://github.com/portbusy/bubble-rooms-card`, category **Dashboard**.
3. Install "Bubble Rooms Card", reload resources.

## Configuration

```yaml
type: custom:bubble-rooms-card
label: gruppo_movimento_stanza        # default
name_strip_prefix: "Sensori movimento "
exclude_entities:
  - light.luci_sala
  - cover.tapparella_camera_sx
```

| Key | Default | Description |
|---|---|---|
| `label` | `gruppo_movimento_stanza` | Label applied to motion-sensor entities that should get a room card. |
| `name_strip_prefix` | `"Sensori movimento "` | Prefix stripped from the sensor's friendly name to get the room name. |
| `exclude_entities` | `[]` | Entity IDs excluded from the light/cover sub-buttons. |
```

- [ ] **Step 5: Commit**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
git add hacs.json package.json .gitignore README.md
git commit -m "chore: scaffold repo"
```

---

### Task 2: Pure function — `resolveRooms`

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/rooms.js`
- Test: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/rooms.test.js`

**Interfaces:**
- Produces: `resolveRooms(hass, label)` → `Array<{ entityId: string, areaId: string|null }>`, sorted by `entityId` ascending. `hass` shape consumed: `hass.entities` is `Record<entityId, { labels: string[], area_id: string|null, device_id: string|null }>`, `hass.devices` is `Record<deviceId, { area_id: string|null }>` (used to fall back to the device's area when the entity itself has no `area_id`, mirroring HA's `area_id()` template function).

- [ ] **Step 1: Write the failing test**

```javascript
// test/rooms.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRooms } from '../src/rooms.js';

test('resolveRooms returns entities with the given label, sorted by entity_id', () => {
  const hass = {
    entities: {
      'binary_sensor.sala_motion': { labels: ['gruppo_movimento_stanza'], area_id: 'sala', device_id: null },
      'binary_sensor.camera_motion': { labels: ['gruppo_movimento_stanza'], area_id: 'camera', device_id: null },
      'binary_sensor.unrelated': { labels: [], area_id: 'sala', device_id: null }
    },
    devices: {}
  };
  const result = resolveRooms(hass, 'gruppo_movimento_stanza');
  assert.deepEqual(result, [
    { entityId: 'binary_sensor.camera_motion', areaId: 'camera' },
    { entityId: 'binary_sensor.sala_motion', areaId: 'sala' }
  ]);
});

test('resolveRooms falls back to the device area when the entity has none', () => {
  const hass = {
    entities: {
      'binary_sensor.bagno_motion': { labels: ['gruppo_movimento_stanza'], area_id: null, device_id: 'dev1' }
    },
    devices: {
      dev1: { area_id: 'bagno' }
    }
  };
  const result = resolveRooms(hass, 'gruppo_movimento_stanza');
  assert.deepEqual(result, [{ entityId: 'binary_sensor.bagno_motion', areaId: 'bagno' }]);
});

test('resolveRooms returns an empty array when no entity has the label', () => {
  const hass = { entities: {}, devices: {} };
  assert.deepEqual(resolveRooms(hass, 'gruppo_movimento_stanza'), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: FAIL — `Cannot find module '../src/rooms.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/rooms.js
export function resolveRooms(hass, label) {
  const entities = hass.entities || {};
  const devices = hass.devices || {};
  const rooms = [];
  for (const [entityId, entity] of Object.entries(entities)) {
    if (!entity.labels || !entity.labels.includes(label)) continue;
    let areaId = entity.area_id || null;
    if (!areaId && entity.device_id && devices[entity.device_id]) {
      areaId = devices[entity.device_id].area_id || null;
    }
    rooms.push({ entityId, areaId });
  }
  rooms.sort((a, b) => a.entityId.localeCompare(b.entityId));
  return rooms;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/rooms.js test/rooms.test.js
git commit -m "feat: add resolveRooms label-based room discovery"
```

---

### Task 3: Pure function — `areaEntities`

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/area-entities.js`
- Test: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/area-entities.test.js`

**Interfaces:**
- Consumes: same `hass.entities` shape as Task 2.
- Produces: `areaEntities(hass, areaId, domain)` → `Array<string>` of entity_ids in that area whose domain matches (e.g. `'light'`, `'cover'`), sorted ascending. Mirrors Jinja's `area_entities(area) | select('match', 'light\\.')`.

- [ ] **Step 1: Write the failing test**

```javascript
// test/area-entities.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaEntities } from '../src/area-entities.js';

test('areaEntities filters by area and domain', () => {
  const hass = {
    entities: {
      'light.sala_madia': { area_id: 'sala', device_id: null },
      'light.sala_interruttore': { area_id: 'sala', device_id: null },
      'cover.sala_tapparella': { area_id: 'sala', device_id: null },
      'light.camera': { area_id: 'camera', device_id: null }
    },
    devices: {}
  };
  assert.deepEqual(
    areaEntities(hass, 'sala', 'light'),
    ['light.sala_interruttore', 'light.sala_madia']
  );
});

test('areaEntities returns an empty array for an area with no matching domain', () => {
  const hass = { entities: {}, devices: {} };
  assert.deepEqual(areaEntities(hass, 'sala', 'light'), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: FAIL — `Cannot find module '../src/area-entities.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/area-entities.js
export function areaEntities(hass, areaId, domain) {
  const entities = hass.entities || {};
  const devices = hass.devices || {};
  const prefix = domain + '.';
  const result = [];
  for (const [entityId, entity] of Object.entries(entities)) {
    if (!entityId.startsWith(prefix)) continue;
    let entityAreaId = entity.area_id || null;
    if (!entityAreaId && entity.device_id && devices[entity.device_id]) {
      entityAreaId = devices[entity.device_id].area_id || null;
    }
    if (entityAreaId === areaId) result.push(entityId);
  }
  result.sort();
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS (5 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/area-entities.js test/area-entities.test.js
git commit -m "feat: add areaEntities domain/area filter"
```

---

### Task 4: Pure function — `computeOrder`

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/order.js`
- Test: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/order.test.js`

**Interfaces:**
- Consumes: `hass.states[entityId]` shape `{ state: string, last_changed: string (ISO date) }`.
- Produces: `computeOrder(hass, entityId)` → `number`. Active rooms (`state === 'on'`) sort before inactive ones; within each group, more recent `last_changed` sorts first. Lower returned number = earlier in CSS `order`.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: FAIL — `Cannot find module '../src/order.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/order.js
export function computeOrder(hass, entityId) {
  const state = hass.states[entityId];
  if (!state) return Number.MAX_SAFE_INTEGER;
  const activeOffset = state.state === 'on' ? 0 : 1e15;
  const changedAt = new Date(state.last_changed).getTime();
  // Higher changedAt (more recent) must produce a lower order value.
  return activeOffset + (Number.MAX_SAFE_INTEGER - changedAt);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS (7 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/order.js test/order.test.js
git commit -m "feat: add computeOrder active-then-recency sort key"
```

---

### Task 5: Pure function — `buildRoomStyles`

This is the direct translation of the CSS-building logic from
`motion_rooms_card.yaml` lines 16-53 and 69-107 (see spec). Exact color
values below are copied from that file — do not invent new ones.

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/styles.js`
- Test: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/styles.test.js`

**Interfaces:**
- Consumes: `areaEntities` (Task 3) — `buildRoomStyles` calls it internally to find lights/covers in the room's area.
- Consumes: `hass.states[entityId].state`, `hass.entities[entityId].area_id` (with device fallback as in Task 2/3).
- Produces: `buildRoomStyles(hass, entityId, areaId, excludeEntities)` → `{ css: string, bottomButtons: Array<{ entity: string, state_background: true, show_name: true, show_state: false, tap_action: {action:'toggle'}, hold_action: {action:'more-info'} }> }`.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: FAIL — `Cannot find module '../src/styles.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/styles.js
import { areaEntities } from './area-entities.js';

export function buildRoomStyles(hass, entityId, areaId, excludeEntities) {
  const attivo = hass.states[entityId] && hass.states[entityId].state === 'on';
  const trans = attivo
    ? 'background-color 0.45s ease, color 0.45s ease'
    : 'background-color 180s linear, color 180s linear';
  const cardBg = attivo ? 'rgba(135,145,203,0.19)' : 'rgba(255,255,255,0.4)';
  const iconBg = attivo ? '#8791CB' : 'rgba(255,255,255,0.55)';
  const iconFg = attivo ? '#ffffff' : '#6A7078';
  const stateFg = attivo ? '#565F93' : '#7A808A';

  const excluded = new Set(excludeEntities || []);
  const lights = areaEntities(hass, areaId, 'light').filter((e) => !excluded.has(e));
  const covers = areaEntities(hass, areaId, 'cover').filter((e) => !excluded.has(e));

  const bottomButtons = [];
  let subButtonCss = '';
  let idx = 1; // slot 1 is reserved for the card's own "main" sub-button

  for (const light of lights) {
    idx += 1;
    const on = hass.states[light] && hass.states[light].state === 'on';
    const bg = on ? 'rgba(200,170,120,0.28)' : 'rgba(255,255,255,0.42)';
    const fg = on ? '#7E6438' : '#6A7078';
    subButtonCss += `.bubble-sub-button-${idx}{background:${bg} !important;color:${fg} !important;}`;
    bottomButtons.push({
      entity: light,
      state_background: true,
      show_name: true,
      show_state: false,
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' }
    });
  }

  for (const cover of covers) {
    idx += 1;
    subButtonCss += `.bubble-sub-button-${idx}{background:rgba(120,140,162,0.22) !important;color:#4C6078 !important;}`;
    bottomButtons.push({
      entity: cover,
      state_background: true,
      show_name: true,
      show_state: false,
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' }
    });
  }

  const css = (
    'ha-card {\n' +
    `  background: ${cardBg} !important;\n` +
    '  -webkit-backdrop-filter: blur(20px) saturate(1.7); backdrop-filter: blur(20px) saturate(1.7);\n' +
    '  border: 0.5px solid rgba(255,255,255,0.55) !important;\n' +
    '  border-radius: 28px !important;\n' +
    '  box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 10px 30px rgba(40,55,90,0.13), 0 1px 3px rgba(0,0,0,0.05) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    '.bubble-icon-container {\n' +
    `  background: ${iconBg} !important;\n` +
    '  box-shadow: inset 0 1.5px 1px rgba(255,255,255,0.7), 0 2px 6px rgba(60,70,90,0.12) !important;\n' +
    `  transition: ${trans} !important;\n` +
    '}\n' +
    `.bubble-icon { color: ${iconFg} !important; transition: ${trans} !important; }\n` +
    '.bubble-name { color: #23262B !important; font-weight: 600 !important; letter-spacing: -0.02em !important; }\n' +
    '.bubble-state, .bubble-last-changed {\n' +
    `  color: ${stateFg} !important; font-weight: 500 !important;\n` +
    `  transition: color ${attivo ? '0.45s' : '180s'} linear !important;\n` +
    '}\n' +
    '.bubble-sub-button {\n' +
    '  border-radius: 999px !important;\n' +
    '  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);\n' +
    '  border: 0.5px solid rgba(255,255,255,0.5) !important;\n' +
    '  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6) !important;\n' +
    '}\n' +
    subButtonCss +
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  ha-card, .bubble-icon-container, .bubble-icon, .bubble-state, .bubble-last-changed { transition: none !important; }\n' +
    '}\n'
  );

  return { css, bottomButtons };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS (13 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/styles.js test/styles.test.js
git commit -m "feat: add buildRoomStyles CSS/sub-button builder"
```

---

### Task 6: Pure function — `buildRoomConfig`

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/room-config.js`
- Test: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/room-config.test.js`

**Interfaces:**
- Consumes: `buildRoomStyles` (Task 5) — `{ css, bottomButtons }`.
- Consumes: `hass.states[entityId]` shape `{ attributes: { icon, friendly_name } }`.
- Produces: `buildRoomConfig(hass, entityId, areaId, options)` → the full `bubble-card` config object, where `options` is `{ namePrefix: string, excludeEntities: string[] }`.

- [ ] **Step 1: Write the failing test**

```javascript
// test/room-config.test.js
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
  assert.match(config.styles, /background: rgba\(135,145,203,0\.19\)/);
  assert.deepEqual(config.sub_button.main, [
    { show_last_updated: true, show_state: false, show_icon: false, state_background: false }
  ]);
  assert.equal(config.sub_button.bottom.length, 1);
  assert.equal(config.sub_button.bottom_layout, 'inline');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: FAIL — `Cannot find module '../src/room-config.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/room-config.js
import { buildRoomStyles } from './styles.js';

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function buildRoomConfig(hass, entityId, areaId, options) {
  const state = hass.states[entityId];
  const { css, bottomButtons } = buildRoomStyles(hass, entityId, areaId, options.excludeEntities);
  const rawName = (state.attributes && state.attributes.friendly_name) || entityId;
  const name = capitalize(rawName.replace(options.namePrefix, ''));

  return {
    type: 'custom:bubble-card',
    card_type: 'button',
    button_type: 'state',
    card_layout: 'large',
    rows: 2,
    icon: state.attributes && state.attributes.icon,
    entity: entityId,
    name,
    show_state: true,
    button_action: {
      tap_action: { action: 'toggle' },
      hold_action: { action: 'more-info' }
    },
    styles: css,
    sub_button: {
      main: [
        { show_last_updated: true, show_state: false, show_icon: false, state_background: false }
      ],
      bottom: bottomButtons,
      bottom_layout: 'inline'
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS (14 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/room-config.js test/room-config.test.js
git commit -m "feat: add buildRoomConfig bubble-card config builder"
```

---

### Task 7: Custom element — `BubbleRoomsCard`

This task is DOM/HA-runtime integration and cannot be unit-tested with
Node (it needs `window.loadCardHelpers`, real custom elements, and a live
`hass` object). Verification is manual, in the browser, against the test
dashboard — same technique used during the original debugging session
(inject a script that watches `getComputedStyle(...).border` over time to
confirm no more dark-flash).

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/bubble-rooms-card.js`

**Interfaces:**
- Consumes: `resolveRooms` (Task 2), `computeOrder` (Task 4), `buildRoomConfig` (Task 6).
- Produces: registers `customElements.define('bubble-rooms-card', BubbleRoomsCard)`, so Lovelace can load `type: custom:bubble-rooms-card`.

- [ ] **Step 1: Write the custom element**

```javascript
// src/bubble-rooms-card.js
import { resolveRooms } from './rooms.js';
import { computeOrder } from './order.js';
import { buildRoomConfig } from './room-config.js';

class BubbleRoomsCard extends HTMLElement {
  setConfig(config) {
    this._config = {
      label: config.label || 'gruppo_movimento_stanza',
      name_strip_prefix: config.name_strip_prefix || 'Sensori movimento ',
      exclude_entities: config.exclude_entities || []
    };
    this._rooms = new Map(); // entityId -> { wrapper: HTMLElement, el: HTMLElement }
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.style.display = 'grid';
      this._container.style.gap = '8px';
      this.appendChild(this._container);
    }
  }

  async set hass(hass) {
    this._hass = hass;
    if (!this._helpers) {
      this._helpers = await window.loadCardHelpers();
    }

    const rooms = resolveRooms(hass, this._config.label);

    if (rooms.length === 0) {
      this._container.textContent = `Nessuna stanza trovata per label ${this._config.label}`;
      return;
    }

    const seen = new Set();
    for (const { entityId, areaId } of rooms) {
      seen.add(entityId);
      const config = buildRoomConfig(hass, entityId, areaId, {
        namePrefix: this._config.name_strip_prefix,
        excludeEntities: this._config.exclude_entities
      });

      let entry = this._rooms.get(entityId);
      if (!entry) {
        let el;
        try {
          el = this._helpers.createCardElement(config);
        } catch (err) {
          const warning = document.createElement('div');
          warning.textContent = 'bubble-rooms-card richiede bubble-card, installalo da HACS';
          this._container.appendChild(warning);
          continue;
        }
        const wrapper = document.createElement('div');
        wrapper.appendChild(el);
        this._container.appendChild(wrapper);
        entry = { wrapper, el };
        this._rooms.set(entityId, entry);
      } else {
        entry.el.setConfig(config);
      }
      entry.el.hass = hass;
      entry.wrapper.style.order = String(computeOrder(hass, entityId));
    }

    for (const [entityId, entry] of this._rooms) {
      if (!seen.has(entityId)) {
        entry.wrapper.remove();
        this._rooms.delete(entityId);
      }
    }
  }

  getCardSize() {
    return (this._rooms ? this._rooms.size : 1) * 3;
  }
}

customElements.define('bubble-rooms-card', BubbleRoomsCard);
```

- [ ] **Step 2: Copy to `dist/`**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
mkdir -p dist
cp src/bubble-rooms-card.js dist/bubble-rooms-card.js
```

Note: `dist/bubble-rooms-card.js` only imports from `./rooms.js`, `./order.js`,
`./room-config.js` — copy those four files (`rooms.js`, `order.js`,
`room-config.js`, `styles.js`, `area-entities.js`) into `dist/` alongside it
so the relative imports resolve when Lovelace loads `dist/bubble-rooms-card.js`
as an ES module:

```bash
cp src/rooms.js src/order.js src/room-config.js src/styles.js src/area-entities.js dist/
```

- [ ] **Step 3: Commit**

```bash
git add src/bubble-rooms-card.js dist/
git commit -m "feat: add BubbleRoomsCard custom element"
```

- [ ] **Step 4: Manual verification — add as a Lovelace resource on the test dashboard**

Instructions to give the user (agentic workers should ask the user to
perform this step and report back, since it requires the user's live HA
instance):

1. Copy `dist/*.js` into the Home Assistant `www/bubble-rooms-card/` folder.
2. Settings → Dashboards → Resources → Add resource:
   URL `/local/bubble-rooms-card/bubble-rooms-card.js`, type **JavaScript module**.
3. Replace the `custom:auto-entities` card in `motion_rooms_card.yaml` with:

```yaml
type: custom:bubble-rooms-card
exclude_entities:
  - light.luci_sala
  - cover.tapparella_camera_sx
```

4. Reload the dashboard, click a light in a room that has a background
   (e.g. Sala), confirm no dark-border flash appears.

- [ ] **Step 5: Confirm no flash with the measurement script**

Run this in the browser console (or via the `javascript_tool` MCP tool) right
after loading the dashboard, then click a few lights/covers and re-check:

```javascript
function deepQueryAll(root, selector, out) {
  out = out || [];
  root.querySelectorAll(selector).forEach((el) => out.push(el));
  root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) deepQueryAll(el.shadowRoot, selector, out); });
  return out;
}
window.__ids = new WeakMap();
window.__nextId = 1;
window.__log = [];
window.__t0 = performance.now();
window.__interval = setInterval(() => {
  const t = Math.round(performance.now() - window.__t0);
  deepQueryAll(document, 'bubble-card').forEach((bc) => {
    if (!window.__ids.has(bc)) {
      window.__ids.set(bc, window.__nextId++);
      window.__log.push({ t, event: 'NEW_NODE', id: window.__ids.get(bc) });
    }
  });
}, 30);
'monitoring started';
```

Expected: after clicking lights/covers repeatedly for ~30s, `window.__log`
contains at most the initial `NEW_NODE` entries (one per room, at page load)
and no further `NEW_NODE` events — proving the same `bubble-card` DOM
instances are reused rather than recreated.

---

### Task 8: Publish to GitHub and install via HACS

**Files:** none (repo operations only).

- [ ] **Step 1: Create the GitHub repo and push**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
gh repo create portbusy/bubble-rooms-card --public --source=. --remote=origin --push
```

Expected: repo created at `https://github.com/portbusy/bubble-rooms-card`,
`main` branch pushed.

- [ ] **Step 2: Tag an initial release**

HACS requires at least one release/tag to treat the repo as installable.

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes "Initial release"
```

- [ ] **Step 3: Add as a custom repository in HACS**

Instructions for the user:
1. HACS → three-dot menu (top right) → **Custom repositories**.
2. Repository: `https://github.com/portbusy/bubble-rooms-card`, category **Dashboard**.
3. Install "Bubble Rooms Card" from the HACS list, reload the browser.
4. Confirm the resource was auto-added under Settings → Dashboards → Resources
   (HACS does this automatically); if not, add it manually as in Task 7 Step 4.

- [ ] **Step 4: Replace the old card in the dashboard**

Update `motion_rooms_card.yaml` (or wherever it's referenced in the dashboard)
to use `type: custom:bubble-rooms-card` as shown in Task 7 Step 4, remove the
old `custom:auto-entities` block.
