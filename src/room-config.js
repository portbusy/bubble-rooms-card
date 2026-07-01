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
