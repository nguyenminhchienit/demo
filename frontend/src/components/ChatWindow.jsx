import { SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatWindow({
  conversation,
  isLoading,
  streamingText,
  onSend,
  onCreateConversation,
}) {
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef(null);
  const isGenerating = Boolean(conversation?.is_generating);

  useEffect(() => {
    setDraft("");
  }, [conversation?.id]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation?.messages, streamingText]);

  async function submit(event) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || isGenerating) {
      return;
    }

    setDraft("");
    await onSend(value);
  }

  if (!conversation) {
    return (
      <section className="chat-empty">
        <h2>Chọn hoặc tạo conversation</h2>
        <button className="text-button" type="button" onClick={onCreateConversation}>
          Tạo conversation mới
        </button>
      </section>
    );
  }

  return (
    <section className="chat-window">
      <div className="chat-heading">
        <div>
          <p className="eyebrow">Conversation</p>
          <h2>{conversation.title}</h2>
        </div>
        <span className={isGenerating ? "status-pill active" : "status-pill"}>
          {isGenerating ? "Đang trả lời..." : "Sẵn sàng"}
        </span>
      </div>

      <div className="message-feed" ref={scrollerRef}>
        {isLoading && conversation.messages.length === 0 ? (
          <div className="loading-line">Đang tải...</div>
        ) : null}

        {conversation.messages.length === 0 && !streamingText ? (
          <div className="empty-chat">Conversation này chưa có tin nhắn.</div>
        ) : null}

        {conversation.messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message-bubble ${message.role}`}>
            <div className="message-role">{message.role === "user" ? "Bạn" : "Assistant"}</div>
            <p>{message.content}</p>
          </article>
        ))}

        {streamingText ? (
          <article className="message-bubble assistant streaming">
            <div className="message-role">Assistant</div>
            <p>{streamingText}</p>
          </article>
        ) : null}

        {isGenerating && !streamingText ? (
          <article className="message-bubble assistant pending">
            <div className="message-role">Assistant</div>
            <p>Đang trả lời...</p>
          </article>
        ) : null}
      </div>

      <form className="composer" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isGenerating}
          placeholder={isGenerating ? "Đang trả lời..." : "Nhập tin nhắn mới"}
        />
        <button className="send-button" type="submit" disabled={isGenerating || !draft.trim()}>
          <SendHorizonal size={18} />
          <span>Gửi</span>
        </button>
      </form>
    </section>
  );
}
