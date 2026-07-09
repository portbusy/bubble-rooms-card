# Bubble Rooms Card

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=portbusy&repository=bubble-rooms-card&category=plugin)

Custom Lovelace card for Home Assistant that renders one [Bubble Card](https://github.com/Clooos/Bubble-Card)
button per room, auto-discovered from a label on motion-sensor entities.
Unlike `auto-entities` + a Jinja template, this card keeps the same
`bubble-card` DOM instances alive across state updates (no destroy/recreate),
so there's no flash of unstyled content when any tracked entity changes.

## Requirements

- [Bubble Card](https://github.com/Clooos/Bubble-Card) >= 3.2.3, installed via HACS.

## Installation (HACS)

Click the badge above (opens HACS's "add repository" screen directly in
your own Home Assistant instance), or add manually:

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
design: hero
color_mode: auto
show_summary: true
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
| `show_summary` | `true` | Shows compact summary chips for active lights/covers in the room header. |
| `room_links` | `{}` | Optional tap target per room. Keys can be the motion sensor `entity_id`, the `area_id`, or the displayed room name; values are dashboard paths or hashes like `#sala`. |
| `room_colors` | `{}` | Optional color per room. Keys can be the motion sensor `entity_id`, the `area_id`, or the displayed room name. Values can be a CSS color string or `{color, foreground}`. Explicit colors override the automatic palette and are applied through Bubble Card variables for that room only. |
| `sort_preset` | `active_recent` | Named sort preset chosen from the visual editor's dropdown: `active_recent`, `recent`, `active`, or `none`. Ignored if `sort` is also set. |
| `sort` | `[{attribute: last_changed, reverse: true}, {attribute: state, reverse: true}]` | Chained sort steps (like Jinja's `sort()` filter chained calls — the *last* step is the primary key, earlier steps are tie-breakers). Each step: `attribute` (`state` or `last_changed`) and `reverse` (boolean). |
