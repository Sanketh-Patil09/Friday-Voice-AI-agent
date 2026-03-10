import asyncio
import os
import re
import requests
from urllib.parse import quote_plus

from loguru import logger
from sqlalchemy.orm import Session as DBSession

from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService

from pipecat.audio.vad.silero import SileroVADAnalyzer

from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask

from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)

from pipecat.serializers.protobuf import ProtobufFrameSerializer

from pipecat.transports.websocket.server import (
    WebsocketServerParams,
    WebsocketServerTransport,
)

from database import UserRequest, Session


SYSTEM_INSTRUCTION = """
You are a friendly AI voice assistant.

Keep responses short and helpful.

If the user introduces their name, remember it.

If you need real-world facts (news, facts, definitions, sports, weather, etc.),
use the `web_search` function call with a query and summarize results.
"""


async def web_search(params: FunctionCallParams):
    query = ""

    # Pipecat FunctionCallParams uses 'arguments' for function args
    if hasattr(params, "arguments") and isinstance(params.arguments, dict):
        query = params.arguments.get("query", "")
    elif hasattr(params, "parameters") and isinstance(params.parameters, dict):
        query = params.parameters.get("query", "")
    elif hasattr(params, "kwargs") and isinstance(params.kwargs, dict):
        query = params.kwargs.get("query", "")

    query = str(query).strip()
    if not query:
        await params.result_callback({"query": "", "summary": "No query provided."})
        return

    ddg_url = (
        "https://api.duckduckgo.com/?q=" + quote_plus(query) + "&format=json&no_html=1&skip_disambig=1"
    )

    try:
        resp = requests.get(ddg_url, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        abstract = data.get("AbstractText", "")
        if not abstract:
            # Fallback: join first few RelatedTopics texts
            related = data.get("RelatedTopics", [])
            pieces = []
            for topic in related[:3]:
                if isinstance(topic, dict):
                    text = topic.get("Text") or (topic.get("Topics", [{}])[0].get("Text") if topic.get("Topics") else "")
                    if text:
                        pieces.append(text)
            abstract = " ".join(pieces) or "No concise result found."

        summary = f"Web search results for '{query}': {abstract}"

    except Exception as exc:
        summary = f"Failed to perform web search: {exc}"

    await params.result_callback({"query": query, "summary": summary})


def extract_user_info(text):
    """
    Extract name and request from sentence.

    Example:
    'My name is Arjun and I want to book a ticket'
    """

    name_match = re.search(r"my name is (\w+)", text.lower())
    request_match = re.search(r"i want to (.*)", text.lower())

    name = name_match.group(1) if name_match else None
    request = request_match.group(1) if request_match else None

    return name, request


async def run_bot_websocket_server():

    # WebSocket Transport
    ws_transport = WebsocketServerTransport(
        params=WebsocketServerParams(
            serializer=ProtobufFrameSerializer(),
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            session_timeout=60 * 3,
        )
    )

    # Define tools (function schema) before LLM context uses it
    web_search_function = FunctionSchema(
        name="web_search",
        description="Search the web and return a brief summary of findings.",
        properties={
            "query": {"type": "string", "description": "Search terms."},
        },
        required=["query"],
    )

    tools = ToolsSchema(standard_tools=[web_search_function])

    # LLM Context
    context = LLMContext(
        [
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": "Start by greeting the user warmly."},
        ],
        tools,
    )

    # User + Assistant Aggregators
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    # Speech to Text
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY")
    )

    # Text to Speech
    tts = ElevenLabsTTSService(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
    voice_id="21m00Tcm4TlvDq8ikWAM"
)

    # LLM (Groq)
    llm = OpenAILLMService(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
        model="llama-3.3-70b-versatile",
    )

    # Register the tool function with the LLM
    llm.register_function("web_search", web_search)

    # Pipeline
    pipeline = Pipeline(
        [
            ws_transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            ws_transport.output(),
            assistant_aggregator,
        ]
    )

    # Pipeline Task
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
            allow_interruptions=True,
        ),
    )

    # Handle User Messages
    @task.rtvi.event_handler("on_user_message")
    async def on_user_message(rtvi, message):

        logger.info(f"User said: {message}")

        name, request = extract_user_info(message)

        if name or request:

            db: DBSession = Session()

            entry = UserRequest(
                name=name if name else "Unknown",
                request=request if request else message,
            )

            db.add(entry)
            db.commit()
            db.close()

            logger.info(f"Saved to DB: {name} - {request}")

    # Client Ready Event
    @task.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        logger.info("Pipecat client ready")
        await rtvi.set_bot_ready()
        await task.queue_frames([LLMRunFrame()])

    # WebSocket Events
    @ws_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")

    @ws_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")

    @ws_transport.event_handler("on_session_timeout")
    async def on_session_timeout(transport, client):
        logger.info(f"Session timeout for {client.remote_address}")
        await task.cancel()

    runner = PipelineRunner()

    try:
        while True:
            await runner.run(task)
    except asyncio.CancelledError:
        logger.info("Bot server shutting down gracefully...")
        try:
            await task.cancel()
        except Exception as e:
            logger.warning(f"Error cancelling task: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        try:
            await task.cancel()
        except Exception as cancel_err:
            logger.warning(f"Error cancelling task: {cancel_err}")
    finally:
        logger.info("Bot server shutdown complete")