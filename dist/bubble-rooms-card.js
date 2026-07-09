// src/bubble-rooms-card.js
import { resolveRooms } from './rooms.js';
import { sortRooms } from './sort.js';
import { buildRoomConfig } from './room-config.js';
import { resolveSortSteps } from './sort-presets.js';
import { entityName, isActiveEntity, resolveNativeRooms } from './native-rooms.js';

const NATIVE_ROOM_STYLES = `
.brc-native-grid {
  display: grid;
  gap: 12px;
}
.brc-room {
  --brc-color: #8f9bd8;
  --brc-fg: #ffffff;
  position: relative;
  display: grid;
  gap: 0;
  padding: 0;
  overflow: hidden;
  border-radius: var(--ha-card-border-radius, 24px);
  border: 1px solid color-mix(in srgb, var(--brc-color) 18%, var(--divider-color, rgba(0, 0, 0, 0.12)));
  background: var(--card-background-color, #ffffff);
  color: var(--primary-text-color);
  box-shadow: var(--ha-card-box-shadow, 0 10px 28px rgba(0, 0, 0, 0.12));
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.brc-room:hover {
  transform: translateY(-1px);
}
.brc-room:focus-visible {
  outline: 2px solid var(--brc-color);
  outline-offset: 3px;
}
.brc-room--active {
  border-color: color-mix(in srgb, var(--brc-color) 70%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--brc-color) 28%, transparent);
}
.brc-room__hero {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  min-height: 118px;
  padding: 18px 18px 20px;
  color: var(--primary-text-color);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brc-color) 30%, var(--card-background-color, #ffffff)), color-mix(in srgb, var(--card-background-color, #ffffff) 82%, var(--brc-color)));
}
.brc-room--active .brc-room__hero {
  color: var(--brc-fg);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brc-color) 90%, #111827), color-mix(in srgb, var(--brc-color) 22%, var(--card-background-color, #ffffff)));
}
.brc-room__header,
.brc-room__meta,
.brc-room__summary,
.brc-room__controls {
  position: relative;
  z-index: 1;
}
.brc-room__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: start;
}
.brc-room__icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  color: var(--brc-color);
  background: color-mix(in srgb, var(--brc-color) 14%, var(--card-background-color, #ffffff));
  filter: drop-shadow(0 8px 10px color-mix(in srgb, var(--brc-color) 20%, transparent));
}
.brc-room--active .brc-room__icon {
  color: color-mix(in srgb, var(--brc-color) 78%, #111827);
  background: color-mix(in srgb, var(--brc-fg) 80%, transparent);
}
.brc-room__icon ha-icon {
  --mdc-icon-size: 34px;
}
.brc-room__title {
  min-width: 0;
}
.brc-room__name {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brc-room__state {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  opacity: 0.82;
}
.brc-room__badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: color-mix(in srgb, var(--card-background-color, #ffffff) 62%, transparent);
  color: var(--secondary-text-color);
}
.brc-room--active .brc-room__badge {
  background: color-mix(in srgb, var(--brc-fg) 22%, transparent);
  color: var(--brc-fg);
}
.brc-room__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 30px;
}
.brc-room__metric,
.brc-room__summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 30px;
  padding: 0 2px;
  border-radius: 999px;
  border: 0;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
}
.brc-room--active .brc-room__metric,
.brc-room--active .brc-room__summary-pill {
  background: transparent;
  color: var(--brc-fg);
}
.brc-room__metric:hover,
.brc-room__summary-pill:hover {
  color: color-mix(in srgb, var(--brc-color) 78%, #111827);
}
.brc-room__metric ha-icon,
.brc-room__summary-pill ha-icon,
.brc-control ha-icon {
  --mdc-icon-size: 18px;
}
.brc-room__controls {
  padding: 16px 18px 18px;
  background: var(--card-background-color, #ffffff);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.brc-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 46px;
  padding: 0 18px;
  border: 1px solid color-mix(in srgb, var(--brc-color) 16%, var(--divider-color, rgba(0, 0, 0, 0.12)));
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 750;
  color: var(--primary-text-color);
  background: color-mix(in srgb, var(--card-background-color, #ffffff) 82%, var(--brc-color));
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.14);
  cursor: pointer;
}
.brc-control__label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.brc-control--active {
  color: color-mix(in srgb, var(--brc-color) 72%, #111827);
  background: color-mix(in srgb, var(--brc-color) 18%, var(--card-background-color, #ffffff));
  border-color: transparent;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
}
.brc-room--active .brc-control {
  background: color-mix(in srgb, var(--brc-fg) 92%, var(--brc-color));
  color: color-mix(in srgb, var(--brc-color) 70%, #111827);
}
.brc-room--active .brc-control--active {
  background: color-mix(in srgb, var(--brc-color) 18%, var(--brc-fg));
  color: color-mix(in srgb, var(--brc-color) 82%, #111827);
}
.brc-control--status {
  color: var(--primary-text-color);
  background: color-mix(in srgb, var(--brc-color) 10%, var(--card-background-color, #ffffff));
}
.brc-control--status.brc-control--active {
  color: var(--primary-text-color);
  background: color-mix(in srgb, var(--brc-color) 16%, var(--card-background-color, #ffffff));
}
@media (max-width: 520px) {
  .brc-room {
    border-radius: 20px;
  }
  .brc-room__hero {
    min-height: 112px;
    padding: 16px;
  }
  .brc-room__header {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .brc-room__badge {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .brc-room__controls {
    padding: 14px 16px 16px;
  }
}
`;

class BubbleRoomsCard extends HTMLElement {
  setConfig(config) {
    this._config = {
      rooms: config.rooms,
      label: config.label || 'gruppo_movimento_stanza',
      name_strip_prefix: config.name_strip_prefix || 'Sensori movimento ',
      exclude_entities: config.exclude_entities || [],
      sort: config.sort,
      sort_preset: config.sort_preset,
      design: config.design || 'hero',
      color_mode: config.color_mode || (config.auto_room_colors === false ? 'off' : 'auto'),
      show_summary: config.show_summary === true,
      room_links: config.room_links || {},
      room_colors: config.room_colors || {},
      auto_room_colors: config.auto_room_colors !== false
    };
    this._rooms = new Map(); // entityId -> { wrapper: HTMLElement, el: HTMLElement }
    if (!this._container) {
      this._container = document.createElement('div');
      this.appendChild(this._container);
    }
  }

  set hass(hass) {
    this._updateHass(hass);
  }

  async _updateHass(hass) {
    this._hass = hass;
    if (this._hasNativeRooms()) {
      this._setMode('native');
      this._renderNativeRooms(hass);
      return;
    }

    this._setMode('legacy');
    if (!this._helpersPromise) {
      this._helpersPromise = window.loadCardHelpers();
    }
    this._helpers = await this._helpersPromise;

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
        excludeEntities: this._config.exclude_entities,
        roomColors: this._config.room_colors,
        autoRoomColors: this._config.auto_room_colors,
        colorMode: this._config.color_mode,
        design: this._config.design,
        showSummary: this._config.show_summary,
        roomLinks: this._config.room_links
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
    }

    for (const [entityId, entry] of this._rooms) {
      if (!seen.has(entityId)) {
        entry.wrapper.remove();
        this._rooms.delete(entityId);
      }
    }

    const sortSteps = resolveSortSteps(this._config);
    const sortedRooms = sortRooms(hass, rooms, sortSteps);
    sortedRooms.forEach((room, index) => {
      const entry = this._rooms.get(room.entityId);
      if (entry) entry.wrapper.style.order = String(index);
    });
  }

  getCardSize() {
    if (this._hasNativeRooms()) return Math.max(1, this._config.rooms.length) * 3;
    return (this._rooms ? this._rooms.size : 1) * 3;
  }

  _hasNativeRooms() {
    return Array.isArray(this._config.rooms);
  }

  _setMode(mode) {
    if (this._mode === mode) return;
    this._mode = mode;
    this._rooms = new Map();
    this._container.textContent = '';
    this._container.removeAttribute('style');
    this._container.className = mode === 'native' ? 'brc-native-grid' : '';
    if (mode === 'legacy') {
      this._container.style.display = 'grid';
      this._container.style.gap = '8px';
    }
  }

  _renderNativeRooms(hass) {
    const rooms = resolveNativeRooms(hass, this._config.rooms);
    this._container.textContent = '';
    this._container.className = 'brc-native-grid';

    const style = document.createElement('style');
    style.textContent = NATIVE_ROOM_STYLES;
    this._container.appendChild(style);

    if (rooms.length === 0) {
      this._container.textContent = 'Aggiungi almeno una stanza nella configurazione.';
      return;
    }

    for (const room of rooms) {
      this._container.appendChild(this._createNativeRoomCard(room));
    }
  }

  _createNativeRoomCard(room) {
    const card = document.createElement('ha-card');
    card.className = `brc-room${room.active ? ' brc-room--active' : ''}`;
    card.style.setProperty('--brc-color', room.color);
    card.style.setProperty('--brc-fg', room.foreground);
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('click', () => this._activateRoom(room));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._activateRoom(room);
      }
    });

    const hero = document.createElement('div');
    hero.className = 'brc-room__hero';
    hero.append(this._createNativeHeader(room), this._createNativeMeta(room));
    card.appendChild(hero);
    const controls = this._createNativeControls(room);
    if (controls) card.appendChild(controls);
    return card;
  }

  _createNativeHeader(room) {
    const header = document.createElement('div');
    header.className = 'brc-room__header';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'brc-room__icon';
    iconWrap.appendChild(this._icon(room.icon));

    const title = document.createElement('div');
    title.className = 'brc-room__title';
    const name = document.createElement('h3');
    name.className = 'brc-room__name';
    name.textContent = room.name;
    const state = document.createElement('div');
    state.className = 'brc-room__state';
    state.textContent = room.motionActive ? 'Presenza rilevata' : room.active ? 'Dispositivi attivi' : 'A riposo';
    title.append(name, state);

    const badge = document.createElement('div');
    badge.className = 'brc-room__badge';
    badge.textContent = room.lastChanged || (room.active ? 'attiva ora' : 'nessun movimento');

    header.append(title, badge, iconWrap);
    return header;
  }

  _createNativeMeta(room) {
    const meta = document.createElement('div');
    meta.className = 'brc-room__meta';

    for (const metric of room.metrics) {
      const chip = this._summaryButton(metric.icon, metric.value, room, metric.entityId, metric.label);
      chip.className = 'brc-room__metric';
      meta.appendChild(chip);
    }

    if (room.activeLights.length > 0) {
      meta.appendChild(this._summaryPill('mdi:lightbulb-on', `${room.activeLights.length} luci`, room, this._aggregateSummaryEntity(room.lightsSummaryEntity, room.activeLights)));
    }
    if (room.activeCovers.length > 0) {
      meta.appendChild(this._summaryPill('mdi:window-shutter-open', `${room.activeCovers.length} aperte`, room, this._aggregateSummaryEntity(room.coversSummaryEntity, room.activeCovers)));
    }
    if (meta.children.length === 0) {
      meta.appendChild(this._summaryPill(room.active ? 'mdi:motion-sensor' : 'mdi:check-circle-outline', room.active ? 'Attiva' : 'Tutto quieto', room, room.motion));
    }
    return meta;
  }

  _aggregateSummaryEntity(configuredEntityId, activeEntityIds) {
    if (configuredEntityId) return configuredEntityId;
    if (activeEntityIds.length === 1) return activeEntityIds[0];
    return activeEntityIds[0];
  }

  _summaryPill(icon, label, room, entityId) {
    const pill = this._summaryButton(icon, label, room, entityId, label);
    pill.className = 'brc-room__summary-pill';
    return pill;
  }

  _summaryButton(icon, label, room, fallbackEntityId, title) {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = title || label;
    button.append(this._icon(icon), document.createTextNode(label));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this._runAction(room.summaryTapAction, fallbackEntityId);
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._showMoreInfo(fallbackEntityId);
    });
    return button;
  }

  _createNativeControls(room) {
    const entities = [...room.lights, ...room.covers];
    const controls = document.createElement('div');
    controls.className = 'brc-room__controls';
    controls.appendChild(this._createRoomStatusControl(room));
    for (const entityId of entities) {
      controls.appendChild(this._createNativeControl(entityId, room));
    }
    return controls;
  }

  _createRoomStatusControl(room) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = `brc-control brc-control--status${room.active ? ' brc-control--active' : ''}`;
    control.title = room.motionActive ? 'Presenza rilevata' : room.active ? 'Dispositivi attivi' : 'Stanza a riposo';
    control.append(
      this._icon(room.motionActive ? 'mdi:motion-sensor' : room.active ? 'mdi:power-plug' : 'mdi:check-circle-outline'),
      this._controlText(room.active ? 'Attiva' : 'A riposo')
    );
    control.addEventListener('click', (event) => {
      event.stopPropagation();
      this._activateRoom(room);
    });
    return control;
  }

  _createNativeControl(entityId, room) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = `brc-control${isActiveEntity(this._hass, entityId) ? ' brc-control--active' : ''}`;
    control.title = entityName(this._hass, entityId);
    control.append(this._icon(this._entityIcon(entityId)), this._controlLabel(entityId, room));
    control.addEventListener('click', (event) => {
      event.stopPropagation();
      this._toggleEntity(entityId);
    });
    control.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._showMoreInfo(entityId);
    });
    return control;
  }

  _controlLabel(entityId, room) {
    const label = document.createElement('span');
    label.className = 'brc-control__label';
    label.textContent = this._shortEntityName(entityName(this._hass, entityId), room.name);
    return label;
  }

  _shortEntityName(name, roomName) {
    const normalizedRoom = String(roomName || '').trim();
    if (!normalizedRoom) return name;
    const escapedRoom = normalizedRoom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cleaned = String(name || '')
      .replace(new RegExp(`\\b${escapedRoom}\\b`, 'ig'), '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return cleaned || name;
  }

  _entityIcon(entityId) {
    const state = this._hass.states[entityId];
    if (state && state.attributes && state.attributes.icon) return state.attributes.icon;
    if (entityId.startsWith('light.')) return isActiveEntity(this._hass, entityId) ? 'mdi:lightbulb-on' : 'mdi:lightbulb';
    if (entityId.startsWith('cover.')) return isActiveEntity(this._hass, entityId) ? 'mdi:window-shutter-open' : 'mdi:window-shutter';
    return 'mdi:toggle-switch';
  }

  _controlText(value) {
    const label = document.createElement('span');
    label.className = 'brc-control__label';
    label.textContent = value;
    return label;
  }

  _icon(icon) {
    const element = document.createElement('ha-icon');
    element.setAttribute('icon', icon || 'mdi:home');
    return element;
  }

  _activateRoom(room) {
    if (room.navigate) {
      window.history.pushState(null, '', room.navigate);
      window.dispatchEvent(new Event('location-changed'));
      return;
    }
    if (room.motion) this._showMoreInfo(room.motion);
  }

  _runAction(actionConfig, fallbackEntityId) {
    const action = actionConfig || { action: 'more-info' };
    const entityId = action.entity || action.entity_id || fallbackEntityId;
    if (action.action === 'none') return;
    if (action.action === 'navigate') {
      const path = action.navigation_path || action.path;
      if (path) {
        window.history.pushState(null, '', path);
        window.dispatchEvent(new Event('location-changed'));
      }
      return;
    }
    if (action.action === 'toggle') {
      this._toggleEntity(entityId);
      return;
    }
    this._showMoreInfo(entityId);
  }

  _toggleEntity(entityId) {
    if (!this._hass || !entityId) return;
    this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true
    }));
  }

  static getStubConfig() {
    return {
      rooms: [],
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'rooms',
          selector: {
            object: {
              multiple: true,
              label_field: 'name',
              fields: {
                name: { selector: { text: {} }, label: 'Nome' },
                area: {
                  selector: {
                    area: {
                      entity: {
                        domain: ['binary_sensor', 'light', 'cover', 'sensor']
                      }
                    }
                  },
                  label: 'Area'
                },
                icon: { selector: { icon: {} }, label: 'Icona' },
                color: { selector: { text: { type: 'color' } }, label: 'Colore stanza' },
                foreground: { selector: { text: { type: 'color' } }, label: 'Colore testo' },
                auto_entities: { selector: { boolean: {} }, label: 'Entità automatiche area' },
                motion: {
                  selector: { entity: { filter: { domain: 'binary_sensor', device_class: ['motion', 'occupancy', 'presence'] } } },
                  label: 'Sensore movimento/presenza'
                },
                lights: {
                  selector: { entity: { multiple: true, reorder: true, filter: { domain: 'light' } } },
                  label: 'Luci'
                },
                lights_summary_entity: {
                  selector: { entity: { filter: { domain: ['light', 'group'] } } },
                  label: 'Entità riepilogo luci'
                },
                covers: {
                  selector: { entity: { multiple: true, reorder: true, filter: { domain: 'cover' } } },
                  label: 'Tapparelle e cover'
                },
                covers_summary_entity: {
                  selector: { entity: { filter: { domain: ['cover', 'group'] } } },
                  label: 'Entità riepilogo cover'
                },
                temperature: {
                  selector: { entity: { filter: { domain: 'sensor' } } },
                  label: 'Temperatura'
                },
                humidity: {
                  selector: { entity: { filter: { domain: 'sensor' } } },
                  label: 'Umidità'
                },
                illuminance: {
                  selector: { entity: { filter: { domain: 'sensor' } } },
                  label: 'Illuminamento'
                },
                summary_action: {
                  selector: {
                    select: {
                      mode: 'dropdown',
                      options: [
                        { value: 'more-info', label: 'More info' },
                        { value: 'toggle', label: 'Toggle entità' },
                        { value: 'navigate', label: 'Naviga' },
                        { value: 'none', label: 'Nessuna azione' }
                      ]
                    }
                  },
                  label: 'Azione riepilogo'
                },
                summary_entity: {
                  selector: { entity: {} },
                  label: 'Entità riepilogo'
                },
                summary_navigation_path: {
                  selector: { text: {} },
                  label: 'Percorso riepilogo'
                },
                navigate: { selector: { text: {} }, label: 'Navigazione' }
              }
            }
          }
        }
      ],
      computeLabel(schemaItem) {
        const labels = {
          rooms: 'Stanze'
        };
        return labels[schemaItem.name] || schemaItem.name;
      },
      computeHelper(schemaItem) {
        const helpers = {
          rooms: 'Configura le stanze con selector nativi Home Assistant. Le entità automatiche usano l’area scelta; i campi luci/cover servono solo per override manuali.'
        };
        return helpers[schemaItem.name];
      }
    };
  }
}

customElements.define('bubble-rooms-card', BubbleRoomsCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'bubble-rooms-card',
  name: 'Bubble Rooms Card',
  description: 'One bubble-card button per room, auto-discovered by label, with no DOM-recreation flash on state updates.',
  preview: false,
  documentationURL: 'https://github.com/portbusy/bubble-rooms-card'
});
