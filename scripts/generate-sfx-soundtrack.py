"""
Synthesizes a 30-second modern tech promo soundtrack with custom SFX and electronic beat
using pure Python standard library (wave, math, struct, random).
Output: 48kHz, 16-bit stereo PCM WAV.
"""
import math
import struct
import random
import wave
import os

SAMPLE_RATE = 48000
DURATION = 30.0
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)

left_buf = [0.0] * NUM_SAMPLES
right_buf = [0.0] * NUM_SAMPLES

def clamp(v, lo=-1.0, hi=1.0):
    return max(lo, min(hi, v))

def add_sample(idx, l_val, r_val):
    if 0 <= idx < NUM_SAMPLES:
        left_buf[idx] += l_val
        right_buf[idx] += r_val

def add_sound(start_time, duration, gen_fn, pan=0.0, gain=1.0):
    start_sample = int(start_time * SAMPLE_RATE)
    total_samples = int(duration * SAMPLE_RATE)
    # pan: -1.0 (full left) to +1.0 (full right)
    l_mul = (1.0 - pan) * 0.707 * gain
    r_mul = (1.0 + pan) * 0.707 * gain
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        val = gen_fn(t, i, total_samples)
        add_sample(start_sample + i, val * l_mul, val * r_mul)

# --- Sound Synthesis Helpers ---

def synth_kick(start_time, gain=0.9):
    def kick_fn(t, i, n):
        # Pitch envelope drops from 150Hz to 40Hz
        freq = 40.0 + 110.0 * math.exp(-t * 28.0)
        phase = 2.0 * math.pi * freq * t
        amp = math.exp(-t * 14.0)
        body = math.sin(phase) * amp
        # Attack click
        click = (random.random() * 2.0 - 1.0) * math.exp(-t * 120.0) * 0.4
        return body + click
    add_sound(start_time, 0.4, kick_fn, pan=0.0, gain=gain)

def synth_snare(start_time, gain=0.75):
    def snare_fn(t, i, n):
        tone = math.sin(2.0 * math.pi * 180.0 * t) * math.exp(-t * 22.0) * 0.6
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 16.0) * 0.8
        snap = math.sin(2.0 * math.pi * 320.0 * t) * math.exp(-t * 40.0) * 0.5
        return tone + noise + snap
    add_sound(start_time, 0.35, snare_fn, pan=0.0, gain=gain)

def synth_hihat(start_time, gain=0.35, open_len=False):
    decay = 18.0 if open_len else 85.0
    def hat_fn(t, i, n):
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * decay)
        # high metallic ring
        ring = (math.sin(2.0 * math.pi * 8400.0 * t) + math.sin(2.0 * math.pi * 10200.0 * t)) * 0.25 * math.exp(-t * decay)
        return noise + ring
    add_sound(start_time, 0.25 if open_len else 0.08, hat_fn, pan=random.uniform(-0.25, 0.25), gain=gain)

def synth_sub_drop(start_time, duration=2.2, gain=1.0):
    def drop_fn(t, i, n):
        freq = 90.0 * math.exp(-t * 1.8) + 32.0
        amp = math.sin(math.pi * min(1.0, t * 15.0)) * math.exp(-t * 1.2)
        return math.sin(2.0 * math.pi * freq * t) * amp
    add_sound(start_time, duration, drop_fn, pan=0.0, gain=gain)

def synth_riser(start_time, duration=2.5, gain=0.6):
    def rise_fn(t, i, n):
        p = t / duration
        freq = 120.0 + 1200.0 * (p ** 2.2)
        amp = (p ** 1.8) * (1.0 - 0.1 * math.sin(2.0 * math.pi * 16.0 * t))
        noise = (random.random() * 2.0 - 1.0) * 0.35 * (p ** 2.0)
        return (math.sin(2.0 * math.pi * freq * t) * 0.7 + noise) * amp
    add_sound(start_time, duration, rise_fn, pan=0.0, gain=gain)

def synth_whoosh(start_time, duration=0.6, pan_dir=1.0, gain=0.7):
    def whoosh_fn(t, i, n):
        p = t / duration
        amp = math.sin(math.pi * p)
        # filtered noise sweeping
        cutoff = 400.0 + 3200.0 * math.sin(math.pi * p)
        noise = (random.random() * 2.0 - 1.0) * amp
        return noise
    # Pan moves across stereo field
    add_sound(start_time, duration, whoosh_fn, pan=0.4 * pan_dir, gain=gain)

def synth_click(start_time, freq=2400.0, gain=0.5):
    def click_fn(t, i, n):
        return math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 180.0)
    add_sound(start_time, 0.04, click_fn, pan=0.1, gain=gain)

def synth_vault_lock(start_time, gain=1.0):
    # Heavy metallic deadbolt snap + sub thud
    synth_click(start_time, freq=1800.0, gain=0.7)
    synth_click(start_time + 0.06, freq=3200.0, gain=0.8)
    def lock_thud(t, i, n):
        freq = 75.0 * math.exp(-t * 22.0) + 38.0
        metal = (math.sin(2.0 * math.pi * 480.0 * t) + math.sin(2.0 * math.pi * 880.0 * t)) * 0.4 * math.exp(-t * 30.0)
        sub = math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 10.0)
        return sub + metal
    add_sound(start_time + 0.08, 0.6, lock_thud, pan=0.0, gain=gain)

def synth_chime(start_time, notes=[523.25, 659.25, 783.99, 1046.50], gain=0.6):
    for idx, freq in enumerate(notes):
        note_start = start_time + idx * 0.075
        def chime_fn(t, i, n, f=freq):
            fundamental = math.sin(2.0 * math.pi * f * t)
            harm2 = math.sin(2.0 * math.pi * f * 2.0 * t) * 0.35
            harm3 = math.sin(2.0 * math.pi * f * 3.0 * t) * 0.15
            amp = math.exp(-t * 5.0)
            return (fundamental + harm2 + harm3) * amp
        add_sound(note_start, 0.9, chime_fn, pan=-0.3 + 0.2 * idx, gain=gain)

def synth_beep_scan(start_time, gain=0.5):
    def beep_fn(t, i, n):
        amp = math.sin(math.pi * (t / 0.12)) if t < 0.12 else 0.0
        return math.sin(2.0 * math.pi * 2637.0 * t) * amp
    add_sound(start_time, 0.14, beep_fn, pan=0.15, gain=gain)

def synth_bass_note(start_time, duration, freq, gain=0.45):
    def bass_fn(t, i, n):
        # 808 style saturated sub bass
        p = 2.0 * math.pi * freq * t
        sub = math.sin(p)
        harm = math.sin(p * 2.0) * 0.3 + math.sin(p * 3.0) * 0.1
        val = sub + harm
        # subtle soft clip
        val = math.tanh(val * 1.5)
        # ADSR envelope
        attack = min(1.0, t / 0.02)
        release = min(1.0, (duration - t) / 0.05) if t > duration - 0.05 else 1.0
        return val * attack * release
    add_sound(start_time, duration, bass_fn, pan=0.0, gain=gain)

def synth_synth_chord(start_time, duration, freqs, gain=0.25):
    for f in freqs:
        def chord_fn(t, i, n, freq=f):
            osc1 = math.sin(2.0 * math.pi * freq * t)
            osc2 = math.sin(2.0 * math.pi * (freq * 1.004) * t) * 0.5
            val = osc1 + osc2
            env = math.exp(-t * 2.2) * min(1.0, t / 0.015)
            return val * env
        add_sound(start_time, duration, chord_fn, pan=random.uniform(-0.4, 0.4), gain=gain)

# --- Compose 30-Second Arrangement ---
BPM = 124.0
BEAT = 60.0 / BPM  # ~0.48387s

# 1. Opening Drop & Hook (0.0s - 3.2s)
synth_sub_drop(0.05, duration=2.5, gain=0.95)
synth_vault_lock(2.75, gain=1.1)

# Chords progressions: F minor, Ab major, Eb major, Bb minor
CHORDS = [
    [174.61, 261.63, 311.13, 392.00], # F minor 9
    [207.65, 261.63, 311.13, 415.30], # Ab major
    [155.56, 233.08, 311.13, 392.00], # Eb major
    [116.54, 174.61, 233.08, 277.18], # Bb minor
]

BASS_NOTES = [43.65, 51.91, 38.89, 29.14] # F1, Ab1, Eb1, Bb0

# Build rhythmic groove starting at beat 8 (~3.87s) up to 28.5s
start_beat = 8
end_beat = int(DURATION / BEAT) - 2

for b in range(start_beat, end_beat):
    t_beat = b * BEAT
    bar_pos = b % 4
    chord_idx = (b // 4) % len(CHORDS)

    # Kick on beats 1 and 3 (and syncopated 1.5 occasionally)
    if bar_pos in [0, 2]:
        synth_kick(t_beat, gain=0.9)
    elif bar_pos == 1 and (b % 8 == 5):
        synth_kick(t_beat + BEAT * 0.5, gain=0.7)

    # Snare on beats 2 and 4
    if bar_pos in [1, 3]:
        synth_snare(t_beat, gain=0.75)

    # 16th-note hi-hats
    for sixteenth in range(4):
        t_hat = t_beat + sixteenth * (BEAT / 4.0)
        is_accent = sixteenth in [0, 2]
        synth_hihat(t_hat, gain=0.32 if is_accent else 0.18)

    # Bassline & Synth Chords on chord changes
    if bar_pos == 0:
        synth_bass_note(t_beat, BEAT * 3.8, BASS_NOTES[chord_idx], gain=0.42)
        synth_synth_chord(t_beat, BEAT * 2.5, CHORDS[chord_idx], gain=0.22)
    elif bar_pos == 2:
        synth_synth_chord(t_beat, BEAT * 1.8, CHORDS[chord_idx], gain=0.18)

# --- Specific SFX Timed to Video Storyboard ---

# 6.0s: Transition into QuickAdd Phone
synth_whoosh(5.7, duration=0.5, pan_dir=1.0, gain=0.7)

# 7.2s - 8.5s: Keypad clicks entering '13.50 + 4.80'
for i, dt in enumerate([0.0, 0.22, 0.44, 0.68, 0.90, 1.15]):
    synth_click(7.2 + dt, freq=1900.0 + i * 180.0, gain=0.45)

# 8.6s: Calculation resolved / cash chime
synth_chime(8.6, notes=[587.33, 739.99, 880.0, 1174.66], gain=0.65)

# 11.5s: Split transactions toggle click
synth_click(11.5, freq=2800.0, gain=0.6)
synth_whoosh(11.8, duration=0.4, pan_dir=-1.0, gain=0.5)

# 14.2s: Receipt OCR camera snap + laser scan
synth_click(14.0, freq=3400.0, gain=0.65)
synth_beep_scan(14.15, gain=0.55)

# 16.5s: Rhythmic whoosh to Payday Cycles
synth_whoosh(16.3, duration=0.5, pan_dir=1.0, gain=0.65)

# 19.2s: Savings Goals 82% celebration chime
synth_chime(19.2, notes=[523.25, 659.25, 783.99, 1046.50, 1318.51], gain=0.75)

# 21.8s - 22.8s: Riser + Drop into Public Privacy Blur
synth_riser(20.4, duration=2.0, gain=0.65)
synth_sub_drop(22.5, duration=2.2, gain=0.9)
synth_whoosh(22.4, duration=0.6, pan_dir=0.0, gain=0.85)

# 25.8s: Ascending arpeggio into CTA Card
synth_chime(25.6, notes=[440.0, 554.37, 659.25, 880.0], gain=0.55)
synth_whoosh(25.8, duration=0.6, pan_dir=-1.0, gain=0.6)

# 29.0s: Final chime & fadeout
synth_chime(28.5, notes=[523.25, 659.25, 1046.50], gain=0.5)

# --- Normalize & Export to 16-bit Stereo WAV ---
out_dir = os.path.join(os.getcwd(), "productions", "wherediditgo-launch", "audio")
os.makedirs(out_dir, exist_ok=True)
out_wav = os.path.join(out_dir, "soundtrack.wav")

# Find peak
peak = 0.0
for i in range(NUM_SAMPLES):
    peak = max(peak, abs(left_buf[i]), abs(right_buf[i]))

norm = 0.94 / max(1.0, peak)
print(f"Audio peak: {peak:.3f}, normalizing with factor: {norm:.3f}")

with wave.open(out_wav, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    
    chunk_size = 8192
    for offset in range(0, NUM_SAMPLES, chunk_size):
        chunk = []
        end = min(offset + chunk_size, NUM_SAMPLES)
        for i in range(offset, end):
            l = int(clamp(left_buf[i] * norm) * 32767.0)
            r = int(clamp(right_buf[i] * norm) * 32767.0)
            chunk.extend([l, r])
        data = struct.pack(f"<{len(chunk)}h", *chunk)
        wf.writeframes(data)

print(f"Successfully generated 30s stereo soundtrack: {out_wav}")
