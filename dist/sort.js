// src/sort.js
function attributeValue(hass, entityId, attribute) {
  const state = hass.states[entityId];
  if (!state) return null;
  if (attribute === 'last_changed') {
    return new Date(state.last_changed).getTime();
  }
  return state.state;
}

function compareStep(hass, step, entityIdA, entityIdB) {
  const a = attributeValue(hass, entityIdA, step.attribute);
  const b = attributeValue(hass, entityIdB, step.attribute);
  let result = 0;
  if (a < b) result = -1;
  else if (a > b) result = 1;
  return step.reverse ? -result : result;
}

export function sortRooms(hass, rooms, sortSteps) {
  let sorted = rooms.slice();
  for (const step of sortSteps) {
    sorted = sorted
      .slice()
      .sort((a, b) => compareStep(hass, step, a.entityId, b.entityId));
  }
  return sorted;
}
