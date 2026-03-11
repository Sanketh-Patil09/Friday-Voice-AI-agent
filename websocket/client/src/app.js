"use strict";
/**
 * Copyright (c) 2024–2025, Daily
 *
 * SPDX-License-Identifier: BSD 2-Clause License
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_js_1 = require("@pipecat-ai/client-js");
const websocket_transport_1 = require("@pipecat-ai/websocket-transport");
class WebsocketClientApp {
    constructor() {
        this.pcClient = null;
        this.toggleBtn = null;
        this.statusDot = null;
        this.statusSpan = null;
        this.debugLog = null;
        this.time = 0;
        this.subtitleElement = null;
        this.audioCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.sourceNode = null;
        this.speechEnergy = 0;
        this.voiceOrb = null;
        this.particleLayer = null;
        this.ambientGlow = null;
        this.isConnected = false;
        console.log("WebsocketClientApp started");
        // Prefer the existing <audio id="bot-audio"> from index.html, otherwise create one (hidden UI).
        const existingAudio = document.getElementById("bot-audio");
        if (existingAudio) {
            this.botAudio = existingAudio;
        }
        else {
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
            panel === null || panel === void 0 ? void 0 : panel.classList.add('fade-out');
        });
    }
    initializeAudioContext() {
        const AudioCtxCtor = (window.AudioContext || window.webkitAudioContext);
        if (!AudioCtxCtor)
            return;
        try {
            this.audioCtx = new AudioCtxCtor();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 512;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        }
        catch (err) {
            console.warn("AudioContext init failed", err);
            this.audioCtx = null;
            this.analyser = null;
            this.dataArray = null;
        }
    }
    setupDOMElements() {
        var _a;
        this.toggleBtn = document.getElementById("toggle-btn");
        this.statusDot = document.getElementById("status-dot");
        this.statusSpan = document.getElementById("connection-status");
        this.debugLog = document.getElementById("debug-log");
        this.canvas = document.getElementById("waveCanvas");
        this.ctx = (_a = this.canvas) === null || _a === void 0 ? void 0 : _a.getContext("2d");
        this.subtitleElement = document.getElementById("subtitle-text");
        this.voiceOrb = document.getElementById("voice-orb");
        this.particleLayer = document.getElementById("particleLayer");
        this.ambientGlow = document.getElementById("ambient-glow");
    }
    setupEventListeners() {
        var _a;
        (_a = this.toggleBtn) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
            if (this.isConnected) {
                void this.disconnect();
            }
            else {
                void this.connect();
            }
        });
        if (this.particleLayer) {
            this.populateParticles(35);
        }
    }
    log(message) {
        if (!this.debugLog)
            return;
        const entry = document.createElement("div");
        entry.textContent = `${new Date().toISOString()} - ${message}`;
        if (message.startsWith("User:"))
            entry.style.color = "#2196F3";
        if (message.startsWith("Bot:"))
            entry.style.color = "#4CAF50";
        this.debugLog.appendChild(entry);
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
        console.log(message);
    }
    populateParticles(count) {
        if (!this.particleLayer)
            return;
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
    updateStatus(status) {
        if (this.statusSpan)
            this.statusSpan.textContent = status;
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
    startWaveform() {
        const render = () => {
            if (!this.canvas || !this.ctx)
                return;
            const width = this.canvas.width = this.canvas.offsetWidth;
            const height = this.canvas.height = this.canvas.offsetHeight;
            this.ctx.clearRect(0, 0, width, height);
            const layers = 4;
            const energyFactor = Math.min(1, this.speechEnergy * 2.5 + 0.1);
            for (let j = 0; j < layers; j++) {
                this.ctx.beginPath();
                for (let i = 0; i < width; i++) {
                    const y = height / 2 +
                        Math.sin(i * 0.01 + this.time + j) * (20 + energyFactor * 40) +
                        Math.sin(i * 0.02 + this.time * 1.5) * (15 + energyFactor * 30);
                    if (i === 0) {
                        this.ctx.moveTo(i, y);
                    }
                    else {
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
    showSubtitle(text) {
        if (!this.subtitleElement)
            return;
        this.subtitleElement.textContent = text;
        this.subtitleElement.classList.remove('show');
        setTimeout(() => {
            var _a;
            (_a = this.subtitleElement) === null || _a === void 0 ? void 0 : _a.classList.add('show');
        }, 20);
        setTimeout(() => {
            var _a;
            (_a = this.subtitleElement) === null || _a === void 0 ? void 0 : _a.classList.remove('show');
        }, 4500);
    }
    pulseVoiceOrb() {
        if (!this.voiceOrb)
            return;
        this.voiceOrb.classList.add('pulsing');
        setTimeout(() => {
            var _a;
            (_a = this.voiceOrb) === null || _a === void 0 ? void 0 : _a.classList.remove('pulsing');
        }, 280);
    }
    updateSpeechEnergy() {
        if (!this.analyser || !this.dataArray)
            return;
        this.analyser.getByteTimeDomainData(this.dataArray);
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
    attachBotAudioTrack(track) {
        return __awaiter(this, void 0, void 0, function* () {
            if (track.kind !== "audio")
                return;
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
                }
                catch (err) {
                    console.warn("Failed to connect analyser", err);
                }
            }
            try {
                yield this.botAudio.play();
                this.log("Bot audio playback started");
            }
            catch (err) {
                this.log(`Bot audio playback blocked: ${String(err)}`);
                console.error("Bot audio playback blocked:", err);
            }
        });
    }
    setupTrackListeners() {
        if (!this.pcClient)
            return;
        this.pcClient.on(client_js_1.RTVIEvent.TrackStarted, (track, participant) => {
            // Accept bot audio even if participant metadata is absent; some SDK variants pass undefined.
            if (track.kind === "audio" && !(participant === null || participant === void 0 ? void 0 : participant.local)) {
                void this.attachBotAudioTrack(track);
            }
        });
        this.pcClient.on(client_js_1.RTVIEvent.TrackStopped, (track, participant) => {
            if (track.kind === "audio" && !(participant === null || participant === void 0 ? void 0 : participant.local)) {
                this.log("Bot audio track stopped");
                if (this.botAudio.srcObject && "getAudioTracks" in this.botAudio.srcObject) {
                    this.botAudio.srcObject.getAudioTracks().forEach((t) => t.stop());
                }
                this.botAudio.srcObject = null;
            }
        });
    }
    cleanupBotAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.botAudio.srcObject && "getAudioTracks" in this.botAudio.srcObject) {
                this.botAudio.srcObject.getAudioTracks().forEach((track) => track.stop());
            }
            this.botAudio.srcObject = null;
            this.botAudio.pause();
            this.botAudio.currentTime = 0;
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pcClient) {
                this.log("Already connected or connecting.");
                return;
            }
            try {
                const PipecatConfig = {
                    transport: new websocket_transport_1.WebSocketTransport(),
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
                            if (data.final)
                                this.log(`User: ${data.text}`);
                        },
                        onBotTranscript: (data) => {
                            this.log(`Bot: ${data.text}`);
                            if (data.final) {
                                this.showSubtitle(data.text);
                                this.pulseVoiceOrb();
                            }
                        },
                        onError: (err) => {
                            console.error(err);
                        }
                    }
                };
                this.pcClient = new client_js_1.PipecatClient(PipecatConfig);
                this.setupTrackListeners();
                this.log("Initializing microphone...");
                yield this.pcClient.initDevices();
                this.log("Connecting to bot...");
                yield this.pcClient.startBotAndConnect({
                    endpoint: "http://localhost:7860/connect"
                });
            }
            catch (error) {
                this.log(`Error connecting: ${error.message}`);
                yield this.disconnect();
            }
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pcClient) {
                this.updateStatus("Disconnected");
                return;
            }
            try {
                yield this.pcClient.disconnect();
                this.pcClient = null;
                yield this.cleanupBotAudio();
                this.updateStatus("Disconnected");
            }
            catch (error) {
                this.log(`Error disconnecting: ${error.message}`);
                this.pcClient = null;
                yield this.cleanupBotAudio();
                this.updateStatus("Disconnected");
            }
        });
    }
}
window.addEventListener("DOMContentLoaded", () => {
    window.WebsocketClientApp = WebsocketClientApp;
    new WebsocketClientApp();
});
window.addEventListener("DOMContentLoaded", () => {
    window.WebsocketClientApp = WebsocketClientApp;
    new WebsocketClientApp();
});
