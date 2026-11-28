"""
Generates two full-arrangement CC0 / Royalty-Free music soundtracks with lead melodies,
sidechain-pumped supersaw chords, stereo arpeggiators, snare build-up rolls, crash cymbals,
and dense action SFX for Reel #3 and Reel #4:

1. productions/wherediditgo-launch/audio/soundtrack-reel3.wav
   - 140 BPM High-Octane Synthwave / Future-Bass Anthem (24.0s)
2. productions/wherediditgo-launch/audio/soundtrack-reel4.wav
   - 128 BPM Melodic Electro-Bass / Pop-Tech Groove (24.0s)
"""
import math
import struct
import random
import wave
import os

SAMPLE_RATE = 48000
DURATION = 24.0
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)

def clamp(v, lo=-1.0, hi=1.0):
    return max(lo, min(hi, v))

class StereoTrack:
    def __init__(self):
        self.left = [0.0] * NUM_SAMPLES
        self.right = [0.0] * NUM_SAMPLES

    def add(self, start_time, duration, gen_fn, pan=0.0, gain=1.0):
        s0 = int(start_time * SAMPLE_RATE)
        n = int(duration * SAMPLE_RATE)
        lm = (1.0 - pan) * 0.707 * gain
        rm = (1.0 + pan) * 0.707 * gain
        L = self.left
        R = self.right
        for i in range(n):
            idx = s0 + i
            if 0 <= idx < NUM_SAMPLES:
                t = i / SAMPLE_RATE
                v = gen_fn(t, i, n)
                L[idx] += v * lm
                R[idx] += v * rm

    def apply_stereo_delay(self, delay_sec=0.214, feedback=0.24, wet=0.22):
        d_samples = int(delay_sec * SAMPLE_RATE)
        L = self.left
        R = self.right
        for i in range(d_samples, NUM_SAMPLES):
            # Ping-pong cross feedback
            dl = R[i - d_samples]
            dr = L[i - d_samples]
            L[i] += dl * wet
            R[i] += dr * wet

    def export_wav(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        peak = max(max(abs(x) for x in self.left), max(abs(x) for x in self.right), 1e-6)
        # Soft-knee mastering limiter + normalization
        norm = 1.05 / peak
        with wave.open(path, "wb") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            chunk_size = 8192
            for offset in range(0, NUM_SAMPLES, chunk_size):
                chunk = []
                end = min(offset + chunk_size, NUM_SAMPLES)
                for i in range(offset, end):
                    l = math.tanh(self.left[i] * norm) * 0.95
                    r = math.tanh(self.right[i] * norm) * 0.95
                    chunk.extend([int(l * 32767.0), int(r * 32767.0)])
                wf.writeframes(struct.pack(f"<{len(chunk)}h", *chunk))
        print(f"Exported mastered stereo track: {path} (peak={peak:.2f})")

# --- Shared High-Action Instrument & SFX Generators ---

def add_kick(tr, t0, gain=1.0):
    def fn(t, i, n):
        freq = 40.0 + 135.0 * math.exp(-t * 34.0)
        sub = math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 11.5)
        click = math.sin(2.0 * math.pi * 2100.0 * t) * math.exp(-t * 160.0) * 0.45
        punch = (random.random() * 2.0 - 1.0) * math.exp(-t * 110.0) * 0.3
        return math.tanh((sub + click + punch) * 1.35)
    tr.add(t0, 0.36, fn, pan=0.0, gain=gain)

def add_snare(tr, t0, gain=0.82):
    def fn(t, i, n):
        body = math.sin(2.0 * math.pi * 195.0 * t) * math.exp(-t * 26.0) * 0.65
        snap = math.sin(2.0 * math.pi * 390.0 * t) * math.exp(-t * 48.0) * 0.45
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 14.5) * 0.9
        return math.tanh((body + snap + noise) * 1.2)
    tr.add(t0, 0.34, fn, pan=0.0, gain=gain)

def add_hat(tr, t0, open_hat=False, gain=0.32, pan=0.0):
    decay = 13.0 if open_hat else 85.0
    dur = 0.26 if open_hat else 0.065
    def fn(t, i, n):
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * decay)
        m1 = math.sin(2.0 * math.pi * 7850.0 * t) + math.sin(2.0 * math.pi * 9620.0 * t)
        return (noise * 0.8 + m1 * 0.25 * math.exp(-t * decay))
    tr.add(t0, dur, fn, pan=pan, gain=gain)

def add_crash(tr, t0, duration=1.6, gain=0.52):
    def fn(t, i, n):
        env = math.exp(-t * 2.4) * min(1.0, t / 0.008)
        noise = (random.random() * 2.0 - 1.0)
        shimmer = math.sin(2.0 * math.pi * 6400.0 * t) * 0.25 + math.sin(2.0 * math.pi * 8900.0 * t) * 0.2
        return (noise * 0.75 + shimmer) * env
    tr.add(t0, duration, fn, pan=-0.15, gain=gain)
    tr.add(t0 + 0.006, duration, fn, pan=0.25, gain=gain * 0.9)

def add_supersaw_chord(tr, t0, duration, freqs, beat_dur, sidechain=True, gain=0.28):
    # 5-voice detuned saw chord with rhythmic sidechain pumping
    detunes = [-0.007, -0.003, 0.0, 0.0035, 0.0075]
    pans = [-0.65, -0.3, 0.0, 0.3, 0.65]
    for f in freqs:
        for d, p in zip(detunes, pans):
            df = f * (1.0 + d)
            def fn(t, i, n, freq=df):
                # Band-limited saw approximation (fundamental + 4 harmonics)
                w = 2.0 * math.pi * freq * t
                saw = (
                    math.sin(w)
                    - 0.5 * math.sin(2.0 * w)
                    + 0.33 * math.sin(3.0 * w)
                    - 0.25 * math.sin(4.0 * w)
                    + 0.18 * math.sin(5.0 * w)
                ) * 0.55
                sc = 1.0
                if sidechain:
                    bp = (t % beat_dur) / beat_dur
                    sc = 0.18 + 0.82 * (1.0 - math.exp(-bp * 5.0))
                att = min(1.0, t / 0.025)
                rel = min(1.0, (duration - t) / 0.08) if t > duration - 0.08 else 1.0
                return saw * sc * att * rel
            tr.add(t0, duration, fn, pan=p, gain=gain / len(detunes))

def add_lead_note(tr, t0, duration, freq, pan=0.0, gain=0.38):
    # Bright expressive synth lead with vibrato and FM bite
    def fn(t, i, n):
        vib = math.sin(2.0 * math.pi * 6.0 * t) * 0.0035 * min(1.0, t / 0.12)
        f = freq * (1.0 + vib)
        w = 2.0 * math.pi * f * t
        mod = math.sin(w * 2.0) * (1.8 * math.exp(-t * 9.0) + 0.35)
        sq = math.sin(w + mod) + 0.35 * math.sin(w * 3.0)
        att = min(1.0, t / 0.01)
        rel = math.exp(-t * 3.2)
        return math.tanh(sq * 1.1) * att * rel
    tr.add(t0, duration, fn, pan=pan, gain=gain)

def add_sub_bass(tr, t0, duration, freq, beat_dur, gain=0.52):
    def fn(t, i, n):
        w = 2.0 * math.pi * freq * t
        val = math.sin(w) + 0.35 * math.sin(w * 2.0) + 0.15 * math.sin(w * 3.0)
        bp = (t % beat_dur) / beat_dur
        sc = 0.25 + 0.75 * (1.0 - math.exp(-bp * 6.0))
        att = min(1.0, t / 0.015)
        rel = min(1.0, (duration - t) / 0.04) if t > duration - 0.04 else 1.0
        return math.tanh(val * 1.5) * sc * att * rel
    tr.add(t0, duration, fn, pan=0.0, gain=gain)

# --- Action SFX Primitives ---

def sfx_impact_boom(tr, t0, gain=1.05):
    def fn(t, i, n):
        freq = 32.0 + 115.0 * math.exp(-t * 14.0)
        sub = math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 1.8)
        thump = (random.random() * 2.0 - 1.0) * math.exp(-t * 28.0) * 0.55
        return math.tanh((sub + thump) * 1.6)
    tr.add(t0, 1.5, fn, pan=0.0, gain=gain)

def sfx_whip_whoosh(tr, t0, duration=0.35, pan_dir=1.0, pitch=900.0, gain=0.75):
    def fn(t, i, n):
        p = t / duration
        env = math.sin(math.pi * p) ** 1.4
        f = pitch * (0.4 + 1.6 * p)
        swoosh = math.sin(2.0 * math.pi * f * t) * 0.45 + (random.random() * 2.0 - 1.0) * 0.7
        return swoosh * env
    tr.add(t0, duration, fn, pan=0.55 * pan_dir, gain=gain)

def sfx_laser_zap(tr, t0, pan=0.0, gain=0.62):
    def fn(t, i, n):
        freq = 220.0 + 3400.0 * math.exp(-t * 36.0)
        return math.sin(2.0 * math.pi * freq * t) * math.exp(-t * 18.0)
    tr.add(t0, 0.18, fn, pan=pan, gain=gain)

def sfx_glitch_stutter(tr, t0, duration=0.36, gain=0.65):
    steps = 6
    dt = duration / steps
    for k in range(steps):
        f = 800.0 + (k % 3) * 750.0
        def fn(t, i, n, freq=f):
            return math.sin(2.0 * math.pi * freq * t) * (1.0 if t < dt * 0.6 else 0.0)
        tr.add(t0 + k * dt, dt, fn, pan=(-0.5 if k % 2 == 0 else 0.5), gain=gain)

def sfx_riser_sweep(tr, t0, duration=1.8, gain=0.68):
    def fn(t, i, n):
        p = t / duration
        freq = 160.0 + 1800.0 * (p ** 2.3)
        lfo = 0.7 + 0.3 * math.sin(2.0 * math.pi * (6.0 + 18.0 * p) * t)
        noise = (random.random() * 2.0 - 1.0) * 0.45 * (p ** 2.0)
        return (math.sin(2.0 * math.pi * freq * t) * 0.7 + noise) * (p ** 1.6) * lfo
    tr.add(t0, duration, fn, pan=0.0, gain=gain)

def sfx_coin_burst(tr, t0, notes, gain=0.68):
    for idx, f in enumerate(notes):
        def fn(t, i, n, freq=f):
            bell = math.sin(2.0 * math.pi * freq * t) + 0.4 * math.sin(2.0 * math.pi * freq * 2.0 * t)
            return bell * math.exp(-t * 6.5)
        tr.add(t0 + idx * 0.055, 0.75, fn, pan=-0.45 + idx * 0.22, gain=gain)


# ==============================================================================
# BUILD TRACK 1: REEL #3 — "SPEEDRUN YOUR MONEY" (140 BPM Synthwave/Future-Bass)
# ==============================================================================
def build_reel3_soundtrack():
    random.seed(303)
    tr = StereoTrack()
    BPM = 140.0
    BEAT = 60.0 / BPM  # 0.42857s

    # 0.0s - 1.71s (Beats 0..3): Countdown Snare Build + Riser -> 1.71s (Beat 4) SONIC DROP!
    sfx_riser_sweep(tr, 0.05, duration=1.65, gain=0.72)
    for k in range(12):
        p = k / 12.0
        add_snare(tr, 0.1 + k * 0.13, gain=0.35 + p * 0.55)
    # Countdown beeps (3... 2... 1... GO!)
    add_lead_note(tr, 0.15, 0.25, 440.0, pan=-0.3, gain=0.55)
    add_lead_note(tr, 0.65, 0.25, 440.0, pan=0.0, gain=0.58)
    add_lead_note(tr, 1.15, 0.25, 440.0, pan=0.3, gain=0.62)
    add_lead_note(tr, 1.71, 0.55, 880.0, pan=0.0, gain=0.78)
    sfx_impact_boom(tr, 1.71, gain=1.15)
    add_crash(tr, 1.71, duration=1.8, gain=0.58)

    # Progression: Am9 -> Fmaj7 -> Cmaj9 -> G6 (each chord 4 beats = 1.714s)
    CHORDS_3 = [
        [220.00, 261.63, 329.63, 493.88],  # Am9
        [174.61, 220.00, 261.63, 329.63],  # Fmaj7
        [261.63, 329.63, 392.00, 587.33],  # Cmaj9
        [196.00, 246.94, 293.66, 392.00],  # G6
    ]
    BASS_3 = [55.00, 43.65, 65.41, 49.00]  # A1, F1, C2, G1

    # Catchy 16-step Melodic Lead Hook (in A minor pentatonic / natural minor)
    MELODY_3 = [
        440.00, 523.25, 659.25, 587.33,
        523.25, 659.25, 783.99, 659.25,
        880.00, 783.99, 659.25, 523.25,
        587.33, 659.25, 523.25, 440.00,
    ]

    total_beats = int(DURATION / BEAT)
    for b in range(4, total_beats - 1):
        tb = b * BEAT
        bar_pos = (b - 4) % 4
        chord_i = ((b - 4) // 4) % len(CHORDS_3)
        chord = CHORDS_3[chord_i]

        # Driving Kick & Snare
        if bar_pos in [0, 2]:
            add_kick(tr, tb, gain=0.95)
        elif bar_pos == 3 and (b % 8 == 7):
            add_kick(tr, tb + BEAT * 0.5, gain=0.82)

        if bar_pos in [1, 3]:
            add_snare(tr, tb, gain=0.82)

        # Rolling 16th-note Hi-hats + Stereo Arp
        for s in range(4):
            ts = tb + s * (BEAT / 4.0)
            add_hat(tr, ts, open_hat=(s == 2), gain=0.32 if s == 2 else 0.18, pan=(-0.25 if s % 2 == 0 else 0.25))
            arp_f = chord[s % len(chord)] * (2.0 if s >= 2 else 1.0)
            add_lead_note(tr, ts, BEAT * 0.24, arp_f, pan=-0.5 + s * 0.33, gain=0.14)

        # Sidechain-pumped Supersaws + Sub Bass on bar start
        if bar_pos == 0:
            add_supersaw_chord(tr, tb, BEAT * 4.0, chord, BEAT, sidechain=True, gain=0.34)
            add_sub_bass(tr, tb, BEAT * 3.9, BASS_3[chord_i], BEAT, gain=0.52)
            if (b - 4) % 16 == 0 and b > 4:
                add_crash(tr, tb, duration=1.5, gain=0.45)

        # Expressive Lead Synth Melody on every beat & off-beat
        mel_idx = (b - 4) % len(MELODY_3)
        add_lead_note(tr, tb, BEAT * 0.85, MELODY_3[mel_idx], pan=math.sin(b * 0.7) * 0.35, gain=0.34)
        if bar_pos in [1, 3]:
            add_lead_note(tr, tb + BEAT * 0.5, BEAT * 0.45, MELODY_3[(mel_idx + 2) % len(MELODY_3)], pan=-0.25, gain=0.26)

    # --- Choreographed High-Action SFX for Reel #3 ---
    # Act 2 (3.5s - 7.5s): QuickAdd Speedrun (Tap FAB -> Rapid typing -> 6.3s Victory Coin Burst!)
    sfx_whip_whoosh(tr, 3.45, duration=0.35, pan_dir=1.0, pitch=1100.0, gain=0.82)
    sfx_laser_zap(tr, 4.10, pan=-0.2, gain=0.65)  # FAB tap ripple
    for i in range(7):
        sfx_laser_zap(tr, 4.55 + i * 0.20, pan=-0.3 + i * 0.1, gain=0.42)
    sfx_coin_burst(tr, 6.20, [523.25, 659.25, 783.99, 1046.50, 1318.51], gain=0.78)

    # Act 3 (7.5s - 11.5s): Triple-Split Combo Action (3 Laser Sword Slices at 8.1s, 8.6s, 9.1s + Combo Boom!)
    sfx_whip_whoosh(tr, 7.45, duration=0.35, pan_dir=-1.0, pitch=1300.0, gain=0.82)
    sfx_whip_whoosh(tr, 8.10, duration=0.25, pan_dir=-0.7, pitch=1600.0, gain=0.75)
    sfx_whip_whoosh(tr, 8.60, duration=0.25, pan_dir=0.0,  pitch=1900.0, gain=0.78)
    sfx_whip_whoosh(tr, 9.10, duration=0.25, pan_dir=0.7,  pitch=2200.0, gain=0.82)
    sfx_coin_burst(tr, 9.65, [587.33, 880.0, 1174.66, 1760.0], gain=0.75)

    # Act 4 (11.5s - 15.5s): Laser OCR & SMS Target Lock
    sfx_glitch_stutter(tr, 11.45, duration=0.32, gain=0.68)
    sfx_laser_zap(tr, 12.20, pan=0.0, gain=0.72)
    sfx_laser_zap(tr, 12.45, pan=0.2, gain=0.72)
    sfx_impact_boom(tr, 13.40, gain=0.92)

    # Act 5 (15.5s - 19.5s): Rapid-Fire 4-Cut Superpower Montage (15.5s, 16.5s, 17.5s, 18.5s)
    for idx, t_cut in enumerate([15.50, 16.50, 17.50, 18.50]):
        sfx_whip_whoosh(tr, t_cut - 0.08, duration=0.28, pan_dir=(-1.0 if idx % 2 == 0 else 1.0), pitch=1200.0 + idx * 300.0, gain=0.85)
        sfx_impact_boom(tr, t_cut, gain=0.85)

    # Act 6 (19.5s - 24.0s): Finale Drop & Encore
    sfx_riser_sweep(tr, 18.6, duration=1.35, gain=0.75)
    sfx_impact_boom(tr, 20.0, gain=1.18)
    add_crash(tr, 20.0, duration=2.0, gain=0.62)
    sfx_coin_burst(tr, 20.2, [440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51], gain=0.78)

    tr.apply_stereo_delay(delay_sec=BEAT * 0.75, feedback=0.22, wet=0.20)
    out_path = os.path.join(os.getcwd(), "productions", "wherediditgo-launch", "audio", "soundtrack-reel3.wav")
    tr.export_wav(out_path)


# ==============================================================================
# BUILD TRACK 2: REEL #4 — "CHAOS VS. CONTROL" (128 BPM Melodic Electro-Bass)
# ==============================================================================
def build_reel4_soundtrack():
    random.seed(404)
    tr = StereoTrack()
    BPM = 128.0
    BEAT = 60.0 / BPM  # 0.46875s

    # 0.0s - 2.34s (Beats 0..4): Chaos Storm Swirl Riser + Glitch Alerts -> 2.34s (Beat 5) MAGNETIC SLAM!
    sfx_riser_sweep(tr, 0.05, duration=2.25, gain=0.78)
    for k in range(10):
        sfx_laser_zap(tr, 0.18 + k * 0.20, pan=math.sin(k * 1.7) * 0.7, gain=0.38 + k * 0.03)
    sfx_glitch_stutter(tr, 1.95, duration=0.35, gain=0.72)
    sfx_impact_boom(tr, 2.34, gain=1.20)
    add_crash(tr, 2.34, duration=1.8, gain=0.60)
    sfx_coin_burst(tr, 2.42, [587.33, 739.99, 880.0, 1174.66], gain=0.72)

    # Progression: Dm9 -> Bbmaj7 -> Gm9 -> A7alt
    CHORDS_4 = [
        [293.66, 349.23, 440.00, 659.25],  # Dm9
        [233.08, 293.66, 349.23, 440.00],  # Bbmaj7
        [196.00, 233.08, 293.66, 440.00],  # Gm9
        [220.00, 277.18, 349.23, 523.25],  # A7alt
    ]
    BASS_4 = [73.42, 58.27, 49.00, 55.00]  # D2, Bb1, G1, A1

    MELODY_4 = [
        587.33, 698.46, 880.00, 783.99,
        698.46, 587.33, 659.25, 523.25,
        587.33, 880.00, 1046.50, 880.00,
        783.99, 698.46, 659.25, 587.33,
    ]

    total_beats = int(DURATION / BEAT)
    for b in range(5, total_beats - 1):
        tb = b * BEAT
        bar_pos = (b - 5) % 4
        chord_i = ((b - 5) // 4) % len(CHORDS_4)
        chord = CHORDS_4[chord_i]

        # Four-on-the-floor punchy kick with syncopated bounce
        add_kick(tr, tb, gain=0.92)
        if bar_pos == 3:
            add_kick(tr, tb + BEAT * 0.75, gain=0.76)

        if bar_pos in [1, 3]:
            add_snare(tr, tb, gain=0.80)

        for s in range(4):
            ts = tb + s * (BEAT / 4.0)
            add_hat(tr, ts, open_hat=(s == 2), gain=0.32 if s == 2 else 0.16, pan=(0.3 if s % 2 == 0 else -0.3))

        if bar_pos == 0:
            add_supersaw_chord(tr, tb, BEAT * 4.0, chord, BEAT, sidechain=True, gain=0.32)
            add_sub_bass(tr, tb, BEAT * 3.85, BASS_4[chord_i], BEAT, gain=0.52)

        # Bouncy off-beat bass octave jump + Melodic Pluck Lead
        add_sub_bass(tr, tb + BEAT * 0.5, BEAT * 0.42, BASS_4[chord_i] * 2.0, BEAT, gain=0.30)
        m_idx = (b - 5) % len(MELODY_4)
        add_lead_note(tr, tb, BEAT * 0.75, MELODY_4[m_idx], pan=math.cos(b * 0.8) * 0.4, gain=0.35)
        add_lead_note(tr, tb + BEAT * 0.5, BEAT * 0.42, MELODY_4[(m_idx + 3) % len(MELODY_4)], pan=-0.3, gain=0.24)

    # --- Choreographed High-Action SFX for Reel #4 ---
    # Act 2 (3.6s - 7.6s): 3 Orbiting Wallet Cards Pop Out (4.2s, 4.8s, 5.4s)
    for idx, t_w in enumerate([4.15, 4.75, 5.35]):
        sfx_whip_whoosh(tr, t_w, duration=0.32, pan_dir=(-0.7 + idx * 0.7), pitch=1100.0 + idx * 250.0, gain=0.78)
        sfx_coin_burst(tr, t_w + 0.12, [587.33 * (1 + idx * 0.12), 880.0 * (1 + idx * 0.12)], gain=0.58)

    # Act 3 (7.6s - 11.6s): Debt Rocket Acceleration + Payoff Impact (9.8s)
    sfx_whip_whoosh(tr, 7.55, duration=0.38, pan_dir=1.0, pitch=1000.0, gain=0.80)
    sfx_riser_sweep(tr, 8.10, duration=1.55, gain=0.62)
    sfx_impact_boom(tr, 9.70, gain=0.98)
    sfx_coin_burst(tr, 9.75, [587.33, 739.99, 880.0, 1174.66, 1479.98], gain=0.75)

    # Act 4 (11.6s - 15.6s): 365-Day Streak Equalizer Ignition + 82-Day Flame Boom (13.8s)
    sfx_whip_whoosh(tr, 11.55, duration=0.35, pan_dir=-1.0, pitch=1400.0, gain=0.80)
    for k in range(8):
        add_lead_note(tr, 12.0 + k * 0.18, 0.20, 440.0 + k * 110.0, pan=-0.5 + k * 0.14, gain=0.38)
    sfx_impact_boom(tr, 13.70, gain=0.95)

    # Act 5 (15.6s - 19.6s): Airplane Mode Flyby + Triple Diagonal Theme Slice
    sfx_whip_whoosh(tr, 15.55, duration=0.65, pan_dir=1.0, pitch=850.0, gain=0.88)
    sfx_whip_whoosh(tr, 17.10, duration=0.32, pan_dir=-1.0, pitch=1750.0, gain=0.82)
    sfx_glitch_stutter(tr, 18.20, duration=0.30, gain=0.65)

    # Act 6 (19.6s - 24.0s): Stadium Finale Drop
    sfx_riser_sweep(tr, 18.5, duration=1.1, gain=0.72)
    sfx_impact_boom(tr, 19.65, gain=1.18)
    add_crash(tr, 19.65, duration=2.1, gain=0.62)
    sfx_coin_burst(tr, 19.85, [587.33, 739.99, 880.0, 1174.66, 1479.98, 1760.0], gain=0.82)

    tr.apply_stereo_delay(delay_sec=BEAT * 0.75, feedback=0.24, wet=0.22)
    out_path = os.path.join(os.getcwd(), "productions", "wherediditgo-launch", "audio", "soundtrack-reel4.wav")
    tr.export_wav(out_path)

if __name__ == "__main__":
    build_reel3_soundtrack()
    build_reel4_soundtrack()
