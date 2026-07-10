const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

export function areaScopedEntityIds(hass, areaId, domains, deviceClasses) {
  if (!areaId) return [];

  const allowedDomains = new Set(asArray(domains));
  const allowedDeviceClasses = deviceClasses ? new Set(deviceClasses) : null;
  const entities = hass && hass.entities ? hass.entities : {};
  const devices = hass && hass.devices ? hass.devices : {};
  const states = hass && hass.states ? hass.states : {};
  const result = [];

  for (const [entityId, entity] of Object.entries(entities)) {
    const domain = entityId.split('.', 1)[0];
    if (!allowedDomains.has(domain) || entity.disabled_by || entity.hidden_by) continue;

    // Groups have no area assignment, but are valid aggregate action targets.
    if (domain === 'group') {
      if (!allowedDeviceClasses) result.push(entityId);
      continue;
    }

    const entityAreaId = entity.area_id
      || (entity.device_id && devices[entity.device_id] && devices[entity.device_id].area_id);
    if (entityAreaId !== areaId) continue;

    const deviceClass = states[entityId] && states[entityId].attributes
      ? states[entityId].attributes.device_class
      : undefined;
    if (allowedDeviceClasses && !allowedDeviceClasses.has(deviceClass)) continue;
    result.push(entityId);
  }

  return result.sort();
}

function isEmptyObject(value) {
  return !value || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length);
}

function roomActionDefaults(room) {
  return {
    card: { action: 'more-info' },
    status: room.automation ? { action: 'toggle' } : { action: 'more-info' },
    window: { action: 'more-info' },
    temperature: { action: 'more-info' },
    humidity: { action: 'more-info' },
    illuminance: { action: 'more-info' },
    lights: { action: 'toggle' },
    covers: { action: 'more-info' }
  };
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

    const addButton = this._button('Aggiungi stanza', 'brc-editor__add');
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
    const removeButton = this._button('Rimuovi', 'brc-editor__remove');
    removeButton.addEventListener('click', () => {
      const rooms = this._config.rooms.filter((_, roomIndex) => roomIndex !== index);
      this._setConfig({ ...this._config, rooms }, true);
    });
    header.append(title, removeButton);

    section.append(
      header,
      this._roomPanel(room, index),
      this._entitiesPanel(room, index),
      this._actionsPanel(room, index)
    );
    return section;
  }

  _roomPanel(room, index) {
    const { panel, content } = this._panel('Stanza', true);
    const row = document.createElement('div');
    row.className = 'brc-editor__row';
    row.append(
      this._textField('Nome', room.name || '', (value) => this._updateRoom(index, { name: value })),
      this._iconPicker(room.icon, (value) => this._updateRoom(index, { icon: value || undefined }))
    );
    content.append(
      row,
      this._areaPicker(room.area, (value) => this._updateRoom(index, { area: value || undefined }, true)),
      this._textField('Colore stanza', room.color || '', (value) => this._updateRoom(index, { color: value || undefined })),
      this._textField('Colore testo', room.foreground || '', (value) => this._updateRoom(index, { foreground: value || undefined }))
    );
    return panel;
  }

  _entitiesPanel(room, index) {
    const { panel, content } = this._panel('Entita della stanza');
    const areaId = room.area || '';

    content.append(
      this._switch(
        "Trova automaticamente luci e tapparelle nell'area",
        room.auto_entities !== false,
        (checked) => this._updateRoom(index, { auto_entities: checked })
      ),
      this._entityPicker({
        label: 'Input boolean automazioni',
        value: room.automation,
        domains: 'input_boolean',
        description: 'Helper globale: controlla la chip Accesso.',
        onValue: (value) => this._updateRoom(index, { automation: value || undefined }, true)
      }),
      this._entityPicker({
        label: 'Sensore movimento o presenza',
        value: room.motion,
        areaId,
        domains: 'binary_sensor',
        deviceClasses: ['motion', 'occupancy', 'presence'],
        onValue: (value) => this._updateRoom(index, { motion: value || undefined })
      }),
      this._switch(
        'Mostra badge ultimo aggiornamento',
        room.show_last_changed !== false,
        (checked) => this._updateRoom(index, { show_last_changed: checked })
      ),
      this._entityPicker({
        label: 'Sensore finestra o apertura',
        value: room.window,
        areaId,
        domains: 'binary_sensor',
        deviceClasses: ['window', 'door', 'opening', 'garage_door'],
        onValue: (value) => this._updateRoom(index, { window: value || undefined })
      }),
      this._entityList({
        label: 'Chip luci',
        values: room.lights || [],
        areaId,
        domains: 'light',
        onChange: (values) => this._updateRoom(index, { lights: values.length ? values : undefined }, true)
      }),
      this._entityPicker({
        label: 'Gruppo luci per il tocco',
        value: room.lights_summary_entity,
        areaId,
        domains: ['light', 'group'],
        onValue: (value) => this._updateRoom(index, { lights_summary_entity: value || undefined })
      }),
      this._entityList({
        label: 'Chip tapparelle e cover',
        values: room.covers || [],
        areaId,
        domains: 'cover',
        onChange: (values) => this._updateRoom(index, { covers: values.length ? values : undefined }, true)
      }),
      this._entityPicker({
        label: 'Gruppo tapparelle per il tocco',
        value: room.covers_summary_entity,
        areaId,
        domains: ['cover', 'group'],
        onValue: (value) => this._updateRoom(index, { covers_summary_entity: value || undefined })
      }),
      this._entityPicker({
        label: 'Sensore temperatura',
        value: room.temperature,
        areaId,
        domains: 'sensor',
        deviceClasses: ['temperature'],
        onValue: (value) => this._updateRoom(index, { temperature: value || undefined })
      }),
      this._entityPicker({
        label: 'Sensore umidita',
        value: room.humidity,
        areaId,
        domains: 'sensor',
        deviceClasses: ['humidity'],
        onValue: (value) => this._updateRoom(index, { humidity: value || undefined })
      }),
      this._entityPicker({
        label: 'Sensore illuminamento',
        value: room.illuminance,
        areaId,
        domains: 'sensor',
        deviceClasses: ['illuminance'],
        onValue: (value) => this._updateRoom(index, { illuminance: value || undefined })
      })
    );
    return panel;
  }

  _actionsPanel(room, index) {
    const { panel, content } = this._panel('Azioni al tocco');
    const defaults = roomActionDefaults(room);
    const actions = room.tap_actions || {};
    const labels = {
      card: 'Testata della stanza',
      status: 'Chip Accesso',
      window: 'Indicatore finestra',
      temperature: 'Temperatura',
      humidity: 'Umidita',
      illuminance: 'Illuminamento',
      lights: 'Chip luci',
      covers: 'Chip tapparelle e cover'
    };

    for (const [key, label] of Object.entries(labels)) {
      const field = document.createElement('div');
      field.className = 'brc-editor__yaml-field';
      const fieldLabel = document.createElement('label');
      fieldLabel.textContent = label;
      const editor = document.createElement('ha-yaml-editor');
      editor.defaultValue = actions[key] || defaults[key];
      editor.addEventListener('value-changed', (event) => {
        if (event.detail && event.detail.isValid === false) return;
        this._updateTapAction(index, key, event.detail ? event.detail.value : undefined);
      });
      field.append(fieldLabel, editor);
      content.appendChild(field);
    }
    return panel;
  }

  _entityPicker(options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'brc-editor__field';
    const picker = document.createElement('ha-entity-picker');
    picker.hass = this._hass;
    picker.label = options.label;
    picker.value = options.value || '';
    picker.includeDomains = asArray(options.domains);
    if (options.deviceClasses) picker.includeDeviceClasses = options.deviceClasses;
    if (options.areaId !== undefined) {
      picker.includeEntities = areaScopedEntityIds(
        this._hass,
        options.areaId,
        options.domains,
        options.deviceClasses
      );
    }
    picker.addEventListener('value-changed', (event) => {
      options.onValue(event.detail ? event.detail.value : undefined);
    });
    wrapper.appendChild(picker);

    if (options.description) {
      const description = document.createElement('div');
      description.className = 'brc-editor__helper';
      description.textContent = options.description;
      wrapper.appendChild(description);
    }
    return wrapper;
  }

  _entityList(options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'brc-editor__list';
    const title = document.createElement('div');
    title.className = 'brc-editor__list-title';
    title.textContent = options.label;
    wrapper.appendChild(title);

    const values = [...options.values];
    values.forEach((value, valueIndex) => {
      const row = document.createElement('div');
      row.className = 'brc-editor__list-row';
      const picker = this._entityPicker({
        label: `${options.label} ${valueIndex + 1}`,
        value,
        areaId: options.areaId,
        domains: options.domains,
        onValue: (nextValue) => {
          const next = [...values];
          if (nextValue) next[valueIndex] = nextValue;
          else next.splice(valueIndex, 1);
          options.onChange(next);
        }
      });
      const remove = this._button('Rimuovi', 'brc-editor__remove');
      remove.addEventListener('click', () => options.onChange(values.filter((_, i) => i !== valueIndex)));
      row.append(picker, remove);
      wrapper.appendChild(row);
    });

    const addPicker = this._entityPicker({
      label: `Aggiungi ${options.label.toLowerCase()}`,
      value: '',
      areaId: options.areaId,
      domains: options.domains,
      onValue: (value) => {
        if (value && !values.includes(value)) options.onChange([...values, value]);
      }
    });
    wrapper.appendChild(addPicker);
    return wrapper;
  }

  _areaPicker(value, onValue) {
    const picker = document.createElement('ha-area-picker');
    picker.hass = this._hass;
    picker.label = 'Area';
    picker.value = value || '';
    picker.addEventListener('value-changed', (event) => onValue(event.detail ? event.detail.value : undefined));
    return picker;
  }

  _iconPicker(value, onValue) {
    const picker = document.createElement('ha-icon-picker');
    picker.hass = this._hass;
    picker.label = 'Icona';
    picker.value = value || '';
    picker.addEventListener('value-changed', (event) => onValue(event.detail ? event.detail.value : undefined));
    return picker;
  }

  _textField(label, value, onValue) {
    const field = document.createElement('ha-textfield');
    field.label = label;
    field.value = value;
    field.addEventListener('change', () => onValue(field.value));
    return field;
  }

  _switch(label, checked, onChange) {
    const row = document.createElement('div');
    row.className = 'brc-editor__switch';
    const text = document.createElement('span');
    text.textContent = label;
    const control = document.createElement('ha-switch');
    control.checked = checked;
    control.addEventListener('change', () => onChange(control.checked));
    row.append(text, control);
    return row;
  }

  _panel(title, expanded = false) {
    const panel = document.createElement('ha-expansion-panel');
    panel.header = title;
    panel.setAttribute('outlined', '');
    panel.expanded = expanded;
    const content = document.createElement('div');
    content.className = 'brc-editor__panel-content';
    panel.appendChild(content);
    return { panel, content };
  }

  _button(text, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    return button;
  }

  _updateRoom(index, patch, rerender = false) {
    const rooms = this._config.rooms.map((room, roomIndex) => (
      roomIndex === index ? { ...room, ...patch } : room
    ));
    this._setConfig({ ...this._config, rooms }, rerender);
  }

  _updateTapAction(index, key, value) {
    const room = this._config.rooms[index] || {};
    const actions = { ...(room.tap_actions || {}) };
    if (isEmptyObject(value)) delete actions[key];
    else actions[key] = value;
    this._updateRoom(index, { tap_actions: Object.keys(actions).length ? actions : undefined });
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

  _roomName(room, index) {
    if (room.name) return room.name;
    if (room.area && this._hass && this._hass.areas && this._hass.areas[room.area]) {
      return this._hass.areas[room.area].name;
    }
    return `Stanza ${index + 1}`;
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
      .brc-editor__header, .brc-editor__switch, .brc-editor__list-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .brc-editor__header { margin-bottom: 12px; }
      .brc-editor__header h3 { margin: 0; font-size: 1rem; }
      .brc-editor__panel-content { padding: 12px; }
      .brc-editor__field, .brc-editor__list, .brc-editor__yaml-field, .brc-editor__switch {
        margin-bottom: 16px;
      }
      .brc-editor__field ha-entity-picker, .brc-editor__list-row .brc-editor__field,
      ha-area-picker, ha-textfield, ha-icon-picker { width: 100%; }
      .brc-editor__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
      .brc-editor__helper { margin-top: 4px; color: var(--secondary-text-color); font-size: 0.85rem; }
      .brc-editor__list-title { margin-bottom: 8px; font-weight: 600; }
      .brc-editor__list-row .brc-editor__field { margin-bottom: 0; flex: 1 1 auto; }
      .brc-editor__yaml-field > label { display: block; margin-bottom: 6px; font-weight: 600; }
      .brc-editor__yaml-field ha-yaml-editor { display: block; }
      .brc-editor__add, .brc-editor__remove {
        min-height: 36px;
        padding: 0 14px;
        border: 0;
        border-radius: 8px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .brc-editor__add { color: var(--text-primary-color, #fff); background: var(--primary-color); }
      .brc-editor__remove { color: var(--primary-color); background: transparent; }
      .brc-editor__empty { margin-bottom: 16px; color: var(--secondary-text-color); }
      @media (max-width: 500px) { .brc-editor__row { grid-template-columns: 1fr; } }
    `;
    return style;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('bubble-rooms-card-editor')) {
  customElements.define('bubble-rooms-card-editor', BubbleRoomsCardEditor);
}
