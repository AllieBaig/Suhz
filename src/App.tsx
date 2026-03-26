import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Upload, 
  Settings, 
  Activity, 
  Zap, 
  Headphones,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Visualizer } from './components/Visualizer';

// Types
type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export default function App() {
  // Audio Context & Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const leftOscRef = useRef<OscillatorNode | null>(null);
  const rightOscRef = useRef<OscillatorNode | null>(null);
  const leftGainRef = useRef<GainNode | null>(null);
  const rightGainRef = useRef<GainNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const subliminalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const subliminalGainRef = useRef<GainNode | null>(null);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseFreq, setBaseFreq] = useState(440);
  const [binauralFreq, setBinauralFreq] = useState(4); // 4Hz = Theta (Deep relaxation)
  const [waveform, setWaveform] = useState<WaveformType>('sine');
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [toneVolume, setToneVolume] = useState(0.3);
  const [subliminalVolume, setSubliminalVolume] = useState(0.7);
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Calculated Frequencies
  const leftFreq = baseFreq;
  const rightFreq = baseFreq + binauralFreq;

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master Gain
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(audioCtxRef.current.destination);

      // Tone Path
      mergerRef.current = audioCtxRef.current.createChannelMerger(2);
      
      leftGainRef.current = audioCtxRef.current.createGain();
      rightGainRef.current = audioCtxRef.current.createGain();
      
      leftGainRef.current.gain.value = toneVolume;
      rightGainRef.current.gain.value = toneVolume;

      // Connect tones to specific channels
      leftGainRef.current.connect(mergerRef.current, 0, 0);
      rightGainRef.current.connect(mergerRef.current, 0, 1);
      
      mergerRef.current.connect(masterGainRef.current);

      // Subliminal Path
      subliminalGainRef.current = audioCtxRef.current.createGain();
      subliminalGainRef.current.gain.value = subliminalVolume;
      subliminalGainRef.current.connect(masterGainRef.current);
    }
  }, [masterVolume, toneVolume, subliminalVolume]);

  const startTones = () => {
    if (!audioCtxRef.current) return;

    // Stop existing if any
    stopTones();

    leftOscRef.current = audioCtxRef.current.createOscillator();
    rightOscRef.current = audioCtxRef.current.createOscillator();

    leftOscRef.current.type = waveform;
    rightOscRef.current.type = waveform;

    leftOscRef.current.frequency.setValueAtTime(leftFreq, audioCtxRef.current.currentTime);
    rightOscRef.current.frequency.setValueAtTime(rightFreq, audioCtxRef.current.currentTime);

    leftOscRef.current.connect(leftGainRef.current!);
    rightOscRef.current.connect(rightGainRef.current!);

    leftOscRef.current.start();
    rightOscRef.current.start();
  };

  const stopTones = () => {
    if (leftOscRef.current) {
      leftOscRef.current.stop();
      leftOscRef.current.disconnect();
      leftOscRef.current = null;
    }
    if (rightOscRef.current) {
      rightOscRef.current.stop();
      rightOscRef.current.disconnect();
      rightOscRef.current = null;
    }
  };

  const startSubliminal = () => {
    if (!audioCtxRef.current || !audioBuffer) return;

    if (subliminalSourceRef.current) {
      subliminalSourceRef.current.stop();
      subliminalSourceRef.current.disconnect();
    }

    subliminalSourceRef.current = audioCtxRef.current.createBufferSource();
    subliminalSourceRef.current.buffer = audioBuffer;
    subliminalSourceRef.current.loop = true;
    subliminalSourceRef.current.connect(subliminalGainRef.current!);
    subliminalSourceRef.current.start();
  };

  const stopSubliminal = () => {
    if (subliminalSourceRef.current) {
      subliminalSourceRef.current.stop();
      subliminalSourceRef.current.disconnect();
      subliminalSourceRef.current = null;
    }
  };

  const togglePlayback = () => {
    initAudio();
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isPlaying) {
      stopTones();
      stopSubliminal();
    } else {
      startTones();
      if (audioBuffer) startSubliminal();
    }
    setIsPlaying(!isPlaying);
  };

  // Update frequencies in real-time
  useEffect(() => {
    if (leftOscRef.current && audioCtxRef.current) {
      leftOscRef.current.frequency.setTargetAtTime(leftFreq, audioCtxRef.current.currentTime, 0.1);
    }
    if (rightOscRef.current && audioCtxRef.current) {
      rightOscRef.current.frequency.setTargetAtTime(rightFreq, audioCtxRef.current.currentTime, 0.1);
    }
  }, [leftFreq, rightFreq]);

  // Update volumes in real-time
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(masterVolume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [masterVolume]);

  useEffect(() => {
    if (leftGainRef.current && rightGainRef.current && audioCtxRef.current) {
      leftGainRef.current.gain.setTargetAtTime(toneVolume, audioCtxRef.current.currentTime, 0.1);
      rightGainRef.current.gain.setTargetAtTime(toneVolume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [toneVolume]);

  useEffect(() => {
    if (subliminalGainRef.current && audioCtxRef.current) {
      subliminalGainRef.current.gain.setTargetAtTime(subliminalVolume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [subliminalVolume]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    initAudio();

    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
    setAudioBuffer(decodedBuffer);

    if (isPlaying) {
      startSubliminal();
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="w-full flex justify-between items-end border-b border-[#2a2b2e] pb-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase italic font-mono">Subliminal Player</h1>
          <p className="text-xs text-[#8e9299] font-mono tracking-widest uppercase mt-1">Binaural & Frequency Generator v1.0</p>
        </div>
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 hover:bg-[#2a2b2e] rounded-full transition-colors"
        >
          <Info size={20} className="text-[#8e9299]" />
        </button>
      </header>

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full glass-panel p-6 overflow-hidden"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap size={14} className="text-blue-500" /> How it works
            </h3>
            <p className="text-sm text-[#8e9299] leading-relaxed">
              Binaural beats are created by playing two slightly different frequencies in each ear. 
              Your brain perceives a third tone (the "beat") which is the difference between the two. 
              <br /><br />
              <span className="text-white font-bold">Delta (0.5-4Hz):</span> Deep sleep, healing. <br />
              <span className="text-white font-bold">Theta (4-8Hz):</span> Meditation, creativity, REM sleep. <br />
              <span className="text-white font-bold">Alpha (8-14Hz):</span> Relaxation, focus. <br />
              <span className="text-white font-bold">Beta (14-30Hz):</span> Alertness, concentration.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Player & Visuals */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-mono uppercase tracking-tighter text-[#8e9299]">
                {isPlaying ? 'System Active' : 'System Standby'}
              </span>
            </div>

            <Visualizer audioContext={audioCtxRef.current} source={masterGainRef.current} />

            <div className="mt-8 flex flex-col items-center gap-4">
              <button 
                onClick={togglePlayback}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isPlaying 
                  ? 'bg-white text-black scale-95' 
                  : 'bg-blue-600 text-white hover:scale-105 shadow-[0_0_30px_rgba(37,99,235,0.4)]'
                }`}
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              
              <div className="text-center">
                <p className="text-[10px] font-mono uppercase text-[#8e9299] mb-1">Master Volume</p>
                <div className="flex items-center gap-3">
                  <VolumeX size={14} className="text-[#8e9299]" />
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <Volume2 size={14} className="text-[#8e9299]" />
                </div>
              </div>
            </div>
          </div>

          {/* Subliminal Upload */}
          <div className="glass-panel p-6">
            <h3 className="text-xs font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} className="text-blue-500" /> Subliminal Track
            </h3>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#2a2b2e] rounded-lg cursor-pointer hover:border-blue-500 transition-colors group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-[#8e9299] group-hover:text-blue-500 transition-colors" />
                <p className="mb-2 text-sm text-[#8e9299]">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-[#8e9299]">MP3, WAV, FLAC (Max 50MB)</p>
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
            </label>

            {fileName && (
              <div className="mt-4 p-3 bg-[#0a0a0b] border border-[#2a2b2e] rounded flex items-center justify-between">
                <span className="text-xs font-mono truncate max-w-[200px]">{fileName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-blue-500 uppercase">Loaded</span>
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-[#8e9299]">Track Volume</span>
                <span className="text-[10px] font-mono">{Math.round(subliminalVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={subliminalVolume}
                onChange={(e) => setSubliminalVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Frequency Controls */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6">
            <h3 className="text-xs font-mono uppercase tracking-widest mb-6 flex items-center gap-2">
              <Settings size={14} className="text-blue-500" /> Frequency Generator
            </h3>

            <div className="space-y-8">
              {/* Base Frequency */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-[#8e9299]">Base Frequency (Left Ear)</span>
                  <span className="text-sm font-mono text-blue-500">{baseFreq} Hz</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="1000" 
                  step="1" 
                  value={baseFreq}
                  onChange={(e) => setBaseFreq(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono text-[#444]">20Hz</span>
                  <span className="text-[9px] font-mono text-[#444]">1000Hz</span>
                </div>
              </div>

              {/* Binaural Offset */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-[#8e9299]">Binaural Offset (Beat)</span>
                  <span className="text-sm font-mono text-blue-500">{binauralFreq} Hz</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="40" 
                  step="0.1" 
                  value={binauralFreq}
                  onChange={(e) => setBinauralFreq(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono text-[#444]">0.1Hz</span>
                  <span className="text-[9px] font-mono text-[#444]">40Hz</span>
                </div>
              </div>

              {/* Resulting Right Ear */}
              <div className="p-4 bg-[#0a0a0b] border border-[#2a2b2e] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Headphones size={20} className="text-[#8e9299]" />
                  <div>
                    <p className="text-[9px] font-mono uppercase text-[#8e9299]">Right Ear Frequency</p>
                    <p className="text-lg font-mono font-bold">{rightFreq.toFixed(1)} Hz</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-mono uppercase text-[#8e9299]">Waveform</p>
                  <select 
                    value={waveform}
                    onChange={(e) => setWaveform(e.target.value as WaveformType)}
                    className="bg-transparent text-xs font-mono border-none focus:ring-0 cursor-pointer text-blue-500"
                  >
                    <option value="sine">Sine</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </div>
              </div>

              {/* Tone Volume */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase text-[#8e9299]">Tone Intensity</span>
                  <span className="text-[10px] font-mono">{Math.round(toneVolume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={toneVolume}
                  onChange={(e) => setToneVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="glass-panel p-6">
            <h3 className="text-xs font-mono uppercase tracking-widest mb-4">Brainwave Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Delta', freq: 2, desc: 'Deep Sleep' },
                { name: 'Theta', freq: 6, desc: 'Meditation' },
                { name: 'Alpha', freq: 10, desc: 'Relaxation' },
                { name: 'Beta', freq: 20, desc: 'Focus' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setBinauralFreq(preset.freq)}
                  className={`p-3 rounded border text-left transition-all ${
                    binauralFreq === preset.freq 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-[#2a2b2e] hover:border-[#444]'
                  }`}
                >
                  <p className="text-xs font-bold uppercase">{preset.name}</p>
                  <p className="text-[9px] text-[#8e9299] font-mono">{preset.freq}Hz - {preset.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#2a2b2e] pt-4 flex justify-between items-center text-[9px] font-mono text-[#444] uppercase tracking-widest">
        <span>Stereo Output Required</span>
        <span>© 2026 Subliminal Audio Labs</span>
        <span>Precision Frequency Control</span>
      </footer>
    </div>
  );
}
