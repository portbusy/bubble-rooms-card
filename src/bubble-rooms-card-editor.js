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

// Home Assistant may clone configuration objects and change their property
// insertion order before calling setConfig. Compare their data, not that order,
// so an editor-originated update never recreates the form unnecessarily.
function configSignature(value) {
  if (Array.isArray(value)) return `[${value.map(configSignature).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map(
      (key) => `${JSON.stringify(key)}:${configSignature(value[key])}`
    ).join(',')}}`;
  }
  return JSON.stringify(value);
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
    const nextConfig = {
      ...config,
      rooms: Array.isArray(config.rooms) ? [...config.rooms] : []
    };
    const signature = configSignature(nextConfig);
    // Home Assistant calls setConfig again after every config-changed event.
    // Avoid replacing the whole form when that config is the one we just emitted:
    // replacing it drops focus, closes panels and makes visual checks cumbersome.
    if (signature === this._configSignature) return;
    this._config = nextConfig;
    this._configSignature = signature;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this._config || !this.isConnected) return;

    this._expandedPanels = new Map(
      [...this.querySelectorAll('ha-expansion-panel[data-brc-panel]')].map((panel) => [
        `${panel.dataset.brcRoomIndex}:${panel.dataset.brcPanel}`,
        panel.expanded
      ])
    );
    this.replaceChildren(this._styleElement());
    const rooms = this._config.rooms || [];

    if (!rooms.length) {
      const empty = document.createElement('div');
      empty.className = 'brc-editor__empty';
      empty.textContent = 'Aggiungi una stanza per iniziare.';
      this.appendChild(empty);
    }

    rooms.forEach((room, index) => this.appendChild(this._roomElement(room || {}, index)));

    const addButton = this._button('Aggiungi stanza vuota', 'brc-editor__add');
    addButton.addEventListener('click', () => {
      this._setConfig({ ...this._config, rooms: [...rooms, {}] }, true);
    });
    this.appendChild(addButton);
    const areaPicker = this._areaPicker('', (areaId) => {
      if (!areaId) return;
      this._setConfig({
        ...this._config,
        rooms: [...this._config.rooms, this._roomFromArea(areaId)]
      }, true);
    });
    areaPicker.label = 'Aggiungi stanza da un’area';
    this.appendChild(areaPicker);
  }

  _roomFromArea(areaId) {
    const first = (domains, deviceClasses) => areaScopedEntityIds(this._hass, areaId, domains, deviceClasses)[0];
    const area = this._hass && this._hass.areas && this._hass.areas[areaId];
    return {
      area: areaId,
      name: area && area.name,
      icon: area && area.icon,
      motion: first('binary_sensor', ['motion', 'occupancy', 'presence']),
      window: first('binary_sensor', ['window', 'door', 'opening', 'garage_door']),
      temperature: first('sensor', ['temperature']),
      humidity: first('sensor', ['humidity']),
      illuminance: first('sensor', ['illuminance'])
    };
  }

  _roomElement(room, index) {
    const section = document.createElement('section');
    section.className = 'brc-editor__room';
    this._renderingRoomIndex = index;
    const { panel: roomPanel, content } = this._panel(this._roomName(room, index), true);
    const header = document.createElement('div');
    header.className = 'brc-editor__header';
    const title = document.createElement('h3');
    title.textContent = this._roomSummary(room);
    const removeButton = this._button('Rimuovi', 'brc-editor__remove');
    removeButton.addEventListener('click', () => {
      const rooms = this._config.rooms.filter((_, roomIndex) => roomIndex !== index);
      this._setConfig({ ...this._config, rooms }, true);
    });
    header.append(title, removeButton);
    content.append(header, this._roomPanel(room, index), this._entitiesPanel(room, index), this._actionsPanel(room, index));
    section.appendChild(roomPanel);
    this._renderingRoomIndex = undefined;
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
    const autoLights = this._autoEntitiesInfo({
      areaId,
      domain: 'light',
      label: 'Luci rilevate automaticamente',
      excluded: room.excluded_lights || [],
      onChange: (values) => this._updateRoom(index, { excluded_lights: values.length ? values : undefined })
    });
    const manualLights = this._entityPicker({
      label: 'Chip luci', value: room.lights || [], areaId, domains: 'light', multiple: true,
      description: 'Modalità manuale: vengono usate solo le entità selezionate.',
      onValue: (values) => this._updateRoom(index, { lights: values.length ? values : undefined })
    });
    const autoCovers = this._autoEntitiesInfo({
      areaId,
      domain: 'cover',
      label: 'Tapparelle e cover rilevate automaticamente',
      excluded: room.excluded_covers || [],
      onChange: (values) => this._updateRoom(index, { excluded_covers: values.length ? values : undefined })
    });
    const manualCovers = this._entityPicker({
      label: 'Chip tapparelle e cover', value: room.covers || [], areaId, domains: 'cover', multiple: true,
      description: 'Modalità manuale: vengono usate solo le entità selezionate.',
      onValue: (values) => this._updateRoom(index, { covers: values.length ? values : undefined })
    });
    const setAutoEntitiesMode = (auto) => {
      autoLights.hidden = !auto;
      autoCovers.hidden = !auto;
      manualLights.hidden = auto;
      manualCovers.hidden = auto;
    };
    setAutoEntitiesMode(room.auto_entities !== false);

    content.append(...[
      this._switch(
        "Trova automaticamente luci e tapparelle nell'area",
        room.auto_entities !== false,
        (checked) => {
          this._updateRoom(index, { auto_entities: checked });
          setAutoEntitiesMode(checked);
        },
        'Usa tutte le luci e le tapparelle appartenenti all’area selezionata.'
      ),
      this._entityPicker({
        label: 'Input boolean automazioni',
        value: room.automation,
        domains: 'input_boolean',
        description: 'Helper globale: controlla la chip Accesso.',
        onValue: (value) => this._updateRoom(index, { automation: value || undefined })
      }),
      this._entityPicker({
        label: 'Sensore movimento o presenza',
        value: room.motion,
        areaId,
        domains: 'binary_sensor',
        deviceClasses: ['motion', 'occupancy', 'presence'],
        onValue: (value) => this._updateRoom(index, { motion: value || undefined })
      }),
      this._areaSuggestions('Suggeriti nell’area', areaId, 'binary_sensor', ['motion', 'occupancy', 'presence'], room.motion, 'Sensore movimento o presenza',
        (value) => this._updateRoom(index, { motion: value })),
      this._switch(
        'Mostra badge ultimo aggiornamento',
        room.show_last_changed !== false,
        (checked) => this._updateRoom(index, { show_last_changed: checked }),
        room.motion
          ? 'Mostra quando il sensore di presenza è cambiato l’ultima volta.'
          : 'Seleziona un sensore di presenza per visualizzare il badge.'
      ),
      this._entityPicker({
        label: 'Sensore finestra o apertura',
        value: room.window,
        areaId,
        domains: 'binary_sensor',
        deviceClasses: ['window', 'door', 'opening', 'garage_door'],
        onValue: (value) => this._updateRoom(index, { window: value || undefined })
      }),
      this._areaSuggestions('Suggeriti nell’area', areaId, 'binary_sensor', ['window', 'door', 'opening', 'garage_door'], room.window, 'Sensore finestra o apertura',
        (value) => this._updateRoom(index, { window: value })),
      autoLights,
      manualLights,
      this._entityPicker({
        label: 'Gruppo luci per il tocco',
        value: room.lights_summary_entity,
        areaId,
        domains: ['light', 'group'],
        onValue: (value) => this._updateRoom(index, { lights_summary_entity: value || undefined })
      }),
      autoCovers,
      manualCovers,
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
      this._areaSuggestions('Temperatura nell’area', areaId, 'sensor', ['temperature'], room.temperature, 'Sensore temperatura',
        (value) => this._updateRoom(index, { temperature: value })),
      this._entityPicker({
        label: 'Sensore umidita',
        value: room.humidity,
        areaId,
        domains: 'sensor',
        deviceClasses: ['humidity'],
        onValue: (value) => this._updateRoom(index, { humidity: value || undefined })
      }),
      this._areaSuggestions('Umidità nell’area', areaId, 'sensor', ['humidity'], room.humidity, 'Sensore umidita',
        (value) => this._updateRoom(index, { humidity: value })),
      this._entityPicker({
        label: 'Sensore illuminamento',
        value: room.illuminance,
        areaId,
        domains: 'sensor',
        deviceClasses: ['illuminance'],
        onValue: (value) => this._updateRoom(index, { illuminance: value || undefined })
      }),
      this._areaSuggestions('Illuminamento nell’area', areaId, 'sensor', ['illuminance'], room.illuminance, 'Sensore illuminamento',
        (value) => this._updateRoom(index, { illuminance: value }))
    ].filter(Boolean));
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
      content.appendChild(this._actionField(index, key, label, actions[key], defaults[key]));
    }
    return panel;
  }

  _actionField(index, key, label, explicitAction, defaultAction) {
    const field = document.createElement('div');
    field.className = 'brc-editor__action-field';
    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = label;
    const actions = [
      { label: 'Info', value: { action: 'more-info' } },
      { label: 'Attiva/disattiva', value: { action: 'toggle' } },
      { label: 'Nessuna', value: { action: 'none' } }
    ];
    const controls = document.createElement('div');
    controls.className = 'brc-editor__action-controls';
    const current = explicitAction || defaultAction;
    for (const option of actions) {
      const button = this._button(option.label, `brc-editor__action-button${current.action === option.value.action ? ' is-selected' : ''}`);
      button.addEventListener('click', () => {
        controls.querySelectorAll('.brc-editor__action-button').forEach((item) => item.classList.remove('is-selected'));
        button.classList.add('is-selected');
        this._updateTapAction(index, key, option.value);
      });
      controls.appendChild(button);
    }
    const advanced = this._button('YAML avanzato', 'brc-editor__advanced-button');
    const editor = document.createElement('ha-yaml-editor');
    editor.hidden = true;
    editor.defaultValue = explicitAction || defaultAction;
    advanced.addEventListener('click', () => { editor.hidden = !editor.hidden; });
    editor.addEventListener('value-changed', (event) => {
      if (event.detail && event.detail.isValid === false) return;
      this._updateTapAction(index, key, event.detail ? event.detail.value : undefined);
    });
    field.append(fieldLabel, controls, advanced, editor);
    return field;
  }

  _entityPicker(options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'brc-editor__field';
    wrapper.dataset.brcPickerLabel = options.label;
    const picker = document.createElement('ha-entity-picker');
    wrapper._brcPicker = picker;
    picker.hass = this._hass;
    picker.label = options.label;
    picker.value = options.multiple ? (options.value || []) : (options.value || '');
    if (options.multiple) picker.multiple = true;
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
      const value = event.detail ? event.detail.value : undefined;
      options.onValue(options.multiple ? (Array.isArray(value) ? value : []) : value);
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

  _autoEntitiesInfo(options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'brc-editor__auto-info';
    const title = document.createElement('strong');
    title.textContent = options.label;
    wrapper.appendChild(title);
    if (!options.areaId) {
      const message = document.createElement('div');
      message.className = 'brc-editor__helper';
      message.textContent = 'Seleziona prima un’area.';
      wrapper.appendChild(message);
      return wrapper;
    }
    const entityIds = areaScopedEntityIds(this._hass, options.areaId, options.domain);
    if (!entityIds.length) {
      const message = document.createElement('div');
      message.className = 'brc-editor__helper';
      message.textContent = 'Nessuna entità trovata in questa area.';
      wrapper.appendChild(message);
      return wrapper;
    }
    const summary = document.createElement('div');
    summary.className = 'brc-editor__helper';
    summary.textContent = `${entityIds.length} trovate. Disattiva quelle da escludere.`;
    wrapper.appendChild(summary);
    const excluded = new Set(options.excluded);
    for (const entityId of entityIds) {
      const row = document.createElement('label');
      row.className = 'brc-editor__detected-entity';
      const state = this._hass && this._hass.states && this._hass.states[entityId];
      const name = document.createElement('span');
      name.textContent = (state && state.attributes && state.attributes.friendly_name) || entityId;
      name.title = entityId;
      const toggle = document.createElement('ha-switch');
      toggle.checked = !excluded.has(entityId);
      toggle.addEventListener('change', () => {
        if (toggle.checked) excluded.delete(entityId);
        else excluded.add(entityId);
        options.onChange([...excluded]);
      });
      row.append(name, toggle);
      wrapper.appendChild(row);
    }
    return wrapper;
  }

  _areaSuggestions(label, areaId, domains, deviceClasses, current, pickerLabel, onPick) {
    const candidates = areaScopedEntityIds(this._hass, areaId, domains, deviceClasses);
    if (!candidates.length) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'brc-editor__suggestions';
    const heading = document.createElement('span');
    heading.textContent = `${label}:`;
    const chips = document.createElement('div');
    chips.className = 'brc-editor__suggestion-chips';
    for (const entityId of candidates) {
      const state = this._hass && this._hass.states && this._hass.states[entityId];
      const chip = this._button(
        (state && state.attributes && state.attributes.friendly_name) || entityId,
        `brc-editor__suggestion-chip${entityId === current ? ' is-selected' : ''}`
      );
      chip.title = entityId;
      chip.addEventListener('click', () => {
        chips.querySelectorAll('.brc-editor__suggestion-chip').forEach((button) => button.classList.remove('is-selected'));
        chip.classList.add('is-selected');
        const pickerField = wrapper.parentElement && wrapper.parentElement.querySelector(
          `[data-brc-picker-label="${pickerLabel}"]`
        );
        if (pickerField && pickerField._brcPicker) pickerField._brcPicker.value = entityId;
        onPick(entityId);
      });
      chips.appendChild(chip);
    }
    wrapper.append(heading, chips);
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

  _switch(label, checked, onChange, description) {
    const row = document.createElement('div');
    row.className = 'brc-editor__switch';
    const copy = document.createElement('div');
    const text = document.createElement('span');
    text.textContent = label;
    copy.appendChild(text);
    if (description) {
      const helper = document.createElement('div');
      helper.className = 'brc-editor__helper';
      helper.textContent = description;
      copy.appendChild(helper);
    }
    const control = document.createElement('ha-switch');
    control.checked = checked;
    control.addEventListener('change', () => onChange(control.checked));
    row.append(copy, control);
    return row;
  }

  _panel(title, expanded = false) {
    const panel = document.createElement('ha-expansion-panel');
    panel.header = title;
    panel.setAttribute('outlined', '');
    const key = `${this._renderingRoomIndex}:${title}`;
    panel.dataset.brcRoomIndex = String(this._renderingRoomIndex);
    panel.dataset.brcPanel = title;
    panel.expanded = this._expandedPanels && this._expandedPanels.has(key)
      ? this._expandedPanels.get(key)
      : expanded;
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
    this._configSignature = configSignature(config);
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

  _roomSummary(room) {
    const area = room.area && this._hass && this._hass.areas && this._hass.areas[room.area];
    const areaName = area ? area.name : room.area;
    const mode = room.auto_entities === false ? 'Selezione manuale' : 'Rilevamento automatico';
    return areaName ? `${areaName} · ${mode}` : mode;
  }

  _styleElement() {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      .brc-editor__room {
        margin: 0 0 16px;
      }
      .brc-editor__header, .brc-editor__switch {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .brc-editor__header { margin-bottom: 12px; }
      .brc-editor__header h3 { margin: 0; font-size: 1rem; }
      .brc-editor__panel-content { padding: 12px; }
      .brc-editor__field, .brc-editor__yaml-field, .brc-editor__action-field, .brc-editor__switch, .brc-editor__auto-info, .brc-editor__suggestions {
        margin-bottom: 16px;
      }
      .brc-editor__field ha-entity-picker,
      ha-area-picker, ha-textfield, ha-icon-picker { width: 100%; }
      .brc-editor__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
      .brc-editor__helper { margin-top: 4px; color: var(--secondary-text-color); font-size: 0.85rem; }
      .brc-editor__auto-info { padding: 10px 12px; border-radius: 8px; background: var(--secondary-background-color); color: var(--secondary-text-color); font-size: 0.9rem; }
      .brc-editor__auto-info strong { color: var(--primary-text-color); }
      .brc-editor__detected-entity { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 8px; color: var(--primary-text-color); }
      .brc-editor__detected-entity span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .brc-editor__suggestions > span { display: block; margin-bottom: 6px; color: var(--secondary-text-color); font-size: 0.85rem; }
      .brc-editor__suggestion-chips, .brc-editor__action-controls { display: flex; flex-wrap: wrap; gap: 6px; }
      .brc-editor__suggestion-chip, .brc-editor__action-button, .brc-editor__advanced-button { min-height: 30px; padding: 0 10px; border: 1px solid var(--divider-color); border-radius: 999px; color: var(--primary-text-color); background: var(--card-background-color); font: inherit; font-size: 0.85rem; cursor: pointer; }
      .brc-editor__suggestion-chip.is-selected, .brc-editor__action-button.is-selected { border-color: var(--primary-color); color: var(--primary-color); background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff); }
      .brc-editor__action-field > label { display: block; margin-bottom: 8px; font-weight: 600; }
      .brc-editor__advanced-button { margin-top: 8px; }
      .brc-editor__action-field ha-yaml-editor { display: block; margin-top: 8px; }
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
