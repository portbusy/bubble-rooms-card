const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

function nativeTapActionSelector(defaultAction) {
  return {
    ui_action: {
      default_action: defaultAction,
      actions: [
        { action: 'more-info' },
        { action: 'toggle' },
        { action: 'navigate' },
        { action: 'perform-action' },
        { action: 'url' },
        { action: 'none' }
      ]
    }
  };
}

function asDomains(domains) {
  return Array.isArray(domains) ? domains : [domains];
}

export function areaScopedEntityIds(hass, areaId, domains) {
  if (!areaId) return [];

  const allowedDomains = new Set(asDomains(domains));
  const entities = hass && hass.entities ? hass.entities : {};
  const devices = hass && hass.devices ? hass.devices : {};
  const result = [];

  for (const [entityId, entity] of Object.entries(entities)) {
    const domain = entityId.split('.', 1)[0];
    if (!allowedDomains.has(domain)) continue;

    // Groups have no area assignment. Keep them available as explicit action targets.
    if (domain === 'group') {
      result.push(entityId);
      continue;
    }

    const entityAreaId = entity.area_id
      || (entity.device_id && devices[entity.device_id] && devices[entity.device_id].area_id);
    if (entityAreaId === areaId) result.push(entityId);
  }

  return result.sort();
}

export function areaScopedEntitySelector(hass, areaId, options) {
  const domains = asDomains(options.domains);
  const entity = {
    filter: {
      domain: domains,
      ...(options.deviceClasses ? { device_class: options.deviceClasses } : {})
    },
    ...(options.multiple ? { multiple: true } : {}),
    ...(options.reorder ? { reorder: true } : {})
  };

  if (areaId) {
    entity.include_entities = areaScopedEntityIds(hass, areaId, domains);
  }

  return { entity };
}

function entityField(hass, areaId, name, label, options = {}) {
  return {
    name,
    label,
    ...(options.description ? { description: options.description } : {}),
    selector: areaScopedEntitySelector(hass, areaId, options)
  };
}

function tapActionsField() {
  return {
    name: 'tap_actions',
    label: 'Azioni al tocco',
    description: "Scegli l'azione Home Assistant per ogni elemento interattivo della card.",
    selector: {
      object: {
        fields: {
          card: {
            label: 'Testata della stanza',
            description: 'Tocco sullo spazio libero della card.',
            selector: nativeTapActionSelector({ action: 'more-info' })
          },
          status: {
            label: 'Chip Accesso',
            description: "Tocco sulla prima chip con l'icona della stanza.",
            selector: nativeTapActionSelector({ action: 'more-info' })
          },
          window: {
            label: 'Indicatore finestra',
            description: "Tocco sull'icona apertura nella riga sensori.",
            selector: nativeTapActionSelector({ action: 'more-info' })
          },
          temperature: {
            label: 'Temperatura',
            selector: nativeTapActionSelector({ action: 'more-info' })
          },
          humidity: {
            label: 'Umidita',
            selector: nativeTapActionSelector({ action: 'more-info' })
          },
          illuminance: {
            label: 'Illuminamento',
            selector: nativeTapActionSelector({ action: 'more-info' })
          },
          lights: {
            label: 'Chip luci',
            description: "Predefinita: toggle dell'entita o del gruppo configurato.",
            selector: nativeTapActionSelector({ action: 'toggle' })
          },
          covers: {
            label: 'Chip tapparelle e cover',
            description: "Predefinita: more-info dell'entita o del gruppo configurato.",
            selector: nativeTapActionSelector({ action: 'more-info' })
          }
        }
      }
    }
  };
}

export function roomEditorSchema(hass, room = {}) {
  const areaId = room.area || room.area_id || '';

  return [
    {
      type: 'expandable',
      name: 'room',
      title: 'Stanza',
      flatten: true,
      schema: [
        { name: 'name', label: 'Nome', selector: { text: {} } },
        {
          name: 'area',
          label: 'Area',
          description: 'Sceglila prima: tutti i selector qui sotto verranno filtrati su questa area.',
          selector: { area: {} }
        },
        { name: 'icon', label: 'Icona', selector: { icon: {} } },
        {
          name: 'color',
          label: 'Colore stanza',
          description: "Definisce il gradiente della testata e l'accento delle chip.",
          selector: { text: { type: 'color' } }
        },
        {
          name: 'foreground',
          label: 'Colore testo',
          description: 'Lascia vuoto per scegliere automaticamente un colore leggibile.',
          selector: { text: { type: 'color' } }
        }
      ]
    },
    {
      type: 'expandable',
      name: 'entities',
      title: 'Entita della stanza',
      flatten: true,
      schema: [
        {
          name: 'auto_entities',
          label: "Trova automaticamente luci e tapparelle nell'area",
          description: 'Disattivalo solo quando vuoi usare le liste manuali qui sotto.',
          default: true,
          selector: { boolean: {} }
        },
        entityField(hass, areaId, 'motion', 'Sensore movimento o presenza', {
          domains: 'binary_sensor',
          deviceClasses: ['motion', 'occupancy', 'presence'],
          description: "Alimenta il pallino di presenza e il badge dell'ultimo aggiornamento."
        }),
        {
          name: 'show_last_changed',
          label: 'Mostra badge ultimo aggiornamento',
          description: 'Visualizza a destra "7 ore fa", calcolato dal sensore movimento o presenza.',
          default: true,
          selector: { boolean: {} }
        },
        entityField(hass, areaId, 'window', 'Sensore finestra o apertura', {
          domains: 'binary_sensor',
          deviceClasses: ['window', 'door', 'opening', 'garage_door'],
          description: "Opzionale. Mostra l'icona finestra nella riga sensori; non usa le tapparelle."
        }),
        entityField(hass, areaId, 'lights', 'Chip luci', {
          domains: 'light',
          multiple: true,
          reorder: true,
          description: 'Le luci visualizzate nella fascia inferiore.'
        }),
        entityField(hass, areaId, 'lights_summary_entity', 'Gruppo luci per il tocco', {
          domains: ['light', 'group'],
          description: "Opzionale. Diventa il target dell'azione delle chip luce."
        }),
        entityField(hass, areaId, 'covers', 'Chip tapparelle e cover', {
          domains: 'cover',
          multiple: true,
          reorder: true,
          description: 'Le cover visualizzate nella fascia inferiore.'
        }),
        entityField(hass, areaId, 'covers_summary_entity', 'Gruppo tapparelle per il tocco', {
          domains: ['cover', 'group'],
          description: "Opzionale. Diventa il target dell'azione delle chip tapparella."
        }),
        entityField(hass, areaId, 'temperature', 'Sensore temperatura', { domains: 'sensor' }),
        entityField(hass, areaId, 'humidity', 'Sensore umidita', { domains: 'sensor' }),
        entityField(hass, areaId, 'illuminance', 'Sensore illuminamento', { domains: 'sensor' })
      ]
    },
    {
      type: 'expandable',
      name: 'actions',
      title: 'Azioni',
      flatten: true,
      schema: [tapActionsField()]
    }
  ];
}

export class BubbleRoomsCardEditor extends BaseHTMLElement {
  set hass(hass) {
    const hasHass = Boolean(this._hass);
    this._hass = hass;
    if (!hasHass) this._render();
  }

  setConfig(config) {
    this._config = {
      ...config,
      rooms: Array.isArray(config.rooms) ? [...config.rooms] : []
    };
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this._config || !this.isConnected) return;

    this.replaceChildren(this._styleElement());

    const rooms = this._config.rooms || [];
    if (!rooms.length) {
      const empty = document.createElement('div');
      empty.className = 'brc-editor__empty';
      empty.textContent = 'Aggiungi una stanza per iniziare.';
      this.appendChild(empty);
    }

    rooms.forEach((room, index) => this.appendChild(this._roomElement(room || {}, index)));

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'brc-editor__add';
    addButton.textContent = 'Aggiungi stanza';
    addButton.addEventListener('click', () => {
      this._setConfig({ ...this._config, rooms: [...rooms, {}] }, true);
    });
    this.appendChild(addButton);
  }

  _roomElement(room, index) {
    const section = document.createElement('section');
    section.className = 'brc-editor__room';

    const header = document.createElement('div');
    header.className = 'brc-editor__header';
    const title = document.createElement('h3');
    title.textContent = this._roomName(room, index);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'brc-editor__remove';
    removeButton.textContent = 'Rimuovi';
    removeButton.addEventListener('click', () => {
      const rooms = this._config.rooms.filter((_, roomIndex) => roomIndex !== index);
      this._setConfig({ ...this._config, rooms }, true);
    });
    header.append(title, removeButton);

    const form = document.createElement('ha-form');
    form.hass = this._hass;
    form.data = room;
    form.schema = roomEditorSchema(this._hass, room);
    form.addEventListener('value-changed', (event) => {
      event.stopPropagation();
      const nextRoom = { ...room, ...event.detail.value };
      const rooms = this._config.rooms.map((current, roomIndex) => (
        roomIndex === index ? nextRoom : current
      ));
      this._setConfig({ ...this._config, rooms }, nextRoom.area !== room.area);
    });

    section.append(header, form);
    return section;
  }

  _roomName(room, index) {
    if (room.name) return room.name;
    if (room.area && this._hass && this._hass.areas && this._hass.areas[room.area]) {
      return this._hass.areas[room.area].name;
    }
    return `Stanza ${index + 1}`;
  }

  _setConfig(config, rerender) {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true
    }));
    if (rerender) this._render();
  }

  _styleElement() {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      .brc-editor__room {
        margin: 0 0 16px;
        padding: 16px;
        border: 1px solid var(--divider-color);
        border-radius: 12px;
      }
      .brc-editor__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .brc-editor__header h3 { margin: 0; font-size: 1rem; }
      .brc-editor__add, .brc-editor__remove {
        min-height: 36px;
        padding: 0 14px;
        border: 0;
        border-radius: 8px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .brc-editor__add {
        color: var(--text-primary-color, #fff);
        background: var(--primary-color);
      }
      .brc-editor__remove {
        color: var(--primary-color);
        background: transparent;
      }
      .brc-editor__empty {
        margin-bottom: 16px;
        color: var(--secondary-text-color);
      }
    `;
    return style;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('bubble-rooms-card-editor')) {
  customElements.define('bubble-rooms-card-editor', BubbleRoomsCardEditor);
}
