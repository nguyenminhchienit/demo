from uuid import uuid4

from models import Conversation, ConversationSummary


conversations: dict[str, Conversation] = {}


def create_conversation() -> Conversation:
    conversation = Conversation(
        id=str(uuid4()),
        title="Cuộc hội thoại mới",
    )
    conversations[conversation.id] = conversation
    return conversation


def list_conversation_summaries() -> list[ConversationSummary]:
    return [
        ConversationSummary(id=conversation.id, title=conversation.title)
        for conversation in conversations.values()
    ]


def title_from_message(content: str) -> str:
    normalized = " ".join(content.strip().split())
    if not normalized:
        return "Cuộc hội thoại mới"
    return normalized[:42] + ("..." if len(normalized) > 42 else "")

