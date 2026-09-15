import os
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

from models import Message

try:
    from groq import Groq
except ImportError:  # pragma: no cover - helpful before dependencies are installed.
    Groq = None


load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"


def stream_groq_reply(messages: list[Message]) -> Iterable[str]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or api_key.strip() in {"", "xxx", "your_groq_api_key_here"}:
        raise RuntimeError(
            "Missing GROQ_API_KEY. Create backend/.env and set GROQ_API_KEY from console.groq.com -> API Keys."
        )

    if Groq is None:
        raise RuntimeError("Missing Python package 'groq'. Run: pip install groq python-dotenv")

    model = os.environ.get("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    client = Groq(api_key=api_key)
    stream = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ],
        stream=True,
        temperature=0.7,
    )

    for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta
        token = getattr(delta, "content", None)
        if token:
            yield token
