import json
import logging
from collections.abc import Generator

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from llm import stream_groq_reply
from models import Conversation, ConversationSummary, Message, MessageCreate
from store import conversations, create_conversation, list_conversation_summaries, title_from_message


app = FastAPI(title="Chat Lab")
logger = logging.getLogger("generation-state-leak-demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IS_GENERATING_GLOBAL = False


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def get_conversation_or_404(conversation_id: str) -> Conversation:
    conversation = conversations.get(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def public_conversation(conversation: Conversation, simulate_bug: bool) -> Conversation:
    effective_is_generating = IS_GENERATING_GLOBAL if simulate_bug else conversation.is_generating
    return Conversation(
        id=conversation.id,
        title=conversation.title,
        messages=conversation.messages,
        is_generating=effective_is_generating,
    )


@app.post("/conversations", response_model=ConversationSummary)
async def create_new_conversation() -> ConversationSummary:
    conversation = create_conversation()
    return ConversationSummary(id=conversation.id, title=conversation.title)


@app.get("/conversations", response_model=list[ConversationSummary])
async def get_conversations() -> list[ConversationSummary]:
    return list_conversation_summaries()


@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: str,
    simulate_bug: bool = Query(default=False),
) -> Conversation:
    conversation = get_conversation_or_404(conversation_id)
    return public_conversation(conversation, simulate_bug)


@app.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str) -> None:
    get_conversation_or_404(conversation_id)
    del conversations[conversation_id]


@app.post("/conversations/{conversation_id}/messages")
async def post_message(
    conversation_id: str,
    payload: MessageCreate,
    simulate_bug: bool = Query(default=False),
) -> StreamingResponse:
    global IS_GENERATING_GLOBAL

    conversation = get_conversation_or_404(conversation_id)
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message content cannot be empty")

    if simulate_bug and IS_GENERATING_GLOBAL:
        raise HTTPException(status_code=409, detail="Global generator is busy")
    if not simulate_bug and conversation.is_generating:
        raise HTTPException(status_code=409, detail="Conversation is already generating")

    conversation.messages.append(Message(role="user", content=content))
    if conversation.title == "Cuộc hội thoại mới":
        conversation.title = title_from_message(content)

    if simulate_bug:
        IS_GENERATING_GLOBAL = True
    else:
        conversation.is_generating = True

    def event_stream() -> Generator[str, None, None]:
        global IS_GENERATING_GLOBAL

        full_response: list[str] = []
        try:
            yield sse("meta", {"conversation_id": conversation.id})

            for token in stream_groq_reply(conversation.messages):
                full_response.append(token)
                yield sse("chunk", {"content": token})

            assistant_content = "".join(full_response).strip()
            if assistant_content:
                conversation.messages.append(Message(role="assistant", content=assistant_content))

            yield sse("done", {"content": assistant_content})
        except Exception as exc:  # Keep the SSE pipe readable by the frontend.
            cause = getattr(exc, "__cause__", None) or getattr(exc, "__context__", None)
            logger.exception(
                "Groq streaming failed for conversation_id=%s simulate_bug=%s",
                conversation.id,
                simulate_bug,
            )
            yield sse(
                "error",
                {
                    "type": exc.__class__.__name__,
                    "message": str(exc),
                    "cause": repr(cause) if cause else None,
                    "hint": "Check GROQ_API_KEY and GROQ_MODEL in backend/.env.",
                },
            )
        finally:
            if simulate_bug:
                IS_GENERATING_GLOBAL = False
            else:
                conversation.is_generating = False

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
