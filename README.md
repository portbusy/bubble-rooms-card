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
| `sort` | `[{attribute: last_changed, reverse: true}, {attribute: state, reverse: true}]` | Chained sort steps (like Jinja's `sort()` filter chained calls — the *last* step is the primary key, earlier steps are tie-breakers). Each step: `attribute` (`state` or `last_changed`) and `reverse` (boolean). |
