import { apiClient, normalizeApiError } from "./client";
import { createSseConsumer } from "./sse";

function bugParams(simulateBug) {
  return {
    simulate_bug: simulateBug,
  };
}

function readProgressText(progressEvent) {
  return (
    progressEvent.event?.target?.responseText ??
    progressEvent.event?.currentTarget?.responseText ??
    ""
  );
}

export async function createConversation() {
  const response = await apiClient.post("/conversations");
  return response.data;
}

export async function listConversations() {
  const response = await apiClient.get("/conversations");
  return response.data;
}

export async function getConversation(id, simulateBug) {
  const response = await apiClient.get(`/conversations/${id}`, {
    params: bugParams(simulateBug),
  });
  return response.data;
}

export async function deleteConversation(id) {
  await apiClient.delete(`/conversations/${id}`);
}

export async function streamMessage(id, content, simulateBug, handlers = {}) {
  const sse = createSseConsumer(handlers);
  let consumedLength = 0;

  try {
    const response = await apiClient.post(
      `/conversations/${id}/messages`,
      { content },
      {
        params: bugParams(simulateBug),
        signal: handlers.signal,
        responseType: "text",
        transformResponse: [(data) => data],
        headers: {
          Accept: "text/event-stream",
        },
        onDownloadProgress: (progressEvent) => {
          const responseText = readProgressText(progressEvent);
          const nextChunk = responseText.slice(consumedLength);
          consumedLength = responseText.length;

          if (nextChunk) {
            sse.push(nextChunk);
          }
        },
      },
    );

    const responseText = typeof response.data === "string" ? response.data : "";
    const finalChunk = responseText.slice(consumedLength);
    if (finalChunk) {
      sse.push(finalChunk);
    }
    sse.flush();
  } catch (error) {
    throw normalizeApiError(error);
  }
}

