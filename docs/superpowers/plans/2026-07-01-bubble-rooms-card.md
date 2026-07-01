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

---

### Task 9: Configurable chained sort (`sort:` config option)

**Context:** `computeOrder` (Task 4) hardcodes the sort key (active-then-recency).
The user wants to choose the sort criteria themselves via config, mirroring
the Jinja pattern they used in the original template:

```jinja
| sort(attribute='last_changed', reverse=true)
| sort(attribute='state', reverse=true)
```

Jinja's `sort` filter is stable, so chaining two calls makes the *last* call
the primary key and the earlier call the tie-breaker for equal values on the
primary key. This task replaces `computeOrder` with a general chained-sort
function driven by a new `sort:` config array, applied with the same
stable-chained semantics, and removes the now-unused `computeOrder`.

**Files:**
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/sort.js`
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/sort.test.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/bubble-rooms-card.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/dist/bubble-rooms-card.js` (mirror src, no build step)
- Delete: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/order.js`
- Delete: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/order.test.js`
- Delete: `/Users/davidebertolotti/Downloads/bubble-rooms-card/dist/order.js`

**Interfaces:**
- Consumes: `resolveRooms` (Task 2) output shape `Array<{ entityId, areaId }>`.
- Produces: `sortRooms(hass, rooms, sortSteps)` → a **new** array (does not
  mutate `rooms`), sorted by applying each step in `sortSteps` in listed
  order via `Array.prototype.sort` (stable per spec since ES2019 — Node and
  all evergreen browsers guarantee this), so the **last** step in the array
  is the primary key and earlier steps are tie-breakers, exactly mirroring
  the Jinja chain above.
- `sortSteps` shape: `Array<{ attribute: 'state' | 'last_changed', reverse: boolean }>`.
  - `attribute: 'state'` compares `hass.states[entityId].state` (string,
    ascending unless `reverse`).
  - `attribute: 'last_changed'` compares `new Date(hass.states[entityId].last_changed).getTime()`
    (number, ascending unless `reverse`).
- Default when `sort:` is omitted from card config:
  `[{ attribute: 'last_changed', reverse: true }, { attribute: 'state', reverse: true }]`
  — this reproduces today's behavior (active rooms first, most-recent-first
  within a state group) with no config needed.
- `bubble-rooms-card.js` no longer imports `computeOrder`; it calls
  `sortRooms(hass, rooms, this._config.sort)` once per `hass` update and
  assigns `wrapper.style.order = String(index)` using the position in the
  returned sorted array, instead of a computed numeric key.

- [ ] **Step 1: Write the failing test**

```javascript
// test/sort.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortRooms } from '../src/sort.js';

function hassWith(states) {
  return { states };
}

test('default-equivalent steps: state desc primary, last_changed desc tie-breaker', () => {
  const rooms = [
    { entityId: 'binary_sensor.bagno', areaId: 'bagno' },
    { entityId: 'binary_sensor.camera', areaId: 'camera' },
    { entityId: 'binary_sensor.sala', areaId: 'sala' }
  ];
  const hass = hassWith({
    'binary_sensor.bagno': { state: 'off', last_changed: '2026-07-01T09:00:00Z' },
    'binary_sensor.camera': { state: 'on', last_changed: '2026-07-01T08:00:00Z' },
    'binary_sensor.sala': { state: 'on', last_changed: '2026-07-01T10:00:00Z' }
  });
  const sorted = sortRooms(hass, rooms, [
    { attribute: 'last_changed', reverse: true },
    { attribute: 'state', reverse: true }
  ]);
  assert.deepEqual(sorted.map((r) => r.entityId), [
    'binary_sensor.sala',   // on, most recent among 'on'
    'binary_sensor.camera', // on, older
    'binary_sensor.bagno'   // off
  ]);
});

test('sortRooms does not mutate the input array', () => {
  const rooms = [
    { entityId: 'binary_sensor.b', areaId: 'b' },
    { entityId: 'binary_sensor.a', areaId: 'a' }
  ];
  const original = [...rooms];
  const hass = hassWith({
    'binary_sensor.a': { state: 'on', last_changed: '2026-07-01T09:00:00Z' },
    'binary_sensor.b': { state: 'off', last_changed: '2026-07-01T10:00:00Z' }
  });
  sortRooms(hass, rooms, [{ attribute: 'state', reverse: true }]);
  assert.deepEqual(rooms, original);
});

test('a single ascending state sort puts off before on', () => {
  const rooms = [
    { entityId: 'binary_sensor.on_one', areaId: 'x' },
    { entityId: 'binary_sensor.off_one', areaId: 'y' }
  ];
  const hass = hassWith({
    'binary_sensor.on_one': { state: 'on', last_changed: '2026-07-01T09:00:00Z' },
    'binary_sensor.off_one': { state: 'off', last_changed: '2026-07-01T09:00:00Z' }
  });
  const sorted = sortRooms(hass, rooms, [{ attribute: 'state', reverse: false }]);
  assert.deepEqual(sorted.map((r) => r.entityId), ['binary_sensor.off_one', 'binary_sensor.on_one']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/sort.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/sort.js
function attributeValue(hass, entityId, attribute) {
  const state = hass.states[entityId];
  if (!state) return null;
  if (attribute === 'last_changed') {
    return new Date(state.last_changed).getTime();
  }
  return state.state;
}

function compareStep(hass, step, entityIdA, entityIdB) {
  const a = attributeValue(hass, entityIdA, step.attribute);
  const b = attributeValue(hass, entityIdB, step.attribute);
  let result = 0;
  if (a < b) result = -1;
  else if (a > b) result = 1;
  return step.reverse ? -result : result;
}

export function sortRooms(hass, rooms, sortSteps) {
  let sorted = rooms.slice();
  for (const step of sortSteps) {
    sorted = sorted
      .slice()
      .sort((a, b) => compareStep(hass, step, a.entityId, b.entityId));
  }
  return sorted;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS, no failures. `order.test.js` still exists at this point (it's
deleted later, in Step 6) so the total count includes both the old
`computeOrder` tests and the new `sort.test.js` tests — don't worry about
matching an exact number, just confirm zero failures.

- [ ] **Step 5: Wire `sortRooms` into the custom element**

In `src/bubble-rooms-card.js`:
- Remove `import { computeOrder } from './order.js';`
- Add `import { sortRooms } from './sort.js';`
- In `setConfig`, add to `this._config`:
  ```javascript
  sort: config.sort || [
    { attribute: 'last_changed', reverse: true },
    { attribute: 'state', reverse: true }
  ]
  ```
- In `_updateHass` (or wherever `rooms` is computed via `resolveRooms`),
  replace the per-room `wrapper.style.order = String(computeOrder(hass, entityId))`
  assignment with: compute `const sortedRooms = sortRooms(hass, rooms, this._config.sort);`
  once, then after the existing create/update loop (which can keep iterating
  over the original `rooms` order for creation/update purposes), assign order
  by position in `sortedRooms`:
  ```javascript
  sortedRooms.forEach((room, index) => {
    const entry = this._rooms.get(room.entityId);
    if (entry) entry.wrapper.style.order = String(index);
  });
  ```
- Copy the same change into `dist/bubble-rooms-card.js` (keep identical).

- [ ] **Step 6: Delete the superseded `computeOrder` files**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
git rm src/order.js test/order.test.js dist/order.js
```

- [ ] **Step 7: Copy `sort.js` into `dist/` and verify**

```bash
cp src/sort.js dist/sort.js
node --check src/bubble-rooms-card.js
node --check dist/bubble-rooms-card.js
diff src/bubble-rooms-card.js dist/bubble-rooms-card.js
npm test
```

Expected: `node --check` passes for both files, `diff` shows no output, all
tests pass (no reference to `computeOrder`/`order.js` remains anywhere in
`src/`, `dist/`, or `test/`).

- [ ] **Step 8: Commit**

```bash
git add src/sort.js test/sort.test.js src/bubble-rooms-card.js dist/
git commit -m "feat: replace fixed computeOrder with configurable chained sort"
```

- [ ] **Step 9: Update README.md**

Add a `sort` row to the configuration table and a short example, matching
the style of the existing `label`/`name_strip_prefix`/`exclude_entities`
rows:

```markdown
| `sort` | `[{attribute: last_changed, reverse: true}, {attribute: state, reverse: true}]` | Chained sort steps (like Jinja's `sort()` filter chained calls — the *last* step is the primary key, earlier steps are tie-breakers). Each step: `attribute` (`state` or `last_changed`) and `reverse` (boolean). |
```

Commit:

```bash
git add README.md
git commit -m "docs: document the sort config option"
```

---

### Task 10: "Open in Home Assistant" HACS badge in README

**Context:** The user wants a one-click button on the GitHub repo landing page
(rendered from README.md) that opens the user's own Home Assistant instance
directly to the "add this HACS repository" screen, instead of manually
copy-pasting the URL into HACS's custom-repositories dialog. Home Assistant
provides a standard badge + redirect link for exactly this
(`my.home-assistant.io`).

**Files:**
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/README.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Add the badge**

Insert this immediately under the `# Bubble Rooms Card` heading, above the
existing description paragraph:

```markdown
[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=portbusy&repository=bubble-rooms-card&category=plugin)
```

- [ ] **Step 2: Simplify the manual "Installation (HACS)" section**

Since the badge now does steps 1-2 automatically, reduce the existing
3-step manual list to 2 steps (keep the manual path documented as a
fallback for users who don't want to click the badge):

```markdown
## Installation (HACS)

Click the badge above (opens HACS's "add repository" screen directly in
your own Home Assistant instance), or add manually:

1. HACS → the three-dot menu → **Custom repositories**.
2. Add `https://github.com/portbusy/bubble-rooms-card`, category **Dashboard**.
3. Install "Bubble Rooms Card", reload resources.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
git add README.md
git commit -m "docs: add My Home Assistant one-click HACS install badge"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

### Task 11: Visual config editor via `getConfigForm`

**Context:** Right now the card can only be configured by hand-editing YAML.
The user wants a GUI editor, like most Lovelace cards have, so `label`,
`name_strip_prefix`, and `exclude_entities` can be set through form fields in
the dashboard's card editor instead of YAML. Home Assistant supports this
without writing a custom editor element or pulling in LitElement: a card
class can define `static getConfigForm()` returning `{ schema, computeLabel }`,
and the Lovelace editor host renders the form itself via its built-in
`<ha-form>` component and writes the result back through the normal
`setConfig()` path — no manual event wiring needed.

`sort` is intentionally left out of the visual editor (it's a list of
objects with two possible attribute values each — not a good fit for a
simple form, and the default already reproduces today's behavior). Advanced
users can still set it via the YAML editor, which every Lovelace card
supports regardless of `getConfigForm`.

**Files:**
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/bubble-rooms-card.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/dist/bubble-rooms-card.js` (mirror src, no build step)

**Interfaces:**
- Produces: `static getConfigForm()` on the `BubbleRoomsCard` class, and
  `static getStubConfig()` returning the config the "Add Card" picker starts
  new instances of this card with.

- [ ] **Step 1: Add `getStubConfig` and `getConfigForm` to the class**

Read the current `src/bubble-rooms-card.js` first (it already has
`setConfig`, the `set hass`/`_updateHass` pair, and `getCardSize`) — add
these two static methods to the `BubbleRoomsCard` class, alongside the
existing instance methods (order doesn't matter within the class body):

```javascript
static getStubConfig() {
  return {
    label: 'gruppo_movimento_stanza',
    name_strip_prefix: 'Sensori movimento ',
    exclude_entities: []
  };
}

static getConfigForm() {
  return {
    schema: [
      { name: 'label', selector: { text: {} } },
      { name: 'name_strip_prefix', selector: { text: {} } },
      { name: 'exclude_entities', selector: { entity: { multiple: true } } }
    ],
    computeLabel(schemaItem) {
      const labels = {
        label: 'Label',
        name_strip_prefix: 'Name prefix to strip',
        exclude_entities: 'Excluded entities'
      };
      return labels[schemaItem.name] || schemaItem.name;
    }
  };
}
```

- [ ] **Step 2: Copy the same two methods into `dist/bubble-rooms-card.js`**

`src/bubble-rooms-card.js` and `dist/bubble-rooms-card.js` must stay
identical (no build step). Apply the exact same edit to both files.

- [ ] **Step 3: Verify with `node --check`**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
node --check src/bubble-rooms-card.js
node --check dist/bubble-rooms-card.js
diff src/bubble-rooms-card.js dist/bubble-rooms-card.js
```

Expected: both `node --check` calls succeed, `diff` shows no output.

- [ ] **Step 4: Commit**

```bash
git add src/bubble-rooms-card.js dist/bubble-rooms-card.js
git commit -m "feat: add visual config editor via getConfigForm"
```

- [ ] **Step 5: Manual verification (requires a live Home Assistant instance)**

This cannot be automated — a human must confirm it in the browser:
1. Update the HACS-installed copy or reload the resource on the test
   dashboard (HACS "Redownload" or update to the new commit).
2. In the dashboard editor, add a new card, search for "Bubble Rooms Card"
   (this also confirms Task 12's card-picker registration, if done first).
3. Confirm the card's edit dialog shows a form with "Label", "Name prefix to
   strip", and "Excluded entities" fields instead of only a YAML box, and
   that changing a field value updates the live preview.

---

### Task 12: Card-picker registration (`window.customCards`)

**Context:** Today, adding this card to a dashboard requires typing
`type: custom:bubble-rooms-card` by hand in the YAML editor — it doesn't
appear in Home Assistant's "Add Card" picker dialog like built-in and other
HACS-installed cards do. Home Assistant's card picker reads a well-known
global array, `window.customCards`, that any custom card module can push an
entry onto when it loads. This task adds that registration so the card
appears in the picker with a name/description, without needing HACS's
separate (unrelated) card-picker manifest.

**Files:**
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/bubble-rooms-card.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/dist/bubble-rooms-card.js` (mirror src, no build step)

**Interfaces:** none new (this is a side-effecting registration at module
load time, not a function other code calls).

- [ ] **Step 1: Register the card**

At the bottom of `src/bubble-rooms-card.js`, right after the existing
`customElements.define('bubble-rooms-card', BubbleRoomsCard);` line, add:

```javascript
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'bubble-rooms-card',
  name: 'Bubble Rooms Card',
  description: 'One bubble-card button per room, auto-discovered by label, with no DOM-recreation flash on state updates.',
  preview: false,
  documentationURL: 'https://github.com/portbusy/bubble-rooms-card'
});
```

- [ ] **Step 2: Copy the same block into `dist/bubble-rooms-card.js`**

Apply the exact same edit to both files so they stay identical.

- [ ] **Step 3: Verify with `node --check`**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
node --check src/bubble-rooms-card.js
node --check dist/bubble-rooms-card.js
diff src/bubble-rooms-card.js dist/bubble-rooms-card.js
```

Expected: both succeed, `diff` shows no output.

- [ ] **Step 4: Commit**

```bash
git add src/bubble-rooms-card.js dist/bubble-rooms-card.js
git commit -m "feat: register in the Lovelace Add Card picker"
```

- [ ] **Step 5: Push and tag a new release**

HACS/Lovelace resource caching means the user needs to update/redownload
through HACS to pick up the new commit; tagging a new version makes that
update visible in the HACS UI as an available update.

```bash
git push origin main
git tag v0.2.0
git push origin v0.2.0
gh release create v0.2.0 --title "v0.2.0" --notes "Add sort config, visual editor, card-picker registration, and HACS one-click install badge."
```

- [ ] **Step 6: Manual verification (requires a live Home Assistant instance)**

A human must confirm: in HACS, "Bubble Rooms Card" shows an available
update to v0.2.0; after updating and reloading the dashboard, "Bubble Rooms
Card" appears when searching in the "Add Card" dialog (not just available
via manual YAML).

---

### Task 13: Sort preset dropdown in the visual editor

**Context:** Task 11 deliberately left `sort` out of `getConfigForm` because
it's an array of `{attribute, reverse}` objects, not a simple form field.
The user still wants to choose a sort behavior from the visual editor, so
this task adds a `sort_preset` select field with a few named, pre-built
combinations. `setConfig` translates the selected preset into the real
`sort` array. An explicit raw `sort:` key in YAML (already supported since
Task 9) still overrides the preset, for advanced users who want a
combination not covered by the presets.

**Files:**
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/bubble-rooms-card.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/dist/bubble-rooms-card.js` (mirror src, no build step)
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/sort-presets.js`
- Create: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/sort-presets.test.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/README.md`

**Interfaces:**
- Consumes: nothing new from prior tasks besides `sortRooms`'s existing
  `sortSteps` shape (Task 9): `Array<{ attribute: 'state' | 'last_changed', reverse: boolean }>`.
- Produces: `SORT_PRESETS`, an exported `Record<string, { label: string, steps: Array<{attribute, reverse}> }>`
  from `src/sort-presets.js`, and `resolveSortSteps(config)` → `Array<{attribute, reverse}>`,
  which implements the precedence: explicit `config.sort` wins if present,
  otherwise look up `config.sort_preset` in `SORT_PRESETS` (falling back to
  the `'active_recent'` preset if the value is missing or unrecognized).

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/sort-presets.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/sort-presets.js
export const SORT_PRESETS = {
  active_recent: {
    label: 'Attivo prima, poi più recente',
    steps: [
      { attribute: 'last_changed', reverse: true },
      { attribute: 'state', reverse: true }
    ]
  },
  recent: {
    label: 'Solo più recente',
    steps: [{ attribute: 'last_changed', reverse: true }]
  },
  active: {
    label: 'Solo stato (attivo prima)',
    steps: [{ attribute: 'state', reverse: true }]
  },
  none: {
    label: 'Nessuno (ordine alfabetico entity_id)',
    steps: []
  }
};

export function resolveSortSteps(config) {
  if (config.sort) return config.sort;
  const preset = SORT_PRESETS[config.sort_preset];
  return preset ? preset.steps : SORT_PRESETS.active_recent.steps;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS, no failures (all prior tests plus the 4 new ones).

- [ ] **Step 5: Wire into the custom element**

Read the current `src/bubble-rooms-card.js` first. Changes:
- Add `import { SORT_PRESETS, resolveSortSteps } from './sort-presets.js';`
- In `setConfig`, replace the existing
  `sort: config.sort || [{ attribute: 'last_changed', reverse: true }, { attribute: 'state', reverse: true }]`
  line with storing the raw config and resolving lazily in `_updateHass`
  instead — simplest correct approach: keep `this._config` holding the
  original `config` object's `sort` and `sort_preset` keys as given (don't
  precompute), i.e.:
  ```javascript
  this._config = {
    label: config.label || 'gruppo_movimento_stanza',
    name_strip_prefix: config.name_strip_prefix || 'Sensori movimento ',
    exclude_entities: config.exclude_entities || [],
    sort: config.sort,
    sort_preset: config.sort_preset
  };
  ```
- In `_updateHass`, where `sortRooms(hass, rooms, this._config.sort)` is
  currently called, change it to:
  ```javascript
  const sortSteps = resolveSortSteps(this._config);
  const sortedRooms = sortRooms(hass, rooms, sortSteps);
  ```
- In `getConfigForm()`'s `schema` array, add a new field for the preset
  select, built from `SORT_PRESETS` so the options list and the preset
  definitions can't drift apart:
  ```javascript
  {
    name: 'sort_preset',
    selector: {
      select: {
        options: Object.entries(SORT_PRESETS).map(([value, preset]) => ({
          value,
          label: preset.label
        }))
      }
    }
  }
  ```
- In `getConfigForm()`'s `computeLabel`, add a label for the new field:
  `sort_preset: 'Ordinamento'` alongside the existing three entries.
- In `getStubConfig()`, add `sort_preset: 'active_recent'` to the returned
  defaults object.
- Copy every change into `dist/bubble-rooms-card.js` identically, and also
  copy `src/sort-presets.js` to `dist/sort-presets.js`.

- [ ] **Step 6: Verify**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
node --check src/bubble-rooms-card.js
node --check dist/bubble-rooms-card.js
diff src/bubble-rooms-card.js dist/bubble-rooms-card.js
diff src/sort-presets.js dist/sort-presets.js
npm test
```

Expected: both `node --check` calls succeed, both `diff` calls show no
output, `npm test` passes with zero failures.

- [ ] **Step 7: Commit**

```bash
git add src/sort-presets.js test/sort-presets.test.js src/bubble-rooms-card.js dist/
git commit -m "feat: add sort_preset dropdown to the visual editor"
```

- [ ] **Step 8: Update README.md**

Add a `sort_preset` row to the configuration table (placed before the
existing `sort` row, since it's the simpler/preferred option for most
users):

```markdown
| `sort_preset` | `active_recent` | Named sort preset chosen from the visual editor's dropdown: `active_recent`, `recent`, `active`, or `none`. Ignored if `sort` is also set. |
```

Commit:

```bash
git add README.md
git commit -m "docs: document the sort_preset config option"
```

- [ ] **Step 9: Push and tag a new release**

```bash
git push origin main
git tag v0.3.0
git push origin v0.3.0
gh release create v0.3.0 --title "v0.3.0" --notes "Add sort_preset dropdown to the visual editor."
```

- [ ] **Step 10: Manual verification (requires a live Home Assistant instance)**

A human must confirm: after updating via HACS, the card's visual editor
shows an "Ordinamento" dropdown with the four preset labels, and changing
it visibly reorders the room cards on the dashboard.

---

### Task 14: Theme-following colors via Bubble Card / Home Assistant CSS variables

**Context:** `buildRoomStyles` (Task 5) hardcodes its own color palette (a
fixed purple accent, a fixed honey/slate palette for light/cover
sub-buttons). The user wants the card to instead follow whatever colors
Bubble Card and the user's Home Assistant theme already use by default,
while KEEPING this project's own visual effects: the glass blur, the
box-shadow layering, the border, and the slow 180s fade-to-neutral
transition when a room goes inactive.

Two concrete findings from research (Bubble Card v3.2.3, README's
"Global CSS variables"/"Button options" sections and its `.is-on`/`.is-off`
state classes) drive this task:

1. Every light/cover sub-button in `bottomButtons` already has
   `state_background: true` set (unchanged since Task 5) — Bubble Card
   already colors these itself based on entity state, using its own
   `--bubble-sub-button-background-color` variable and `.is-on`/`.is-off`
   classes. Our hardcoded per-index honey/slate CSS
   (`.bubble-sub-button-N { background: ...; color: ...; }`) was
   overriding that native theming instead of complementing it. This task
   REMOVES that per-index color CSS entirely — sub-buttons fall back to
   Bubble Card's own default theming. This also means `idx`/the
   sub-button CSS-index tracking in `buildRoomStyles` is no longer needed
   at all (bottomButtons themselves are still built the same way, just
   without generating any accompanying CSS for them).

2. For the main card's background/icon/text colors, replace the hardcoded
   hex/rgba constants with CSS custom properties: Bubble Card's own
   `--bubble-main-background-color`, `--bubble-icon-background-color`,
   `--bubble-accent-color`, combined via `color-mix()` with Home
   Assistant's global `--card-background-color`/`--primary-text-color`/
   `--secondary-text-color` for the neutral/inactive look. This makes the
   card automatically match the user's actual theme (including dark
   themes) instead of a fixed purple palette.

**Files:**
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/src/styles.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/test/styles.test.js`
- Modify: `/Users/davidebertolotti/Downloads/bubble-rooms-card/dist/styles.js` (mirror src, no build step)

**Interfaces:**
- `buildRoomStyles(hass, entityId, areaId, excludeEntities)` keeps its
  existing signature and return shape `{ css: string, bottomButtons: Array<...> }`
  (Task 5/6's contract — `room-config.js` and `bubble-rooms-card.js` are
  unaffected by this task and need no changes).
- `bottomButtons`'s shape is unchanged (still includes `state_background: true`
  per entry) — only the CSS-generation side loses the per-index color rules.

- [ ] **Step 1: Update the failing/changed tests first**

Read the current `test/styles.test.js` (from Task 5) — replace the color
assertions with the new variable-based ones. Replace the entire file with:

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

test('active room uses a bubble-accent-tinted background and 0.45s transition', () => {
  const hass = baseHass();
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: color-mix\(in srgb, var\(--bubble-main-background-color\) 20%, transparent\) !important/);
  assert.match(css, /transition: background-color 0\.45s ease, color 0\.45s ease !important/);
});

test('inactive room uses a neutral card-background-color mix and 180s transition', () => {
  const hass = baseHass({ states: { 'binary_sensor.sala_motion': { state: 'off' } } });
  const { css } = buildRoomStyles(hass, 'binary_sensor.sala_motion', 'sala', []);
  assert.match(css, /background: color-mix\(in srgb, var\(--card-background-color, #fff\) 40%, transparent\) !important/);
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
  assert.match(css, /\.bubble-icon-container \{\n {2}background: color-mix\(in srgb, var\(--card-background-color, #fff\) 55%, transparent\) !important;/);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — the new assertions don't match the current (Task 5)
hardcoded-hex implementation.

- [ ] **Step 3: Rewrite `src/styles.js`**

```javascript
// src/styles.js
import { areaEntities } from './area-entities.js';

export function buildRoomStyles(hass, entityId, areaId, excludeEntities) {
  const attivo = hass.states[entityId] && hass.states[entityId].state === 'on';
  const trans = attivo
    ? 'background-color 0.45s ease, color 0.45s ease'
    : 'background-color 180s linear, color 180s linear';
  const cardBg = attivo
    ? 'color-mix(in srgb, var(--bubble-main-background-color) 20%, transparent)'
    : 'color-mix(in srgb, var(--card-background-color, #fff) 40%, transparent)';
  const iconBg = attivo
    ? 'var(--bubble-icon-background-color)'
    : 'color-mix(in srgb, var(--card-background-color, #fff) 55%, transparent)';
  const iconFg = attivo ? '#ffffff' : 'var(--secondary-text-color)';
  const stateFg = attivo ? 'var(--bubble-accent-color)' : 'var(--secondary-text-color)';

  const excluded = new Set(excludeEntities || []);
  const lights = areaEntities(hass, areaId, 'light').filter((e) => !excluded.has(e));
  const covers = areaEntities(hass, areaId, 'cover').filter((e) => !excluded.has(e));

  const bottomButtons = [];
  for (const light of lights) {
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
    '.bubble-name { color: var(--primary-text-color) !important; font-weight: 600 !important; letter-spacing: -0.02em !important; }\n' +
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
    '@media (prefers-reduced-motion: reduce) {\n' +
    '  ha-card, .bubble-icon-container, .bubble-icon, .bubble-state, .bubble-last-changed { transition: none !important; }\n' +
    '}\n'
  );

  return { css, bottomButtons };
}
```

Note what's deliberately removed vs. Task 5's version: the `ns`/`idx`
namespace, the per-light/per-cover CSS-class-generation loops, and the
`subButtonCss` concatenation — bottomButtons are now built with two plain
loops with no side CSS, since Bubble Card themes sub-buttons itself via
`state_background: true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/davidebertolotti/Downloads/bubble-rooms-card && npm test`
Expected: PASS, no failures.

- [ ] **Step 5: Copy to `dist/` and verify**

```bash
cd /Users/davidebertolotti/Downloads/bubble-rooms-card
cp src/styles.js dist/styles.js
node --check src/styles.js
node --check dist/styles.js
diff src/styles.js dist/styles.js
npm test
```

Expected: both `node --check` calls succeed, `diff` shows no output, all
tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/styles.js test/styles.test.js dist/styles.js
git commit -m "feat: follow Bubble Card/theme colors instead of a hardcoded palette"
```

- [ ] **Step 7: Push and tag a new release**

```bash
git push origin main
git tag v0.4.0
git push origin v0.4.0
gh release create v0.4.0 --title "v0.4.0" --notes "Colors now follow Bubble Card's own theme variables and Home Assistant's global theme (light/dark aware) instead of a fixed palette. Light/cover sub-buttons rely on Bubble Card's native state_background theming instead of a hardcoded honey/slate palette."
```

- [ ] **Step 8: Manual verification (requires a live Home Assistant instance)**

A human must confirm: after updating via HACS, room cards visually follow
the current Home Assistant theme's accent/background colors instead of the
old fixed purple/honey palette, and still show the glass-blur effect and
the same 0.45s/180s transition timing when a room's motion state changes.
