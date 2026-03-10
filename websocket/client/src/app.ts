/**
 * Copyright (c) 2024–2025, Daily
 *
 * SPDX-License-Identifier: BSD 2-Clause License
 */

import {
  PipecatClient,
  PipecatClientOptions,
  RTVIEvent,
} from '@pipecat-ai/client-js';

import { WebSocketTransport } from '@pipecat-ai/websocket-transport';

class WebsocketClientApp {

  private pcClient: PipecatClient | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private statusDot: HTMLElement | null = null;
  private statusSpan: HTMLElement | null = null;
  private debugLog: HTMLElement | null = null;
  private botAudio: HTMLAudioElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private time = 0;
  private subtitleElement: HTMLElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private speechEnergy = 0;
  private voiceOrb: HTMLElement | null = null;
  private particleLayer: HTMLElement | null = null;
  private ambientGlow: HTMLElement | null = null;
  private isConnected = false;

  constructor() {

    console.log("WebsocketClientApp started");

    // Prefer the existing <audio id="bot-audio"> from index.html, otherwise create one (hidden UI).
    const existingAudio = document.getElementById("bot-audio") as HTMLAudioElement | null;
    if (existingAudio) {
      this.botAudio = existingAudio;
    } else {
      this.botAudio = document.createElement("audio");
      // Keep player controls hidden from UI:
      this.botAudio.controls = false;
      this.botAudio.style.display = "none";
      document.body.appendChild(this.botAudio);
    }

    this.botAudio.autoplay = true;
    this.botAudio.muted = false;
    this.botAudio.volume = 1;
    this.botAudio.style.display = "none";

    this.setupDOMElements();
    this.setupEventListeners();

    this.initializeAudioContext();

    if (this.canvas && this.ctx) {
      this.startWaveform();
    }

    window.addEventListener('beforeunload', () => {
      const panel = document.getElementById('glassPanel');
      panel?.classList.add('fade-out');
    });
  }

  private initializeAudioContext(): void {
    const AudioCtxCtor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | null;
    if (!AudioCtxCtor) return;

    try {
      this.audioCtx = new AudioCtxCtor();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    } catch (err) {
      console.warn("AudioContext init failed", err);
      this.audioCtx = null;
      this.analyser = null;
      this.dataArray = null;
    }
  }

  private setupDOMElements(): void {

    this.toggleBtn = document.getElementById("toggle-btn") as HTMLButtonElement;
    this.statusDot = document.getElementById("status-dot") as HTMLElement;
    this.statusSpan = document.getElementById("connection-status");
    this.debugLog = document.getElementById("debug-log");
    this.canvas = document.getElementById("waveCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas?.getContext("2d")!;
    this.subtitleElement = document.getElementById("subtitle-text");
    this.voiceOrb = document.getElementById("voice-orb");
    this.particleLayer = document.getElementById("particleLayer");
    this.ambientGlow = document.getElementById("ambient-glow") as HTMLElement;
  }

  private setupEventListeners(): void {

    this.toggleBtn?.addEventListener("click", () => {
      if (this.isConnected) {
        void this.disconnect();
      } else {
        void this.connect();
      }
    });

    if (this.particleLayer) {
      this.populateParticles(35);
    }

  }

  private log(message: string): void {

    if (!this.debugLog) return;

    const entry = document.createElement("div");
    entry.textContent = `${new Date().toISOString()} - ${message}`;

    if (message.startsWith("User:")) entry.style.color = "#2196F3";
    if (message.startsWith("Bot:")) entry.style.color = "#4CAF50";

    this.debugLog.appendChild(entry);
    this.debugLog.scrollTop = this.debugLog.scrollHeight;

    console.log(message);

  }

  private populateParticles(count: number): void {
    if (!this.particleLayer) return;

    this.particleLayer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'particle';
      const x = Math.random() * 100;
      const y = 90 + Math.random() * 10;
      dot.style.left = `${x}vw`;
      dot.style.top = `${y}vh`;
      dot.style.animationDuration = `${6 + Math.random() * 8}s`;
      dot.style.opacity = `${0.2 + Math.random() * 0.6}`;
      this.particleLayer.appendChild(dot);
    }
  }

  private updateStatus(status: string): void {

    if (this.statusSpan) this.statusSpan.textContent = status;

    if (status === "Connected") {
      this.isConnected = true;
      if (this.toggleBtn) {
        this.toggleBtn.textContent = "Disconnect";
        this.toggleBtn.classList.remove("btn-connect");
        this.toggleBtn.classList.add("btn-disconnect");
      }
      if (this.statusDot) {
        this.statusDot.classList.remove("offline", "connecting");
        this.statusDot.classList.add("live");
      }
      if (this.ambientGlow) {
        this.ambientGlow.classList.add("glow-active");
      }
    }

    if (status === "Disconnected") {
      this.isConnected = false;
      if (this.toggleBtn) {
        this.toggleBtn.textContent = "Wake Friday";
        this.toggleBtn.classList.remove("btn-disconnect");
        this.toggleBtn.classList.add("btn-connect");
      }
      if (this.statusDot) {
        this.statusDot.classList.remove("live", "connecting");
        this.statusDot.classList.add("offline");
      }
      if (this.ambientGlow) {
        this.ambientGlow.classList.remove("glow-active");
      }
    }

    this.log(`Status: ${status}`);

  }

  private startWaveform(): void {
    const render = (): void => {
      if (!this.canvas || !this.ctx) return;

      const width = this.canvas.width = this.canvas.offsetWidth;
      const height = this.canvas.height = this.canvas.offsetHeight;

      this.ctx.clearRect(0, 0, width, height);

      const layers = 4;

      const energyFactor = Math.min(1, this.speechEnergy * 2.5 + 0.1);
      for (let j = 0; j < layers; j++) {
        this.ctx.beginPath();

        for (let i = 0; i < width; i++) {
          const y =
            height / 2 +
            Math.sin(i * 0.01 + this.time + j) * (20 + energyFactor * 40) +
            Math.sin(i * 0.02 + this.time * 1.5) * (15 + energyFactor * 30);

          if (i === 0) {
            this.ctx.moveTo(i, y);
          } else {
            this.ctx.lineTo(i, y);
          }
        }

        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#22d3ee');
        gradient.addColorStop(0.5, '#4ade80');
        gradient.addColorStop(1, '#6366f1');

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      this.time += 0.03;
      requestAnimationFrame(render);
    };

    render();
  }

  private showSubtitle(text: string): void {
    if (!this.subtitleElement) return;

    this.subtitleElement.textContent = text;
    this.subtitleElement.classList.remove('show');

    setTimeout(() => {
      this.subtitleElement?.classList.add('show');
    }, 20);

    setTimeout(() => {
      this.subtitleElement?.classList.remove('show');
    }, 4500);
  }

  private pulseVoiceOrb(): void {
    if (!this.voiceOrb) return;

    this.voiceOrb.classList.add('pulsing');
    setTimeout(() => {
      this.voiceOrb?.classList.remove('pulsing');
    }, 280);
  }

  private updateSpeechEnergy(): void {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteTimeDomainData(this.dataArray as any);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += Math.abs(this.dataArray[i] - 128);
    }

    this.speechEnergy = Math.min(1, (sum / this.dataArray.length) / 128 * 2);

    if (this.voiceOrb) {
      const scale = 1 + this.speechEnergy * 0.8;
      this.voiceOrb.style.transform = `translate(-50%, -50%) scale(${scale})`;
      this.voiceOrb.style.boxShadow = `0 0 ${12 + this.speechEnergy * 30}px rgba(34,211,238,0.8), 0 0 ${20 + this.speechEnergy * 35}px rgba(99,102,241,0.8)`;
    }

    requestAnimationFrame(() => this.updateSpeechEnergy());
  }

  private async attachBotAudioTrack(track: MediaStreamTrack) {
    if (track.kind !== "audio") return;

    this.log("Bot audio track received");

    // If there is already a stream, stop old tracks.
    if (this.botAudio.srcObject && "getAudioTracks" in this.botAudio.srcObject) {
      this.botAudio.srcObject.getAudioTracks().forEach((oldTrack) => oldTrack.stop());
    }

    const stream = new MediaStream([track]);
    this.botAudio.srcObject = stream;
    this.botAudio.muted = false;
    this.botAudio.volume = 1;

    if (this.audioCtx && this.analyser) {
      try {
        if (this.sourceNode) {
          this.sourceNode.disconnect();
        }

        this.sourceNode = this.audioCtx.createMediaStreamSource(stream);
        this.sourceNode.connect(this.analyser);

        this.updateSpeechEnergy();
      } catch (err) {
        console.warn("Failed to connect analyser", err);
      }
    }

    try {
      await this.botAudio.play();
      this.log("Bot audio playback started");
    } catch (err) {
      this.log(`Bot audio playback blocked: ${String(err)}`);
      console.error("Bot audio playback blocked:", err);
    }
  }

  setupTrackListeners() {

    if (!this.pcClient) return;

    this.pcClient.on(RTVIEvent.TrackStarted, (track, participant) => {
      // Accept bot audio even if participant metadata is absent; some SDK variants pass undefined.
      if (track.kind === "audio" && !participant?.local) {
        void this.attachBotAudioTrack(track);
      }
    });

    this.pcClient.on(RTVIEvent.TrackStopped, (track, participant) => {
      if (track.kind === "audio" && !participant?.local) {
        this.log("Bot audio track stopped");
        if (this.botAudio.srcObject && "getAudioTracks" in this.botAudio.srcObject) {
          this.botAudio.srcObject.getAudioTracks().forEach((t) => t.stop());
        }
        this.botAudio.srcObject = null;
      }
    });

  }

  private async cleanupBotAudio(): Promise<void> {
    if (this.botAudio.srcObject && "getAudioTracks" in this.botAudio.srcObject) {
      this.botAudio.srcObject.getAudioTracks().forEach((track) => track.stop());
    }
    this.botAudio.srcObject = null;
    this.botAudio.pause();
    this.botAudio.currentTime = 0;
  }

  public async connect(): Promise<void> {

    if (this.pcClient) {
      this.log("Already connected or connecting.");
      return;
    }

    try {

      const PipecatConfig: PipecatClientOptions = {

        transport: new WebSocketTransport(),

        enableMic: true,
        enableCam: false,

        callbacks: {

          onConnected: () => {

            this.updateStatus("Connected");

            this.botAudio.muted = false;
            this.botAudio.volume = 1;
            void this.botAudio.play().catch(() => {
              // play may fail if autoplay policy blocks before track arrives
            });

          },

          onDisconnected: () => {

            this.updateStatus("Disconnected");

          },

          onBotReady: (data) => {

            this.log(`Bot ready: ${JSON.stringify(data)}`);

          },

          onUserTranscript: (data) => {

            if ((data as any).final) this.log(`User: ${data.text}`);

          },

          onBotTranscript: (data) => {

            this.log(`Bot: ${data.text}`);

            if ((data as any).final) {
              this.showSubtitle(data.text);
              this.pulseVoiceOrb();
            }

          },

          onError: (err) => {

            console.error(err);

          }

        }

      };

      this.pcClient = new PipecatClient(PipecatConfig);

      this.setupTrackListeners();

      this.log("Initializing microphone...");

      await this.pcClient.initDevices();

      this.log("Connecting to bot...");

      await this.pcClient.startBotAndConnect({
        endpoint: "http://localhost:7860/connect"
      });

    }

    catch (error) {

      this.log(`Error connecting: ${(error as Error).message}`);
      await this.disconnect();

    }

  }

  public async disconnect(): Promise<void> {

    if (!this.pcClient) {
      this.updateStatus("Disconnected");
      return;
    }

    try {

      await this.pcClient.disconnect();
      this.pcClient = null;

      await this.cleanupBotAudio();

      this.updateStatus("Disconnected");

    }

    catch (error) {

      this.log(`Error disconnecting: ${(error as Error).message}`);

      this.pcClient = null;
      await this.cleanupBotAudio();
      this.updateStatus("Disconnected");

    }

  }

}

declare global {
  interface Window {
    WebsocketClientApp: typeof WebsocketClientApp;
  }
}

window.addEventListener("DOMContentLoaded", () => {

  window.WebsocketClientApp = WebsocketClientApp;

  new WebsocketClientApp();

});

declare global {
  interface Window {
    WebsocketClientApp: typeof WebsocketClientApp;
  }
}

window.addEventListener("DOMContentLoaded", () => {

  window.WebsocketClientApp = WebsocketClientApp;

  new WebsocketClientApp();

});