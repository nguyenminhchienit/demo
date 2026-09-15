from typing import Literal

from pydantic import BaseModel, Field


MessageRole = Literal["user", "assistant"]


class Message(BaseModel):
    role: MessageRole
    content: str


class Conversation(BaseModel):
    id: str
    title: str
    messages: list[Message] = Field(default_factory=list)
    is_generating: bool = False


class ConversationSummary(BaseModel):
    id: str
    title: str


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)

