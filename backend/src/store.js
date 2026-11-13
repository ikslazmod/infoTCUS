const fs = require('fs');
const path = require('path');
const config = require('./config');
const seed = require('../data/events.seed.json');

const eventsFile = path.join(config.dataDir, 'events.json');
const regsFile = path.join(config.dataDir, 'registrations.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadEvents() {
  if (!fs.existsSync(eventsFile)) {
    writeJson(eventsFile, seed);
    return [...seed];
  }
  return readJson(eventsFile, [...seed]);
}

function saveEvents(events) {
  writeJson(eventsFile, events);
}

function loadRegistrations() {
  return readJson(regsFile, []);
}

function saveRegistrations(regs) {
  writeJson(regsFile, regs);
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = { loadEvents, saveEvents, loadRegistrations, saveRegistrations, nextId };
