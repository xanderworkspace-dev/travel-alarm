const STORAGE_KEY = "travel-passport-alarms-v2";
const MINUTE_HEIGHT = 46;
const IS_DAY_NIGHT_DEMO = new URLSearchParams(window.location.search).get("demo") === "day-night";
const DESIGN_PREVIEW_LOCAL_ZONE = IS_DAY_NIGHT_DEMO ? "Europe/London" : "";

const ZONES = [
  { id: "America/Los_Angeles", city: "Los Angeles", code: "LAX" },
  { id: "America/New_York", city: "New York", code: "JFK" },
  { id: "America/Sao_Paulo", city: "Sao Paulo", code: "GRU" },
  { id: "Europe/London", city: "London", code: "LHR" },
  { id: "Europe/Paris", city: "Paris", code: "CDG" },
  { id: "Asia/Dubai", city: "Dubai", code: "DXB" },
  { id: "Asia/Kolkata", city: "Mumbai", code: "BOM" },
  { id: "Asia/Bangkok", city: "Bangkok", code: "BKK" },
  { id: "Asia/Singapore", city: "Singapore", code: "SIN" },
  { id: "Asia/Shanghai", city: "China", code: "CN" },
  { id: "Asia/Tokyo", city: "Tokyo", code: "HND" },
  { id: "Australia/Sydney", city: "Sydney", code: "SYD" }
];

const els = {
  statusTime: document.querySelector("#status-time"),
  localCard: document.querySelector(".local-card"),
  homeCard: document.querySelector(".home-card"),
  localSkyIcon: document.querySelector("#local-sky-icon"),
  homeSkyIcon: document.querySelector("#home-sky-icon"),
  localNowTime: document.querySelector("#local-now-time"),
  homeNowTime: document.querySelector("#home-now-time"),
  localNowPlace: document.querySelector("#local-now-place"),
  homeNowPlace: document.querySelector("#home-now-place"),
  homePin: document.querySelector("#home-pin"),
  localPin: document.querySelector("#local-pin"),
  homePinLabel: document.querySelector("#home-pin-label"),
  localPinLabel: document.querySelector("#local-pin-label"),
  alarmCount: document.querySelector("#alarm-count"),
  alarmList: document.querySelector("#alarm-list"),
  addAlarm: document.querySelector("#add-alarm"),
  editorScrim: document.querySelector("#editor-scrim"),
  editorSheet: document.querySelector("#editor-sheet"),
  editorTitle: document.querySelector("#editor-title"),
  cancelEditor: document.querySelector("#cancel-editor"),
  saveAlarm: document.querySelector("#save-alarm"),
  deleteAlarm: document.querySelector("#delete-alarm"),
  anchorZoneTrigger: document.querySelector("#anchor-zone-trigger"),
  anchorZoneName: document.querySelector("#anchor-zone-name"),
  anchorZoneCode: document.querySelector("#anchor-zone-code"),
  hourWheel: document.querySelector("#hour-wheel"),
  minuteWheel: document.querySelector("#minute-wheel"),
  previewIcon: document.querySelector("#preview-icon"),
  previewCopy: document.querySelector("#preview-copy"),
  previewTime: document.querySelector("#preview-time"),
  alarmLabel: document.querySelector("#alarm-label"),
  daySelector: document.querySelector("#day-selector"),
  zoneScrim: document.querySelector("#zone-scrim"),
  zoneSheet: document.querySelector("#zone-sheet"),
  zoneList: document.querySelector("#zone-list"),
  zoneSearch: document.querySelector("#zone-search"),
  closeZones: document.querySelector("#close-zones")
};

let localZone = getLocalZone();
const homeZone = getZone("Asia/Singapore");
let alarms = loadAlarms();
let draft = null;
let editingId = null;
let clockTimer = null;
let wheelTimer = null;

function clockNow() {
  return new Date();
}

function getLocalZone() {
  const id = DESIGN_PREVIEW_LOCAL_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore";
  const seeded = getZone(id);
  if (seeded) return seeded;
  const city = id.split("/").pop().replaceAll("_", " ");
  return { id, city, code: "YOU" };
}

function getZone(id) {
  return ZONES.find((zone) => zone.id === id);
}

function loadAlarms() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (error) {
    console.warn("Could not load alarms", error);
  }

  return [
    { id: "wake-up", label: "Wake up", hour: 7, minute: 0, anchorZone: "Asia/Singapore", days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
    { id: "standup", label: "Standup call", hour: 9, minute: 0, anchorZone: "Europe/London", days: [1, 2, 3, 4, 5], enabled: true },
    { id: "meds", label: "Meds", hour: 22, minute: 0, anchorZone: "Asia/Singapore", days: [0, 1, 2, 3, 4, 5, 6], enabled: false }
  ];
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function icon(type) {
  const attrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  if (type === "sun") {
    return `<svg ${attrs}><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"></circle><line x1="12" y1="2.5" x2="12" y2="4.5"></line><line x1="12" y1="19.5" x2="12" y2="21.5"></line><line x1="2.5" y1="12" x2="4.5" y2="12"></line><line x1="19.5" y1="12" x2="21.5" y2="12"></line><line x1="5.2" y1="5.2" x2="6.6" y2="6.6"></line><line x1="17.4" y1="17.4" x2="18.8" y2="18.8"></line><line x1="5.2" y1="18.8" x2="6.6" y2="17.4"></line><line x1="17.4" y1="6.6" x2="18.8" y2="5.2"></line></svg>`;
  }
  if (type === "moon") {
    return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"></path></svg>`;
  }
  return `<svg ${attrs}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
}

function getParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function offsetMinutes(timeZone, date = new Date()) {
  const zoned = getParts(date, timeZone);
  const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

function formatOffset(timeZone, date = new Date()) {
  const offset = offsetMinutes(timeZone, date);
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return minutes ? `UTC${sign}${hours}:${pad(minutes)}` : `UTC${sign}${hours}`;
}

function zoneMeta(zone) {
  return `${zone.code} · ${formatOffset(zone.id)}`;
}

function timeString(date, timeZone, seconds = false) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: seconds ? "2-digit" : undefined,
    hour12: false,
    hourCycle: "h23"
  }).format(date);
}

function dayPhase(hour) {
  if (hour >= 5 && hour < 11) return "your morning";
  if (hour >= 11 && hour < 17) return "your afternoon";
  if (hour >= 17 && hour < 22) return "your evening";
  return "your night";
}

function homePhase(hour) {
  return dayPhase(hour).replace("your", "home");
}

function isDay(hour) {
  return hour >= 6 && hour < 19;
}

function normalizedLocalRing(alarm, now = new Date()) {
  const anchor = getZone(alarm.anchorZone) || homeZone;
  const anchorOffset = offsetMinutes(anchor.id, now);
  const localOffset = offsetMinutes(localZone.id, now);
  const anchorMinutes = alarm.hour * 60 + alarm.minute;
  let localMinutes = anchorMinutes + localOffset - anchorOffset;
  let dayDelta = 0;

  while (localMinutes < 0) {
    localMinutes += 1440;
    dayDelta -= 1;
  }
  while (localMinutes >= 1440) {
    localMinutes -= 1440;
    dayDelta += 1;
  }

  const hour = Math.floor(localMinutes / 60);
  const minute = localMinutes % 60;
  return { hour, minute, dayDelta, anchor };
}

function dayDeltaText(dayDelta) {
  if (dayDelta === -1) return " -1d";
  if (dayDelta === 1) return " +1d";
  return "";
}

function repeatText(days) {
  if (!days?.length) return "once";
  if (days.length === 7) return "daily";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.slice().sort((a, b) => a - b).map((day) => names[day]).join(" ");
}

function cloneAlarm(alarm) {
  return JSON.parse(JSON.stringify(alarm));
}

function newAlarmId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `alarm-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function renderClock() {
  localZone = getLocalZone();
  const now = clockNow();
  const localParts = getParts(now, localZone.id);
  const homeParts = getParts(now, homeZone.id);

  els.statusTime.textContent = timeString(now, localZone.id);
  els.localNowTime.textContent = timeString(now, localZone.id);
  els.homeNowTime.textContent = timeString(now, homeZone.id);
  els.localNowPlace.textContent = `${localZone.city} · ${dayPhase(localParts.hour)}`;
  els.homeNowPlace.textContent = `${homeZone.city} · ${homePhase(homeParts.hour)}`;
  els.localSkyIcon.innerHTML = icon(isDay(localParts.hour) ? "sun" : "moon");
  els.homeSkyIcon.innerHTML = icon(isDay(homeParts.hour) ? "sun" : "moon");
  setCardPhase(els.localCard, isDay(localParts.hour));
  setCardPhase(els.homeCard, isDay(homeParts.hour));

  const localPercent = ((localParts.hour * 60 + localParts.minute) / 1440) * 100;
  const homePercent = ((homeParts.hour * 60 + homeParts.minute) / 1440) * 100;
  els.localPinLabel.textContent = `YOU ${pad(localParts.hour)}:${pad(localParts.minute)}`;
  els.homePinLabel.textContent = `HOME ${pad(homeParts.hour)}:${pad(homeParts.minute)}`;
  setPin(els.localPin, els.localPinLabel, localPercent);
  setPin(els.homePin, els.homePinLabel, homePercent);
  avoidOverlappingBandLabels(localPercent, homePercent);
}

function setPin(pin, label, percent) {
  const clamped = Math.min(98, Math.max(2, percent));
  pin.style.left = `${clamped}%`;
  label.style.left = `${clamped}%`;
}

function setCardPhase(card, isDaytime) {
  card.classList.toggle("time-day", isDaytime);
  card.classList.toggle("time-night", !isDaytime);
}

function avoidOverlappingBandLabels(localPercent, homePercent) {
  els.localPinLabel.classList.remove("label-left", "label-right");
  els.homePinLabel.classList.remove("label-left", "label-right");

  if (Math.abs(localPercent - homePercent) < 12) {
    els.localPinLabel.classList.add("label-left");
    els.homePinLabel.classList.add("label-right");
  }
}

function renderAlarms() {
  els.alarmList.innerHTML = "";
  els.alarmCount.textContent = `· ${alarms.length}`;

  for (const alarm of alarms) {
    const localRing = normalizedLocalRing(alarm);
    const row = document.createElement("article");
    row.className = `alarm-row${alarm.enabled ? "" : " disabled"}`;
    row.tabIndex = 0;
    row.dataset.id = alarm.id;

    const relativeDay = localRing.dayDelta === -1 ? " · prev day" : localRing.dayDelta === 1 ? " · next day" : "";
    const detail = `${pad(alarm.hour)}:${pad(alarm.minute)} ${localRing.anchor.code} → rings ${pad(localRing.hour)}:${pad(localRing.minute)}${dayDeltaText(localRing.dayDelta)} · ${dayPhase(localRing.hour)}${relativeDay}`;
    row.innerHTML = `
      <span class="alarm-icon" aria-hidden="true">${icon("moon")}</span>
      <span class="alarm-copy">
        <strong class="alarm-name">${escapeHtml(alarm.label || "Travel alarm")}</strong>
        <small class="alarm-detail">${escapeHtml(detail)}</small>
      </span>
      <button class="toggle ${alarm.enabled ? "on" : ""}" type="button" aria-label="${alarm.enabled ? "Disable" : "Enable"} ${escapeHtml(alarm.label || "alarm")}"></button>
    `;
    els.alarmList.append(row);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  renderClock();
  renderAlarms();
}

function buildWheel(column, max) {
  column.innerHTML = '<div class="wheel-spacer"></div>';
  for (let value = 0; value < max; value += 1) {
    const item = document.createElement("button");
    item.className = "wheel-item";
    item.type = "button";
    item.dataset.value = String(value);
    item.textContent = pad(value);
    column.append(item);
  }
  column.insertAdjacentHTML("beforeend", '<div class="wheel-spacer"></div>');
}

function selectWheelValue(column, value) {
  const target = Number(value);
  column.querySelectorAll(".wheel-item").forEach((item) => {
    item.classList.toggle("selected", Number(item.dataset.value) === target);
  });
}

function scrollWheelTo(column, value) {
  requestAnimationFrame(() => {
    column.scrollTop = Number(value) * MINUTE_HEIGHT;
    selectWheelValue(column, value);
  });
}

function wheelValue(column) {
  const value = Math.round(column.scrollTop / MINUTE_HEIGHT);
  const max = column === els.hourWheel ? 23 : 59;
  return Math.min(max, Math.max(0, value));
}

function syncDraftFromWheels() {
  if (!draft) return;
  draft.hour = wheelValue(els.hourWheel);
  draft.minute = wheelValue(els.minuteWheel);
  selectWheelValue(els.hourWheel, draft.hour);
  selectWheelValue(els.minuteWheel, draft.minute);
  updateEditor();
}

function openEditor(alarm = null) {
  editingId = alarm?.id || null;
  draft = alarm
    ? cloneAlarm(alarm)
    : { id: newAlarmId(), label: "Travel alarm", hour: 8, minute: 0, anchorZone: homeZone.id, days: [0, 1, 2, 3, 4, 5, 6], enabled: true };

  els.editorTitle.textContent = alarm ? "Edit alarm" : "New alarm";
  els.deleteAlarm.hidden = !alarm;
  els.alarmLabel.value = draft.label || "";
  els.editorScrim.hidden = false;
  els.editorSheet.hidden = false;
  scrollWheelTo(els.hourWheel, draft.hour);
  scrollWheelTo(els.minuteWheel, draft.minute);
  updateEditor();
}

function closeEditor() {
  els.editorScrim.hidden = true;
  els.editorSheet.hidden = true;
  draft = null;
  editingId = null;
}

function updateEditor() {
  if (!draft) return;
  const zone = getZone(draft.anchorZone) || homeZone;
  const localRing = normalizedLocalRing(draft);

  els.anchorZoneName.textContent = zone.city;
  els.anchorZoneCode.textContent = zoneMeta(zone);
  els.previewTime.textContent = `${pad(localRing.hour)}:${pad(localRing.minute)}`;
  els.previewCopy.textContent = dayPhase(localRing.hour);
  els.previewIcon.innerHTML = icon(isDay(localRing.hour) ? "sun" : "moon");

  els.daySelector.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", draft.days.includes(Number(button.dataset.day)));
  });
}

function saveDraft() {
  if (!draft) return;
  draft.label = els.alarmLabel.value.trim() || "Travel alarm";
  const index = alarms.findIndex((alarm) => alarm.id === editingId);
  if (index >= 0) alarms[index] = draft;
  else alarms.unshift(draft);
  saveAlarms();
  closeEditor();
  render();
}

function deleteDraft() {
  if (!editingId) return;
  alarms = alarms.filter((alarm) => alarm.id !== editingId);
  saveAlarms();
  closeEditor();
  render();
}

function openZoneSheet() {
  if (!draft) return;
  els.zoneSearch.value = "";
  renderZones();
  els.zoneScrim.hidden = false;
  els.zoneSheet.hidden = false;
  requestAnimationFrame(() => els.zoneSearch.focus());
}

function closeZoneSheet() {
  els.zoneScrim.hidden = true;
  els.zoneSheet.hidden = true;
}

function renderZones() {
  els.zoneList.innerHTML = "";
  const query = els.zoneSearch.value.trim().toLowerCase();
  const filteredZones = ZONES.filter((zone) => {
    const haystack = `${zone.city} ${zone.code} ${zone.id} ${formatOffset(zone.id)}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!filteredZones.length) {
    els.zoneList.innerHTML = '<div class="zone-empty">No matching city</div>';
    return;
  }

  for (const zone of filteredZones) {
    const button = document.createElement("button");
    button.className = "zone-option";
    button.type = "button";
    button.dataset.zone = zone.id;
    const selected = draft?.anchorZone === zone.id;
    const extra = zone.id === "Asia/Singapore" ? "Singapore / China share UTC+8" : zone.id;
    button.innerHTML = `
      <span class="zone-code">${zone.code}</span>
      <span class="zone-copy"><strong>${escapeHtml(zone.city)}</strong><small>${escapeHtml(extra)} · ${formatOffset(zone.id)}</small></span>
      <span class="zone-check" aria-hidden="true">${selected ? "✓" : ""}</span>
    `;
    els.zoneList.append(button);
  }
}

function wireEvents() {
  els.addAlarm.addEventListener("click", () => openEditor());
  els.cancelEditor.addEventListener("click", closeEditor);
  els.editorScrim.addEventListener("click", closeEditor);
  els.saveAlarm.addEventListener("click", saveDraft);
  els.deleteAlarm.addEventListener("click", deleteDraft);
  els.anchorZoneTrigger.addEventListener("click", openZoneSheet);
  els.closeZones.addEventListener("click", closeZoneSheet);
  els.zoneScrim.addEventListener("click", closeZoneSheet);
  els.zoneSearch.addEventListener("input", renderZones);

  els.alarmList.addEventListener("click", (event) => {
    const row = event.target.closest(".alarm-row");
    if (!row) return;
    const alarm = alarms.find((item) => item.id === row.dataset.id);
    if (!alarm) return;

    if (event.target.closest(".toggle")) {
      alarm.enabled = !alarm.enabled;
      saveAlarms();
      renderAlarms();
      return;
    }
    openEditor(alarm);
  });

  els.alarmList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".alarm-row");
    const alarm = alarms.find((item) => item.id === row?.dataset.id);
    if (alarm) openEditor(alarm);
  });

  els.alarmLabel.addEventListener("input", () => {
    if (draft) draft.label = els.alarmLabel.value;
  });

  els.daySelector.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-day]");
    if (!button || !draft) return;
    const day = Number(button.dataset.day);
    draft.days = draft.days.includes(day)
      ? draft.days.filter((item) => item !== day)
      : [...draft.days, day].sort((a, b) => a - b);
    updateEditor();
  });

  els.zoneList.addEventListener("click", (event) => {
    const button = event.target.closest(".zone-option");
    if (!button || !draft) return;
    draft.anchorZone = button.dataset.zone;
    updateEditor();
    closeZoneSheet();
  });

  [els.hourWheel, els.minuteWheel].forEach((column) => {
    column.addEventListener("scroll", () => {
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(syncDraftFromWheels, 45);
    });
    column.addEventListener("click", (event) => {
      const item = event.target.closest(".wheel-item");
      if (!item) return;
      column.scrollTo({ top: Number(item.dataset.value) * MINUTE_HEIGHT, behavior: "smooth" });
    });
  });
}

function startClock() {
  clearInterval(clockTimer);
  renderClock();
  clockTimer = setInterval(renderClock, 1000);
}

buildWheel(els.hourWheel, 24);
buildWheel(els.minuteWheel, 60);
wireEvents();
render();
startClock();
