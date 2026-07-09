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
    automation: input_boolean.automazioni_sala
    window: binary_sensor.finestra_sala
    show_last_changed: true
    lights:
      - light.luce_madia
      - light.interruttore_sala
    lights_summary_entity: light.luci_sala
    covers:
      - cover.tapparella_sala
    covers_summary_entity: group.tapparelle_sala
    temperature: sensor.sala_temperatura
    humidity: sensor.sala_umidita
    illuminance: sensor.sala_lux
    tap_actions:
      card:
        action: navigate
        navigation_path: "#sala"
      window:
        action: more-info
      lights:
        action: toggle
      covers:
        action: more-info
```

If `rooms` contains at least one item, Bubble Rooms Card uses its native renderer
and ignores the legacy Bubble Card generation options. The visual editor now
shows only this native room form. Each room can be configured from Home
Assistant's visual editor using native area, entity, icon, boolean, select, and
color selectors. Each room has its own native Home Assistant form: after an
area is selected, movement, window, light, cover, and sensor selectors are
limited to entities assigned to that area, including entities that inherit the
area from their device.

| Room key | Default | Description |
|---|---|---|
| `area` | required for auto-discovery | Home Assistant area id. Used for name/icon fallback and for automatic entity lookup. |
| `name` | area name | Display name. |
| `icon` | area icon or `mdi:home` | Main room icon. |
| `color` | automatic room palette | Accent color for active state, controls, and card atmosphere. |
| `foreground` | automatic contrast | Optional text color for active cards. |
| `auto_entities` | `true` | When enabled, missing `lights` and `covers` are discovered from the selected area. |
| `motion` | none | Motion/presence binary sensor. Drives the presence dot and the last-changed badge. |
| `automation` | none | Optional `input_boolean` that drives the `Accesso` chip and toggles room automations on tap. Aliases: `automation_control`, `automation_entity`. It is intentionally not area-filtered because helpers are often global. |
| `show_last_changed` | `true` | Shows the relative-time badge, such as `7 ore fa`, when `motion` is configured. |
| `window` | none | Optional window/opening binary sensor. Renders a dedicated icon in the metric row and never reuses the cover state. Aliases: `window_sensor`, `opening_sensor`. |
| `lights` | area lights | Light entities rendered as controls. The default tap action toggles the touched entity. |
| `lights_summary_entity` | touched light | Optional group target for every light-chip action, for example `light.luci_sala`. Aliases: `light_summary_entity`, `lights_group`, `light_group`. |
| `covers` | area covers | Cover entities rendered as controls. The default tap action opens more-info for the touched entity. |
| `covers_summary_entity` | touched cover | Optional group target for every cover-chip action, for example `group.tapparelle_sala`. Aliases: `cover_summary_entity`, `covers_group`, `cover_group`. |
| `temperature` | none | Temperature sensor shown as a metric chip. |
| `humidity` | none | Humidity sensor shown as a metric chip. |
| `illuminance` | none | Illuminance sensor shown as a metric chip. |
| `tap_actions` | defaults by chip | Object containing `card`, `status`, `window`, `temperature`, `humidity`, `illuminance`, `lights`, and `covers`. Each value accepts the native Home Assistant UI action format. |

The visual editor exposes the same actions through the native **Azioni al tocco**
group: more-info, toggle, navigate, perform action, URL, or no action. Metric
chips default to more-info; lights default to toggle; covers default to
more-info. Legacy `summary_action`, `summary_entity`,
`summary_navigation_path`, `summary_tap_action`, and `navigate` are still
understood for existing YAML configurations.

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
