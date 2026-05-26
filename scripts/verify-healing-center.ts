import assert from 'node:assert/strict';
import {
  getHealingMood,
  getHealingProgress,
  getRandomHealingEmoji,
  HEALING_MOODS,
} from '../src/lib/healingCenter.ts';

assert.equal(getHealingMood(0).id, 'anger');
assert.equal(getHealingMood(49).id, 'anger');
assert.equal(getHealingMood(50).id, 'calm');
assert.equal(getHealingMood(99).id, 'calm');
assert.equal(getHealingMood(100).id, 'peace');
assert.equal(getHealingMood(150).id, 'peace');

assert.equal(getHealingProgress(0), 0);
assert.equal(getHealingProgress(40), 40);
assert.equal(getHealingProgress(100), 100);
assert.equal(getHealingProgress(120), 100);

for (const mood of HEALING_MOODS) {
  const emoji = getRandomHealingEmoji(mood);
  assert.ok(mood.emojis.includes(emoji));
}

console.log('healing center logic test passed');
