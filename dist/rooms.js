export function resolveRooms(hass, label) {
  const entities = hass.entities || {};
  const devices = hass.devices || {};
  const rooms = [];
  for (const [entityId, entity] of Object.entries(entities)) {
    if (!entity.labels || !entity.labels.includes(label)) continue;
    let areaId = entity.area_id || null;
    if (!areaId && entity.device_id && devices[entity.device_id]) {
      areaId = devices[entity.device_id].area_id || null;
    }
    rooms.push({ entityId, areaId });
  }
  rooms.sort((a, b) => a.entityId.localeCompare(b.entityId));
  return rooms;
}
