// src/bubble-rooms-card.js
import { resolveRooms } from './rooms.js';
import { sortRooms } from './sort.js';
import { buildRoomConfig } from './room-config.js';
import { SORT_PRESETS, resolveSortSteps } from './sort-presets.js';
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
  gap: 14px;
  padding: 16px;
  overflow: hidden;
  border-radius: var(--ha-card-border-radius, 18px);
  border: 1px solid color-mix(in srgb, var(--brc-color) 18%, var(--divider-color, rgba(0, 0, 0, 0.12)));
  background:
    radial-gradient(circle at 92% 8%, color-mix(in srgb, var(--brc-color) 18%, transparent), transparent 32%),
    linear-gradient(135deg, color-mix(in srgb, var(--card-background-color, #ffffff) 96%, var(--brc-color)), var(--card-background-color, #ffffff));
  color: var(--primary-text-color);
  box-shadow: var(--ha-card-box-shadow, 0 8px 24px rgba(0, 0, 0, 0.12));
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.brc-room:hover {
  transform: translateY(-1px);
}
.brc-room:focus-visible {
  outline: 2px solid var(--brc-color);
  outline-offset: 3px;
}
.brc-room--active {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brc-color) 94%, #ffffff), color-mix(in srgb, var(--brc-color) 72%, #1f2937));
  color: var(--brc-fg);
  border-color: color-mix(in srgb, var(--brc-color) 70%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--brc-color) 28%, transparent);
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
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}
.brc-room__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  color: var(--brc-color);
  background: color-mix(in srgb, var(--brc-color) 12%, var(--card-background-color, #ffffff));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brc-color) 18%, transparent);
}
.brc-room--active .brc-room__icon {
  color: var(--brc-fg);
  background: color-mix(in srgb, var(--brc-fg) 20%, transparent);
  box-shadow: none;
}
.brc-room__title {
  min-width: 0;
}
.brc-room__name {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brc-room__state {
  margin-top: 3px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.78;
}
.brc-room__badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 13px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: color-mix(in srgb, var(--secondary-background-color, #f1f2f6) 84%, var(--brc-color));
  color: var(--secondary-text-color);
}
.brc-room--active .brc-room__badge {
  background: color-mix(in srgb, var(--brc-fg) 22%, transparent);
  color: var(--brc-fg);
}
.brc-room__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 26px;
}
.brc-room__metric,
.brc-room__summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  background: color-mix(in srgb, var(--secondary-background-color, #f1f2f6) 88%, transparent);
  color: var(--primary-text-color);
}
.brc-room--active .brc-room__metric,
.brc-room--active .brc-room__summary-pill {
  background: color-mix(in srgb, var(--brc-fg) 18%, transparent);
  color: var(--brc-fg);
}
.brc-room__metric ha-icon,
.brc-room__summary-pill ha-icon,
.brc-control ha-icon {
  --mdc-icon-size: 18px;
}
.brc-room__controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}
.brc-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 42px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  color: var(--primary-text-color);
  background: color-mix(in srgb, var(--secondary-background-color, #f1f2f6) 92%, var(--brc-color));
  cursor: pointer;
}
.brc-control__label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.brc-control--active {
  color: var(--brc-fg);
  background: var(--brc-color);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--brc-color) 28%, transparent);
}
.brc-room--active .brc-control {
  background: color-mix(in srgb, var(--brc-fg) 18%, transparent);
  color: var(--brc-fg);
}
.brc-room--active .brc-control--active {
  background: color-mix(in srgb, var(--brc-fg) 92%, transparent);
  color: var(--brc-color);
}
@media (max-width: 520px) {
  .brc-room {
    padding: 14px;
    border-radius: 16px;
  }
  .brc-room__header {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .brc-room__badge {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .brc-room__controls {
    grid-template-columns: 1fr;
  }
}
`;

class BubbleRoomsCard extends HTMLElement {
  setConfig(config) {
    this._config = {
      rooms: config.rooms || [],
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
    return Array.isArray(this._config.rooms) && this._config.rooms.length > 0;
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

    card.appendChild(this._createNativeHeader(room));
    card.appendChild(this._createNativeMeta(room));
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

    header.append(iconWrap, title, badge);
    return header;
  }

  _createNativeMeta(room) {
    const meta = document.createElement('div');
    meta.className = 'brc-room__meta';

    for (const metric of room.metrics) {
      const chip = document.createElement('span');
      chip.className = 'brc-room__metric';
      chip.title = metric.label;
      chip.append(this._icon(metric.icon), document.createTextNode(metric.value));
      meta.appendChild(chip);
    }

    if (room.activeLights.length > 0) {
      meta.appendChild(this._summaryPill('mdi:lightbulb-on', `${room.activeLights.length} luci`));
    }
    if (room.activeCovers.length > 0) {
      meta.appendChild(this._summaryPill('mdi:window-shutter-open', `${room.activeCovers.length} aperte`));
    }
    if (meta.children.length === 0) {
      meta.appendChild(this._summaryPill(room.active ? 'mdi:motion-sensor' : 'mdi:check-circle-outline', room.active ? 'Attiva' : 'Tutto quieto'));
    }
    return meta;
  }

  _summaryPill(icon, label) {
    const pill = document.createElement('span');
    pill.className = 'brc-room__summary-pill';
    pill.append(this._icon(icon), document.createTextNode(label));
    return pill;
  }

  _createNativeControls(room) {
    const entities = [...room.lights, ...room.covers];
    if (entities.length === 0) return null;

    const controls = document.createElement('div');
    controls.className = 'brc-room__controls';
    for (const entityId of entities) {
      controls.appendChild(this._createNativeControl(entityId));
    }
    return controls;
  }

  _createNativeControl(entityId) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = `brc-control${isActiveEntity(this._hass, entityId) ? ' brc-control--active' : ''}`;
    control.title = entityName(this._hass, entityId);
    control.append(this._icon(this._entityIcon(entityId)), this._controlLabel(entityId));
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

  _controlLabel(entityId) {
    const label = document.createElement('span');
    label.className = 'brc-control__label';
    label.textContent = entityName(this._hass, entityId);
    return label;
  }

  _entityIcon(entityId) {
    const state = this._hass.states[entityId];
    if (state && state.attributes && state.attributes.icon) return state.attributes.icon;
    if (entityId.startsWith('light.')) return isActiveEntity(this._hass, entityId) ? 'mdi:lightbulb-on' : 'mdi:lightbulb';
    if (entityId.startsWith('cover.')) return isActiveEntity(this._hass, entityId) ? 'mdi:window-shutter-open' : 'mdi:window-shutter';
    return 'mdi:toggle-switch';
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
      label: 'gruppo_movimento_stanza',
      name_strip_prefix: 'Sensori movimento ',
      exclude_entities: [],
      sort_preset: 'active_recent',
      design: 'hero',
      color_mode: 'auto',
      show_summary: false,
      room_links: {},
      room_colors: {}
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
                area: { selector: { area: {} }, label: 'Area' },
                icon: { selector: { icon: {} }, label: 'Icona' },
                color: { selector: { text: { type: 'color' } }, label: 'Colore stanza' },
                foreground: { selector: { text: { type: 'color' } }, label: 'Colore testo' },
                auto_entities: { selector: { boolean: {} }, label: 'Entità automatiche area' },
                motion: {
                  selector: { entity: { filter: { domain: 'binary_sensor' } } },
                  label: 'Sensore movimento/presenza'
                },
                lights: {
                  selector: { entity: { multiple: true, filter: { domain: 'light' } } },
                  label: 'Luci'
                },
                covers: {
                  selector: { entity: { multiple: true, filter: { domain: 'cover' } } },
                  label: 'Tapparelle e cover'
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
                navigate: { selector: { text: {} }, label: 'Navigazione' }
              }
            }
          }
        },
        { name: 'label', selector: { label: {} } },
        { name: 'name_strip_prefix', selector: { text: {} } },
        { name: 'exclude_entities', selector: { entity: { multiple: true } } },
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
        },
        {
          name: 'sort',
          selector: { object: {} }
        },
        {
          name: 'design',
          selector: {
            select: {
              options: [
                { value: 'hero', label: 'Hero' },
                { value: 'soft', label: 'Soft' },
                { value: 'minimal', label: 'Minimal' }
              ]
            }
          }
        },
        {
          name: 'color_mode',
          selector: {
            select: {
              options: [
                { value: 'auto', label: 'Automatici' },
                { value: 'manual', label: 'Solo manuali' },
                { value: 'off', label: 'Disattivati' }
              ]
            }
          }
        },
        {
          name: 'show_summary',
          selector: { boolean: {} }
        },
        {
          name: 'room_links',
          selector: { object: {} }
        },
        {
          name: 'room_colors',
          selector: { object: {} }
        }
      ],
      computeLabel(schemaItem) {
        const labels = {
          rooms: 'Stanze native',
          label: 'Label',
          name_strip_prefix: 'Name prefix to strip',
          exclude_entities: 'Excluded entities',
          sort_preset: 'Ordinamento',
          sort: 'Ordinamento avanzato',
          design: 'Design',
          color_mode: 'Modalità colore',
          show_summary: 'Mostra riepilogo',
          room_links: 'Link stanze',
          room_colors: 'Colori stanze'
        };
        return labels[schemaItem.name] || schemaItem.name;
      },
      computeHelper(schemaItem) {
        const helpers = {
          rooms: 'Nuova modalità consigliata. Se configuri una o più stanze qui, la card usa il renderer nativo e non dipende da Bubble Card.',
          sort: 'YAML opzionale per ordinamenti custom. Se impostato, ha precedenza su Ordinamento.',
          room_links: 'Mappa YAML opzionale: area_id, entity_id o nome stanza -> percorso dashboard/hash.',
          room_colors: 'Mappa YAML opzionale: area_id, entity_id o nome stanza -> colore oppure {color, foreground}.'
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
