// Simule le mixage de rendu.sh (voix « ia » + pièce, musique et bruitages sous la voix, niveau −14 LUFS) avec build/voix.wav et les pistes d'un essai, puis mesure :
//   node son_mix.mjs [prefixe_score = build/test/full] [voix_piece = build/test/voix_piece.wav] [events.json = build/test/events_reel.json]
//   - loudnorm (LUFS, crête vraie) avant et après ; crête de l'écrêteur ; durée
//   - pour chaque DERNIER mot de phrase : niveau de la voix, de la musique+ambiances et des bruitages (après la voix et le sidechain), et écarts (dB) : un écart voix − fond < 10 dB prévient
// (voix_piece.wav : python room.py build/voix.wav build/test/voix_piece.wav --humide -22 avec un python qui a scipy et soundfile)
import fs from 'fs'; import { execFileSync, spawnSync } from 'child_process'; import { readWav, analyse } from './son_analyse.mjs';
const pre = process.argv[2] || 'build/test/full', voice = process.argv[3] || 'build/test/voix_piece.wav', evf = process.argv[4] || 'build/test/events_reel.json';
const D = JSON.parse(fs.readFileSync(evf, 'utf8')).dur.toFixed(3), TL = JSON.parse(fs.readFileSync(process.env.TLF || 'build/timeline.json', 'utf8'));
const VCHAIN = 'aresample=48000,highpass=f=70,equalizer=f=160:t=q:w=1:g=1.0,acompressor=threshold=0.14:ratio=1.6:attack=15:release=220:makeup=1.1';
const out = (process.env.MIXDIR || 'build/test') + '/mix';
const G = `[0:a]${VCHAIN},apad=whole_dur=${D},pan=stereo|c0=c0|c1=c0,asplit=4[vo][key][key2][vo2];[1:a]volume=0.7[mu];[mu][key]sidechaincompress=threshold=0.03:ratio=2.2:attack=30:release=450[mud0];[2:a]volume=0.6[fx0];[fx0][key2]sidechaincompress=threshold=0.04:ratio=2.5:attack=15:release=250[fx0b];` +
  `[mud0]asplit=2[mud][mudo];[fx0b]asplit=2[fx][fxo];[vo][mud][fx]amix=inputs=3:normalize=0:duration=longest,volume=3.6dB,alimiter=limit=0.7:attack=3:release=60:level=false[a]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', voice, '-i', pre + '_music.wav', '-i', pre + '_sfx.wav', '-filter_complex', G, '-map', '[a]', '-ar', '48000', '-c:a', 'pcm_s16le', out + '_lim.wav', '-map', '[vo2]', '-c:a', 'pcm_s16le', out + '_voice.wav', '-map', '[mudo]', '-c:a', 'pcm_s16le', out + '_mus.wav', '-map', '[fxo]', '-c:a', 'pcm_s16le', out + '_fx.wav']);
const ln = f => { const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }); const t = r.stderr + r.stdout; return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); };
const m = ln(out + '_lim.wav');
console.log(`avant loudnorm : ${m.input_i} LUFS, crête vraie ${m.input_tp} dBTP, LRA ${m.input_lra}`);
const pk = readWav(out + '_lim.wav'); let mx = 0; for (let i = 0; i < pk.n; i++) mx = Math.max(mx, Math.abs(pk.L[i]), Math.abs(pk.R[i])); console.log(`crête échantillon du mix avant loudnorm ${(20 * Math.log10(mx)).toFixed(1)} dBFS`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out + '_lim.wav', '-af', `loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=0:linear=true,aresample=48000`, '-c:a', 'pcm_s16le', out + '_final.wav']);
const m2 = ln(out + '_final.wav'); console.log(`après loudnorm : ${m2.input_i} LUFS, crête vraie ${m2.input_tp} dBTP`);
// niveaux sous chaque mot final (voix mono centrée, fond stéréo)
const V = readWav(out + '_voice.wav'), M = readWav(out + '_mus.wav'), F = readWav(out + '_fx.wav');
console.log('mot final            fenêtre         voix   musique+amb  bruitages   voix−fond  voix−sfx   (dB RMS ; fenêtre = mot ± 0,05 s)');
for (const p of TL.phrases) { const w = p.words[p.words.length - 1], a = w.t0 - 0.05, b = w.t1 + 0.05, v = analyse(V, a, b).rms, mu = analyse(M, a, b).rms, fx = analyse(F, a, b).rms;
  console.log(`${p.id.padEnd(4)} ${w.w.padEnd(14)} ${a.toFixed(2)}-${b.toFixed(2)}`.padEnd(40), v.toFixed(1).padStart(6), mu.toFixed(1).padStart(10), fx.toFixed(1).padStart(10), (v - mu).toFixed(1).padStart(10), (v - fx).toFixed(1).padStart(9), (v - mu < 10 || v - fx < 10 ? '  <-- à surveiller' : '')); }
// niveaux moyens : voix, musique et bruitages dans les phrases
const all = [0, D]; console.log(`ensemble : voix ${analyse(V, 0, +D).rms.toFixed(1)} dB, musique ${analyse(M, 0, +D).rms.toFixed(1)}, bruitages ${analyse(F, 0, +D).rms.toFixed(1)}`);
