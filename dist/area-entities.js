export function areaEntities(hass, areaId, domain) {
  const entities = hass.entities || {};
  const devices = hass.devices || {};
  const prefix = domain + '.';
  const result = [];
  for (const [entityId, entity] of Object.entries(entities)) {
    if (!entityId.startsWith(prefix)) continue;
    let entityAreaId = entity.area_id || null;
    if (!entityAreaId && entity.device_id && devices[entity.device_id]) {
      entityAreaId = devices[entity.device_id].area_id || null;
    }
    if (entityAreaId === areaId) result.push(entityId);
  }
  result.sort();
  return result;
}
