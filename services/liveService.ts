import { Personality } from '../types';

export class LiveService {
  private onStatusChange: (status: 'connected' | 'disconnected' | 'speaking' | 'listening') => void;
  private onVolumeChange: (volume: number) => void;
  private apiKey: string;

  constructor(
    onStatusChange: (status: 'connected' | 'disconnected' | 'speaking' | 'listening') => void,
    onVolumeChange: (volume: number) => void,
    apiKey: string
  ) {
    this.onStatusChange = onStatusChange;
    this.onVolumeChange = onVolumeChange;
    this.apiKey = apiKey;
  }

  async connect(_personality: Personality) {
    if (!this.apiKey) {
      this.onStatusChange('disconnected');
      return;
    }

    // Keep UI flow responsive even when realtime SDK is unavailable in this build.
    this.onStatusChange('connected');
    this.onVolumeChange(0.2);
    setTimeout(() => {
      this.onStatusChange('listening');
      this.onVolumeChange(0);
    }, 600);
  }

  async disconnect() {
    this.onStatusChange('disconnected');
    this.onVolumeChange(0);
  }
}
