#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

import asyncio
import os
import signal
from contextlib import asynccontextmanager
from typing import Any, Dict

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv(override=True)

# Import ONLY the websocket server bot
from bot_websocket_server import run_bot_websocket_server

# Global reference to bot task for cleanup
bot_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles FastAPI startup and shutdown."""
    
    global bot_task
    # Start the Pipecat websocket voice bot
    bot_task = asyncio.create_task(run_bot_websocket_server())

    yield
    
    # Graceful shutdown
    if bot_task and not bot_task.done():
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass


# Initialize FastAPI app
app = FastAPI(lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/connect")
async def bot_connect(request: Request) -> Dict[Any, Any]:
    """
    Client calls this endpoint to get websocket URL
    """
    ws_url = "ws://localhost:8765"
    return {"ws_url": ws_url}


async def main():

    config = uvicorn.Config(app, host="0.0.0.0", port=7860)
    server = uvicorn.Server(config)

    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())