const fs = require('fs');
const path = require('path');

const SOUNDS_DIR = path.join(__dirname, '..', 'assets', 'sounds');

if (!fs.existsSync(SOUNDS_DIR)) {
  fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

function generateWavHeader(numSamples, sampleRate) {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Channels = 1
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate = SampleRate * 2
  buffer.writeUInt16LE(2, 32); // BlockAlign = 2
  buffer.writeUInt16LE(16, 34); // BitsPerSample = 16
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  return buffer;
}

function generateToneBuffer({ tones, type = 'sine', sampleRate = 8000 }) {
  // tones: array of { freq, duration, decayStartOffset }
  let totalSamples = 0;
  tones.forEach(t => {
    totalSamples += Math.floor(sampleRate * t.duration);
  });

  const header = generateWavHeader(totalSamples, sampleRate);
  const data = Buffer.alloc(totalSamples * 2);

  let sampleOffset = 0;
  tones.forEach(t => {
    const toneSamples = Math.floor(sampleRate * t.duration);
    for (let i = 0; i < toneSamples; i++) {
      const time = i / sampleRate;
      let val = 0;
      if (type === 'sine') {
        val = Math.sin(2 * Math.PI * t.freq * time);
      } else if (type === 'sawtooth') {
        val = 2 * (time * t.freq - Math.floor(time * t.freq + 0.5));
      }

      // Exponential decay relative to tone duration
      const decay = Math.exp(-6 * (i / toneSamples));
      const sampleVal = Math.floor(val * decay * 32767 * 0.4);

      data.writeInt16LE(sampleVal, (sampleOffset + i) * 2);
    }
    sampleOffset += toneSamples;
  });

  return Buffer.concat([header, data]);
}

// Generate the click.wav
console.log('Generating click.wav...');
const clickWav = generateToneBuffer({
  tones: [{ freq: 600, duration: 0.05 }],
  type: 'sine'
});
fs.writeFileSync(path.join(SOUNDS_DIR, 'click.wav'), clickWav);

// Generate the nav.wav
console.log('Generating nav.wav...');
const navWav = generateToneBuffer({
  tones: [{ freq: 700, duration: 0.04 }],
  type: 'sine'
});
fs.writeFileSync(path.join(SOUNDS_DIR, 'nav.wav'), navWav);

// Generate the swipe.wav (combination of 400Hz and 500Hz)
console.log('Generating swipe.wav...');
const swipeWav = generateToneBuffer({
  tones: [
    { freq: 400, duration: 0.08 },
    { freq: 500, duration: 0.06 }
  ],
  type: 'sine'
});
fs.writeFileSync(path.join(SOUNDS_DIR, 'swipe.wav'), swipeWav);

// Generate success.wav (660Hz and 880Hz)
console.log('Generating success.wav...');
const successWav = generateToneBuffer({
  tones: [
    { freq: 660, duration: 0.15 },
    { freq: 880, duration: 0.20 }
  ],
  type: 'sine'
});
fs.writeFileSync(path.join(SOUNDS_DIR, 'success.wav'), successWav);

// Generate error.wav (200Hz and 150Hz sawtooth)
console.log('Generating error.wav...');
const errorWav = generateToneBuffer({
  tones: [
    { freq: 200, duration: 0.15 },
    { freq: 150, duration: 0.30 }
  ],
  type: 'sawtooth'
});
fs.writeFileSync(path.join(SOUNDS_DIR, 'error.wav'), errorWav);

console.log('All synthetic sounds generated successfully!');
