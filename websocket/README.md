# Friday - AI Voice Agent

A premium, real-time AI voice assistant built with **Pipecat**, **Groq LLM**, **Deepgram STT**, and **ElevenLabs TTS**. Features live waveform visualization, dynamic status indicators, web search integration, and a sleek glassmorphic UI.

![Friday AI Agent](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)
![Node 18+](https://img.shields.io/badge/Node-18%2B-green)
![License](https://img.shields.io/badge/License-BSD--2--Clause-orange)

## ✨ Features

- 🎙️ **Real-time Voice Interaction**: Ultra-low latency speech capture and AI response
- 🌊 **Audio-Reactive Waveform**: Live sine wave visualization responding to speech energy
- 🔴 **Status Indicators**: Color-coded connection status (Red/Yellow/Green) with smooth animations
- 🌐 **Web Search Integration**: LLM-powered web search via DuckDuckGo API
- 🎨 **Premium UI**: Glassmorphic design with Space Grotesk font, smooth transitions, and ambient glow effects
- ⚡ **Responsive**: Dynamic toggle button, pill-shaped controls, hover effects
- 🔊 **Multi-Voice Support**: ElevenLabs TTS with voice customization
- 📊 **Metrics & Logging**: Comprehensive debug logging and usage metrics

## 🏗️ Architecture

### Backend Stack
- **Pipecat v0.0.104**: Real-time voice pipeline framework
- **Groq LLM (llama-3.3-70b)**: Fast inference for AI responses
- **Deepgram STT**: Real-time speech-to-text
- **ElevenLabs TTS**: Natural voice synthesis
- **FastAPI + Uvicorn**: Async web server with WebSocket support
- **SQLAlchemy**: User request database persistence

### Frontend Stack
- **TypeScript**: Type-safe client application
- **Vite**: Lightning-fast build tool
- **Web Audio API**: Real-time audio analysis and visualization
- **Canvas API**: Dynamic waveform rendering
- **Space Grotesk Font**: Modern, geometric typography

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- API Keys:
  - `GROQ_API_KEY` - [Get from Groq Console](https://console.groq.com/)
  - `DEEPGRAM_API_KEY` - [Get from Deepgram Console](https://console.deepgram.com/)
  - `ELEVENLABS_API_KEY` - [Get from ElevenLabs Dashboard](https://elevenlabs.io/app/voice-lab)

### 1. Clone Repository
```bash
git clone https://github.com/Sanketh-Patil09/friday-ai-agent.git
cd friday-ai-agent/websocket
```

### 2. Environment Setup

Create `.env` file in `server/` directory:
```bash
GROQ_API_KEY=your_groq_api_key_here
DEEPGRAM_API_KEY=your_deepgram_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Server Setup (Backend)
```bash
cd server

# Create Python virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
# OR with uv (faster)
uv sync

# Run server
python server.py
```

Server runs on `http://localhost:7860` with WebSocket at `ws://localhost:8765`

### 4. Client Setup (Frontend)
```bash
cd ../client

# Install dependencies
npm install

# Start development server
npm run dev
```

Client runs on `http://localhost:5173`

### 5. Open in Browser
Navigate to `http://localhost:5173` and click **"Wake Friday"** to start!

## 🎮 Usage

1. **Connect**: Click "Wake Friday" button (blue with glow effect)
   - Status dot turns green (connected)
   - Ambient glow activates behind waveform

2. **Speak**: Talk naturally to the AI
   - Waveform animates based on your speech energy
   - Subtitles appear in real-time
   - Bot responds with synthesized voice

3. **Web Search**: Ask questions that need current info
   - "What's the latest news about [topic]?"
   - "Tell me about [recent event]"
   - AI automatically searches the web and responds

4. **Disconnect**: Click "Disconnect" button (red border) to end session
   - Status dot turns red
   - Ambient glow deactivates
   - Ready to reconnect anytime

## 📁 Project Structure

```
friday-ai-agent/
├── websocket/
│   ├── server/
│   │   ├── bot_websocket_server.py    # Pipecat pipeline & handlers
│   │   ├── server.py                  # FastAPI + Uvicorn entry point
│   │   ├── database.py                # SQLAlchemy models
│   │   ├── pyproject.toml             # Python dependencies
│   │   ├── requirements.txt           # pip requirements
│   │   └── .env.example               # Environment template
│   │
│   ├── client/
│   │   ├── src/
│   │   │   ├── app.ts                 # Main TypeScript app
│   │   │   ├── style.css              # Glassmorphic styling
│   │   │   └── vite-env.d.ts         # Vite types
│   │   ├── index.html                 # HTML template
│   │   ├── package.json               # Node dependencies
│   │   ├── tsconfig.json              # TypeScript config
│   │   ├── vite.config.ts             # Vite build config
│   │   └── .gitignore
│   │
│   ├── README.md
│   └── .gitignore
```

## 🔧 Configuration

### Server (bot_websocket_server.py)
- **LLM Model**: `llama-3.3-70b-versatile` (Groq)
- **Voice**: `21m00Tcm4TlvDq8ikWAM` (ElevenLabs Adam)
- **Session Timeout**: 3 minutes
- **VAD (Voice Activity Detection)**: Silero VAD

### Client (app.ts)
- **Particle Count**: 35 floating particles
- **Waveform Layers**: 4 sine waves with energy modulation
- **Ambient Glow Animation**: 2s pulse cycle

## 📊 Database

User interactions are persisted to SQLite:
```sql
-- User Requests Table
CREATE TABLE user_requests (
    id INTEGER PRIMARY KEY,
    name TEXT,
    request TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Database file: `server/database.db`

## 🚨 Troubleshooting

### Audio Not Playing
- Check browser autoplay policy (click page first)
- Verify microphone permissions granted
- Check audio device output settings

### Server Crashes on Disconnect
- Fixed in latest version - graceful shutdown implemented
- Press `Ctrl+C` to cleanly exit

### LLM Response Timeout
- Verify `GROQ_API_KEY` is valid
- Check internet connection
- Groq API might be rate-limited (free tier)

### Microphone Issues
- Check OS audio permissions
- Use `About this Mac > Security & Privacy` (macOS)
- Verify microphone device in browser settings

## 🌐 Deployment

### Local Network Access
```bash
# Modify server.py
# Change: host="0.0.0.0"
# Access from other devices: http://<your-ip>:5173
```

### Cloud Deployment (AWS/Heroku/Railway)
1. Set environment variables on platform
2. Use production build: `npm run build` (client)
3. Deploy with: `python server.py` (server runs on port 7860 or `PORT` env var)

## 📝 API Reference

### POST `/connect`
Initiates WebSocket connection for voice session.

**Response:**
```json
{
  "ws_url": "ws://localhost:8765"
}
```

### WebSocket `/ws`
Real-time bidirectional voice communication.

**Events:**
- `ClientReady`: Client initialized and ready
- `UserTranscript`: User speech-to-text result
- `BotTranscript`: AI response text
- `TrackStarted`: Audio playback stream started

## 🤝 Contributing

Contributions are welcome! Areas for enhancement:
- [ ] Multi-language support
- [ ] Speaker identification
- [ ] Emotion detection
- [ ] Custom LLM models
- [ ] Mobile PWA app
- [ ] Docker containerization

## 📄 License

BSD 2-Clause License - See LICENSE file

## 🙏 Acknowledgments

- [Pipecat AI](https://github.com/pipecat-ai/pipecat) - Voice AI framework
- [Groq](https://groq.com/) - Fast LLM inference
- [Deepgram](https://deepgram.com/) - Speech recognition
- [ElevenLabs](https://elevenlabs.io/) - Voice synthesis
- [Daily.co](https://daily.co/) - WebRTC infrastructure

## 📧 Contact

Questions or feedback? Open an issue or reach out!

---

**Made with ❤️ using Pipecat | Groq | Deepgram | ElevenLabs**

---

### 💡 Notes

- Ensure all dependencies are installed before running the server.
- Check the `.env` file for missing configurations.

Happy coding! 🎉
