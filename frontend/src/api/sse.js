export function parseSseFrame(frame) {
  const lines = frame.split(/\r?\n/);
  let event = "message";
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const rawData = dataLines.join("\n");
  return {
    event,
    data: rawData ? JSON.parse(rawData) : {},
  };
}

export function createSseConsumer(handlers = {}) {
  let buffer = "";

  function dispatch(frame) {
    if (!frame.trim()) {
      return;
    }

    try {
      const { event, data } = parseSseFrame(frame);
      if (event === "chunk") {
        handlers.onChunk?.(data.content ?? "");
      } else if (event === "done") {
        handlers.onDone?.(data.content ?? "");
      } else if (event === "error") {
        handlers.onError?.(data.message ?? "Unknown streaming error", data);
      } else if (event === "meta") {
        handlers.onMeta?.(data);
      }
    } catch (error) {
      handlers.onError?.("Invalid SSE frame", { cause: error.message });
    }
  }

  return {
    push(text) {
      buffer += text;
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      frames.forEach(dispatch);
    },
    flush() {
      if (buffer.trim()) {
        dispatch(buffer);
      }
      buffer = "";
    },
  };
}

