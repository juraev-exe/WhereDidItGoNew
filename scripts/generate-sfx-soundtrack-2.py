"""
Synthesizes Reel #2's 24-second 132 BPM modern tech-garage soundtrack & choreographed SFX:
- Act 1 (0.0s - 3.2s): Rapid balance-drain ticker clicks -> Tape-stop + Sub Slam at 2.20s
- Act 2 (3.2s - 6.6s): Crystalline heatmap matrix blips (3.6s - 5.2s)
- Act 3 (6.6s - 10.2s): Snowball slider ratchet clicks (7.2s - 8.6s) + Debt-Free chime (8.7s)
- Act 4 (10.2s - 13.8s): 3 stereo-panned card-fan whoosh pops (L / C / R at 10.5s, 11.0s, 11.5s)
- Act 5 (13.8s - 17.2s): Savings gauge harmonic sweep (14.3s) + 64% bell chord (15.4s)
- Act 6 (17.2s - 20.4s): Diagonal theme-wipe swoosh (17.5s)
- Act 7 (20.4s - 24.0s): Finale drop + ascending emerald arpeggio
Output: productions/wherediditgo-launch/audio/soundtrack-reel2.wav (48kHz, 16-bit stereo)
"""
import math
import struct
import random
import wave
import os

random.seed(2026)

SAMPLE_RATE = 48000
DURATION = 24.0
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)

left_buf = [0.0] * NUM_SAMPLES
right_buf = [0.0] * NUM_SAMPLES

def clamp(v, lo=-1.0, hi=1.0):
    return max(lo, min(hi, v))

def add_sound(start_time, duration, gen_fn, pan=0.0, gain=1.0):
    start_sample = int(start_time * SAMPLE_RATE)
    total_samples = int(duration * SAMPLE_RATE)
    l_mul = (1.0 - pan) * 0.707 * gain
    r_mul = (1.0 + pan) * 0.707 * gain
    for i in range(total_samples):
        idx = start_sample + i
        if 0 <= idx < NUM_SAMPLES:
            t = i / SAMPLE_RATE
            val = gen_fn(t, i, total_samples)
            left_buf[idx] += val * l_mul
            right_buf[idx] += val * r_mul

# --- Drum & Bass & Synth Primitives ---

def synth_kick(start_time, gain=0.92):
    def fn(t, i, n):
        freq = 38.0 + 125.0 * math.exp(-t * 32.0)
        body = math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 13.0)
        click = math.sin(2.0 * math.pi * 1600.0 * t) * math.exp(-t * 140.0) * 0.35
        return body + click
    add_sound(start_time, 0.38, fn, pan=0.0, gain=gain)

def synth_rim_clap(start_time, gain=0.72):
    def fn(t, i, n):
        rim = math.sin(2.0 * math.pi * 420.0 * t) * math.exp(-t * 55.0) * 0.7
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 20.0) * 0.75
        return rim + noise
    add_sound(start_time, 0.28, fn, pan=0.0, gain=gain)

def synth_hat(start_time, gain=0.3, open_hat=False):
    decay = 16.0 if open_hat else 90.0
    def fn(t, i, n):
        n_val = (random.random() * 2.0 - 1.0) * math.exp(-t * decay)
        metal = math.sin(2.0 * math.pi * 9200.0 * t) * 0.25 * math.exp(-t * decay)
        return n_val + metal
    add_sound(start_time, 0.22 if open_hat else 0.07, fn, pan=random.uniform(-0.3, 0.3), gain=gain)

def synth_fm_pluck(start_time, freq, duration=0.45, pan=0.0, gain=0.32):
    def fn(t, i, n):
        mod_idx = 2.5 * math.exp(-t * 18.0)
        mod = math.sin(2.0 * math.pi * (freq * 2.0) * t) * mod_idx
        carrier = math.sin(2.0 * math.pi * freq * t + mod)
        env = min(1.0, t / 0.006) * math.exp(-t * 6.5)
        return carrier * env
    add_sound(start_time, duration, fn, pan=pan, gain=gain)

def synth_reese_sub(start_time, duration, freq, gain=0.44):
    def fn(t, i, n):
        s1 = math.sin(2.0 * math.pi * freq * t)
        s2 = math.sin(2.0 * math.pi * (freq * 1.006) * t) * 0.45
        harm = math.sin(2.0 * math.pi * (freq * 2.0) * t) * 0.22
        val = math.tanh((s1 + s2 + harm) * 1.4)
        att = min(1.0, t / 0.02)
        rel = min(1.0, (duration - t) / 0.05) if t > duration - 0.05 else 1.0
        return val * att * rel
    add_sound(start_time, duration, fn, pan=0.0, gain=gain)

def synth_tick(start_time, freq=2200.0, pan=0.0, gain=0.45):
    def fn(t, i, n):
        return math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 210.0)
    add_sound(start_time, 0.035, fn, pan=pan, gain=gain)

def synth_tape_stop_slam(start_time, gain=1.05):
    def fn(t, i, n):
        # Pitch plunges from 320Hz down to 34Hz
        freq = 34.0 + 286.0 * math.exp(-t * 16.0)
        sub = math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 2.2)
        crackle = (random.random() * 2.0 - 1.0) * math.exp(-t * 35.0) * 0.5
        return math.tanh((sub + crackle) * 1.6)
    add_sound(start_time, 1.4, fn, pan=0.0, gain=gain)

def synth_whoosh_pop(start_time, duration=0.45, pan=0.0, pop_freq=1400.0, gain=0.68):
    def fn(t, i, n):
        p = t / duration
        env = math.sin(math.pi * p)
        noise = (random.random() * 2.0 - 1.0) * env * 0.65
        return noise
    add_sound(start_time, duration, fn, pan=pan, gain=gain)
    synth_fm_pluck(start_time + duration * 0.45, pop_freq, duration=0.25, pan=pan, gain=gain * 0.65)

def synth_chime(start_time, notes, gain=0.6):
    for idx, f in enumerate(notes):
        def fn(t, i, n, freq=f):
            c = math.sin(2.0 * math.pi * freq * t) + 0.3 * math.sin(2.0 * math.pi * freq * 2.0 * t)
            return c * math.exp(-t * 5.2)
        add_sound(start_time + idx * 0.065, 0.85, fn, pan=-0.35 + 0.22 * idx, gain=gain)

def synth_gauge_sweep(start_time, duration=1.1, gain=0.52):
    def fn(t, i, n):
        p = t / duration
        freq = 260.0 + 620.0 * (p ** 1.5)
        env = math.sin(math.pi * p)
        return (math.sin(2.0 * math.pi * freq * t) * 0.7 + math.sin(2.0 * math.pi * freq * 1.5 * t) * 0.3) * env
    add_sound(start_time, duration, fn, pan=0.0, gain=gain)

# --- Arrangement (132 BPM, 24.0s) ---
BPM = 132.0
BEAT = 60.0 / BPM  # ~0.4545s

# 1. Act 1 (0.0s - 3.2s): Rapid balance countdown ticks -> Tape-Stop Slam at 2.20s
t_cur = 0.12
step = 0.11
while t_cur < 2.12:
    progress = t_cur / 2.12
    synth_tick(t_cur, freq=1400.0 + progress * 1600.0, pan=(progress - 0.5) * 0.6, gain=0.42 + progress * 0.25)
    t_cur += max(0.045, step * (1.0 - progress * 0.55))

synth_tape_stop_slam(2.20, gain=1.08)

# 2. Main 132 BPM UK-Garage / Tech Beat from 3.20s (Beat 7) to 22.8s
CHORDS = [
    [261.63, 311.13, 392.00, 587.33],  # Cm9
    [207.65, 261.63, 311.13, 392.00],  # Abmaj7
    [174.61, 207.65, 261.63, 392.00],  # Fm9
    [196.00, 246.94, 311.13, 440.00],  # G7alt
]
BASS = [65.41, 51.91, 43.65, 49.00]  # C2, Ab1, F1, G1

start_beat = 7
end_beat = int(DURATION / BEAT) - 2

for b in range(start_beat, end_beat):
    tb = b * BEAT
    bar_pos = b % 4
    chord_i = ((b - start_beat) // 4) % len(CHORDS)
    chord = CHORDS[chord_i]

    # 2-step / tech-garage kick pattern
    if bar_pos == 0:
        synth_kick(tb, gain=0.92)
    elif bar_pos == 2:
        synth_kick(tb + BEAT * 0.5, gain=0.84)
    elif bar_pos == 3 and (b % 8 == 3):
        synth_kick(tb + BEAT * 0.75, gain=0.72)

    # Crisp rim-clap on 2 and 4
    if bar_pos in [1, 3]:
        synth_rim_clap(tb, gain=0.74)

    # Shuffled 16th hats
    for s in range(4):
        swing = 0.022 if (s % 2 == 1) else 0.0
        synth_hat(tb + s * (BEAT / 4.0) + swing, gain=0.30 if s == 2 else 0.17, open_hat=(s == 2 and bar_pos % 2 == 1))

    # Sub-bass & FM chord stabs
    if bar_pos == 0:
        synth_reese_sub(tb, BEAT * 3.75, BASS[chord_i], gain=0.44)
        for n_idx, nf in enumerate(chord):
            synth_fm_pluck(tb + n_idx * 0.03, nf, duration=0.55, pan=-0.3 + n_idx * 0.2, gain=0.20)
    elif bar_pos == 2:
        for n_idx, nf in enumerate(chord):
            synth_fm_pluck(tb + BEAT * 0.5, nf * 2.0, duration=0.32, pan=0.3 - n_idx * 0.2, gain=0.14)

# --- Choreographed Act SFX ---

# Act 2 (3.2s - 6.6s): Crystalline heatmap matrix blips
heatmap_notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.50, 1174.66, 1318.51]
for idx in range(12):
    t_blip = 3.55 + idx * 0.13
    f_blip = heatmap_notes[idx % len(heatmap_notes)]
    synth_fm_pluck(t_blip, f_blip, duration=0.22, pan=-0.45 + (idx % 5) * 0.22, gain=0.34)

# Act 3 (6.6s - 10.2s): Debt Snowball slider ratchet clicks (7.2s - 8.5s) + Chime (8.65s)
synth_whoosh_pop(6.55, duration=0.45, pan=-0.3, pop_freq=880.0, gain=0.65)
for idx in range(9):
    synth_tick(7.25 + idx * 0.14, freq=1800.0 + idx * 140.0, pan=0.2, gain=0.48)
synth_chime(8.65, [523.25, 659.25, 783.99, 1046.50], gain=0.68)

# Act 4 (10.2s - 13.8s): 3-Phone Trilingual Fan Cascade (L, C, R whoosh pops)
synth_whoosh_pop(10.35, duration=0.42, pan=-0.65, pop_freq=659.25, gain=0.72)
synth_whoosh_pop(10.85, duration=0.42, pan=0.0,   pop_freq=783.99, gain=0.78)
synth_whoosh_pop(11.35, duration=0.42, pan=0.65,  pop_freq=1046.50, gain=0.72)

# Act 5 (13.8s - 17.2s): 64% Net Savings Rate Ring Gauge Sweep + Bell Chord
synth_gauge_sweep(14.15, duration=1.15, gain=0.55)
synth_chime(15.35, [587.33, 783.99, 987.77, 1174.66, 1567.98], gain=0.72)

# Act 6 (17.2s - 20.4s): Diagonal Light/Dark Theme Wipe Swoosh
synth_whoosh_pop(17.30, duration=0.55, pan=0.35, pop_freq=1174.66, gain=0.75)

# Act 7 (20.4s - 24.0s): Finale Sub Drop + Ascending Emerald Arpeggio
synth_tape_stop_slam(20.40, gain=0.88)
synth_chime(20.75, [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98], gain=0.75)
synth_chime(22.80, [523.25, 783.99, 1046.50], gain=0.55)

# --- Normalize & Export ---
out_dir = os.path.join(os.getcwd(), "productions", "wherediditgo-launch", "audio")
os.makedirs(out_dir, exist_ok=True)
out_wav = os.path.join(out_dir, "soundtrack-reel2.wav")

peak = max(max(abs(x) for x in left_buf), max(abs(x) for x in right_buf), 1e-6)
norm = 0.94 / max(1.0, peak)
print(f"Reel 2 audio peak: {peak:.3f}, norm: {norm:.3f}")

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
        wf.writeframes(struct.pack(f"<{len(chunk)}h", *chunk))

print(f"Saved Reel 2 soundtrack: {out_wav}")
