const ADJECTIVES = [
  "Swift", "Bright", "Cozy", "Nimble", "Sunny", "Bold", "Clever", "Merry",
  "Vivid", "Breezy", "Sturdy", "Lively", "Snappy", "Zesty", "Golden", "Crisp",
];

const NOUNS = [
  "Otter", "Falcon", "Meadow", "Harbor", "Ember", "Willow", "Compass", "Lantern",
  "Ridge", "Pebble", "Marble", "Orbit", "Thistle", "Beacon", "Anchor", "Quartz",
];

export function generateRandomAppName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
