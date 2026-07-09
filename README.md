# Bubble Rooms Card

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=portbusy&repository=bubble-rooms-card&category=plugin)

Custom Lovelace card for Home Assistant that renders beautiful room cards from
native Home Assistant areas and entities. The recommended `rooms` mode does not
depend on Bubble Card; the older label-based Bubble Card mode is still supported
for existing dashboards.

## Requirements

- Home Assistant 2026.7 or newer is the target baseline for the visual editor selectors.
- [Bubble Card](https://github.com/Clooos/Bubble-Card) >= 3.2.3 is required only for the legacy label mode.

## Installation (HACS)

Click the badge above (opens HACS's "add repository" screen directly in
your own Home Assistant instance), or add manually:

1. HACS → the three-dot menu → **Custom repositories**.
2. Add `https://github.com/portbusy/bubble-rooms-card`, category **Dashboard**.
3. Install "Bubble Rooms Card", reload resources.

## Configuration

### Native rooms mode (recommended)

```yaml
type: custom:bubble-rooms-card
rooms:
  - name: Sala
    area: sala
    icon: mdi:sofa
    color: "#b98270"
    motion: binary_sensor.sala_motion
    lights:
      - light.luce_madia
      - light.interruttore_sala
    covers:
      - cover.tapparella_sala
    temperature: sensor.sala_temperatura
    humidity: sensor.sala_umidita
    illuminance: sensor.sala_lux
    summary_action: more-info
    navigate: "#sala"
```

If `rooms` contains at least one item, Bubble Rooms Card uses its native renderer
and ignores the legacy Bubble Card generation options. The visual editor now
shows only this native room form. Each room can be configured from Home
Assistant's visual editor using native area, entity, icon, boolean, select, and
color selectors.

| Room key | Default | Description |
|---|---|---|
| `area` | required for auto-discovery | Home Assistant area id. Used for name/icon fallback and for automatic entity lookup. |
| `name` | area name | Display name. |
| `icon` | area icon or `mdi:home` | Main room icon. |
| `color` | automatic room palette | Accent color for active state, controls, and card atmosphere. |
| `foreground` | automatic contrast | Optional text color for active cards. |
| `auto_entities` | `true` | When enabled, missing `lights` and `covers` are discovered from the selected area. |
| `motion` | none | Motion/presence binary sensor. Drives the main active/resting state and last-changed badge. |
| `lights` | area lights | Light entities rendered as direct toggle controls. |
| `covers` | area covers | Cover entities rendered as direct toggle controls. |
| `temperature` | none | Temperature sensor shown as a metric chip. |
| `humidity` | none | Humidity sensor shown as a metric chip. |
| `illuminance` | none | Illuminance sensor shown as a metric chip. |
| `summary_action` | `more-info` | Action for metric and summary chips: `more-info`, `toggle`, `navigate`, or `none`. |
| `summary_entity` | chip entity | Optional entity override for the summary action. |
| `summary_navigation_path` | none | Navigation path used when `summary_action` is `navigate`. |
| `summary_tap_action` | none | Advanced YAML action object. Example: `{action: toggle, entity_id: light.sala_madia}`. |
| `navigate` | none | Optional dashboard path/hash when tapping the room card. Without it, tapping opens more-info for `motion`. |

Metric and summary chips are secondary actions and default to more-info. Right
click / long context menu on a chip or control opens more-info; normal tap on a
control toggles the entity through `homeassistant.toggle`.

### Legacy label mode

```yaml
type: custom:bubble-rooms-card
label: gruppo_movimento_stanza        # default
name_strip_prefix: "Sensori movimento "
exclude_entities:
  - light.luci_sala
  - cover.tapparella_camera_sx
design: hero
color_mode: auto
show_summary: false
room_links:
  sala: "#sala"
room_colors:
  sala:
    color: "#b98270"
    foreground: "#ffffff"
  camera: "#9baee8"
sort:
  - attribute: last_changed
    reverse: true
  - attribute: state
    reverse: true
```

| Key | Default | Description |
|---|---|---|
| `label` | `gruppo_movimento_stanza` | Label applied to motion-sensor entities that should get a room card. |
| `name_strip_prefix` | `"Sensori movimento "` | Prefix stripped from the sensor's friendly name to get the room name. |
| `exclude_entities` | `[]` | Entity IDs excluded from the light/cover sub-buttons. |
| `design` | `hero` | Visual preset: `hero`, `soft`, or `minimal`. |
| `color_mode` | `auto` | Color behavior: `auto` assigns a warm room color, `manual` only uses `room_colors`, `off` keeps a neutral Bubble Card look. |
| `show_summary` | `false` | Experimental: shows compact summary chips for active lights/covers when Bubble Card renders the main sub-button slot reliably. |
| `room_links` | `{}` | Optional tap target per room. Keys can be the motion sensor `entity_id`, the `area_id`, or the displayed room name; values are dashboard paths or hashes like `#sala`. |
| `room_colors` | `{}` | Optional color per room. Keys can be the motion sensor `entity_id`, the `area_id`, or the displayed room name. Values can be a CSS color string or `{color, foreground}`. Explicit colors override the automatic palette and are applied through Bubble Card variables for that room only. |
| `sort_preset` | `active_recent` | Named sort preset chosen from the visual editor's dropdown: `active_recent`, `recent`, `active`, or `none`. Ignored if `sort` is also set. |
| `sort` | `[{attribute: last_changed, reverse: true}, {attribute: state, reverse: true}]` | Chained sort steps (like Jinja's `sort()` filter chained calls — the *last* step is the primary key, earlier steps are tie-breakers). Each step: `attribute` (`state` or `last_changed`) and `reverse` (boolean). |
