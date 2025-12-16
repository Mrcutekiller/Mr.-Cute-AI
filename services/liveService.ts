
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Personality } from '../types';
import { SYSTEM_INSTRUCTION_TEMPLATE } from '../constants';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

export class LiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private onStatusChange: (status: 'connected' | 'disconnected' | 'speaking' | 'listening') => void;
  private onVolumeChange: (volume: number) => void;

  constructor(
    onStatusChange: (status: 'connected' | 'disconnected' | 'speaking' | 'listening') => void,
    onVolumeChange: (volume: number) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    this.onStatusChange = onStatusChange;
    this.onVolumeChange = onVolumeChange;
  }

  async connect(personality: Personality) {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE.replace('{{PERSONALITY}}', personality);

      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            this.onStatusChange('connected');
            this.startAudioInput();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Output Handling
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              this.onStatusChange('speaking');
              if (this.outputAudioContext) {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                const audioBuffer = await decodeAudioData(
                  decode(base64EncodedAudioString),
                  this.outputAudioContext,
                  24000,
                  1
                );
                
                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                const gainNode = this.outputAudioContext.createGain();
                // Analyze volume for visualizer
                const analyser = this.outputAudioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyser.connect(gainNode);

                gainNode.connect(this.outputAudioContext.destination);

                source.addEventListener('ended', () => {
                  this.sources.delete(source);
                  if (this.sources.size === 0) {
                     this.onStatusChange('listening');
                     this.onVolumeChange(0);
                  }
                });
                
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);

                 // Simple visualization loop for output
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateVolume = () => {
                    if (this.sources.has(source)) {
                        analyser.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
                        this.onVolumeChange(sum / dataArray.length / 255); // Normalize 0-1
                        requestAnimationFrame(updateVolume);
                    }
                };
                updateVolume();
              }
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              this.stopAllAudio();
              this.nextStartTime = 0;
              this.onStatusChange('listening');
            }
          },
          onclose: () => {
            this.onStatusChange('disconnected');
          },
          onerror: (e) => {
            console.error(e);
            this.onStatusChange('disconnected');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
        },
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      this.onStatusChange('disconnected');
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.inputNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.inputNode.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      
      // Calculate volume for input visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += Math.abs(inputData[i]);
      }
      const avg = sum / inputData.length;
      // If NOT speaking, visualize input
      if (this.sources.size === 0) {
          this.onVolumeChange(Math.min(avg * 5, 1)); // Amplify mic sensitivity
      }

      const pcmBlob = createBlob(inputData);
      
      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      }
    };

    source.connect(this.inputNode);
    this.inputNode.connect(this.inputAudioContext.destination);
  }

  private stopAllAudio() {
    for (const source of this.sources.values()) {
      source.stop();
    }
    this.sources.clear();
    this.onVolumeChange(0);
  }

  async disconnect() {
    if (this.sessionPromise) {
        const session = await this.sessionPromise;
        // session.close() is not explicitly typed in some versions, but we close contexts
    }
    
    if (this.inputNode) {
      this.inputNode.disconnect();
      this.inputNode = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    
    this.onStatusChange('disconnected');
    this.onVolumeChange(0);
  }
}
