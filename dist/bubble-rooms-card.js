// src/bubble-rooms-card.js
import { resolveRooms } from './rooms.js';
import { sortRooms } from './sort.js';
import { buildRoomConfig } from './room-config.js';

class BubbleRoomsCard extends HTMLElement {
  setConfig(config) {
    this._config = {
      label: config.label || 'gruppo_movimento_stanza',
      name_strip_prefix: config.name_strip_prefix || 'Sensori movimento ',
      exclude_entities: config.exclude_entities || [],
      sort: config.sort || [
        { attribute: 'last_changed', reverse: true },
        { attribute: 'state', reverse: true }
      ]
    };
    this._rooms = new Map(); // entityId -> { wrapper: HTMLElement, el: HTMLElement }
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.style.display = 'grid';
      this._container.style.gap = '8px';
      this.appendChild(this._container);
    }
  }

  set hass(hass) {
    this._updateHass(hass);
  }

  async _updateHass(hass) {
    this._hass = hass;
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
    }

    for (const [entityId, entry] of this._rooms) {
      if (!seen.has(entityId)) {
        entry.wrapper.remove();
        this._rooms.delete(entityId);
      }
    }

    const sortedRooms = sortRooms(hass, rooms, this._config.sort);
    sortedRooms.forEach((room, index) => {
      const entry = this._rooms.get(room.entityId);
      if (entry) entry.wrapper.style.order = String(index);
    });
  }

  getCardSize() {
    return (this._rooms ? this._rooms.size : 1) * 3;
  }
}

customElements.define('bubble-rooms-card', BubbleRoomsCard);
