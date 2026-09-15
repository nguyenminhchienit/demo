import { useCallback, useEffect, useRef, useState } from "react";

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  streamMessage,
} from "./api";
import BugToggle from "./components/BugToggle.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import Sidebar from "./components/Sidebar.jsx";

function makeLocalTitle(content) {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized;
}

function omitKey(source, key) {
  const next = { ...source };
  delete next[key];
  return next;
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [simulateBug, setSimulateBug] = useState(false);
  const [streamingDrafts, setStreamingDrafts] = useState({});
  const [error, setError] = useState("");
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const selectedIdRef = useRef(selectedId);
  const simulateBugRef = useRef(simulateBug);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    simulateBugRef.current = simulateBug;
  }, [simulateBug]);

  const refreshList = useCallback(async () => {
    const items = await listConversations();
    setConversations(items);
    return items;
  }, []);

  const refreshConversation = useCallback(async (id) => {
    if (!id) {
      setConversation(null);
      return;
    }

    const data = await getConversation(id, simulateBugRef.current);
    if (selectedIdRef.current === id) {
      setConversation(data);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const items = await listConversations();
        if (!isMounted) {
          return;
        }
        setConversations(items);
        if (items.length > 0) {
          setSelectedId(items[0].id);
        }
      } catch (err) {
        setError(err.message);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      return undefined;
    }

    let isActive = true;

    async function loadConversation() {
      try {
        setIsLoadingConversation(true);
        await refreshConversation(selectedId);
      } catch (err) {
        if (isActive) {
          setError(err.message);
        }
      } finally {
        if (isActive) {
          setIsLoadingConversation(false);
        }
      }
    }

    loadConversation();
    return () => {
      isActive = false;
    };
  }, [refreshConversation, selectedId, simulateBug]);

  useEffect(() => {
    if (!selectedId || !conversation?.is_generating) {
      return undefined;
    }

    let isActive = true;
    const timer = window.setInterval(async () => {
      try {
        if (isActive) {
          await refreshConversation(selectedId);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message);
        }
      }
    }, 1000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [conversation?.is_generating, refreshConversation, selectedId]);

  const handleCreateConversation = async () => {
    try {
      setError("");
      const created = await createConversation();
      const items = await refreshList();
      setSelectedId(created.id);
      if (!items.some((item) => item.id === created.id)) {
        setConversations((current) => [...current, created]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      setError("");
      await deleteConversation(id);
      const items = await refreshList();
      setStreamingDrafts((current) => omitKey(current, id));

      if (selectedIdRef.current === id) {
        const next = items.find((item) => item.id !== id) ?? items[0] ?? null;
        setSelectedId(next?.id ?? null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendMessage = async (content) => {
    const id = selectedIdRef.current;
    if (!id) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setError("");
    setStreamingDrafts((current) => ({ ...current, [id]: "" }));
    setConversations((current) =>
      current.map((item) =>
        item.id === id && item.title === "Cuộc hội thoại mới"
          ? { ...item, title: makeLocalTitle(trimmed) }
          : item,
      ),
    );
    setConversation((current) => {
      if (!current || current.id !== id) {
        return current;
      }
      return {
        ...current,
        title: current.title === "Cuộc hội thoại mới" ? makeLocalTitle(trimmed) : current.title,
        is_generating: true,
        messages: [...current.messages, { role: "user", content: trimmed }],
      };
    });

    try {
      await streamMessage(id, trimmed, simulateBugRef.current, {
        onChunk: (chunk) => {
          setStreamingDrafts((current) => ({
            ...current,
            [id]: `${current[id] ?? ""}${chunk}`,
          }));
        },
        onDone: async () => {
          setStreamingDrafts((current) => omitKey(current, id));
          await refreshList();
          if (selectedIdRef.current === id) {
            await refreshConversation(id);
          }
        },
        onError: (message, data = {}) => {
          const detail = [data.type, message, data.cause, data.hint]
            .filter(Boolean)
            .join(" | ");
          setError(detail || message);
          setStreamingDrafts((current) => omitKey(current, id));
          refreshConversation(id);
        },
      });
    } catch (err) {
      setStreamingDrafts((current) => omitKey(current, id));
      setError(err.message);
      await refreshConversation(id);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        selectedId={selectedId}
        onCreate={handleCreateConversation}
        onDelete={handleDeleteConversation}
        onSelect={setSelectedId}
      />

      <main className="main-panel">
        <header className="top-bar">
          <div>
            <p className="eyebrow">DEMO</p>
            <h1>Chat Lab</h1>
          </div>
          <BugToggle checked={simulateBug} onChange={setSimulateBug} />
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <ChatWindow
          conversation={conversation}
          isLoading={isLoadingConversation}
          streamingText={selectedId ? streamingDrafts[selectedId] : ""}
          onSend={handleSendMessage}
          onCreateConversation={handleCreateConversation}
        />
      </main>
    </div>
  );
}
