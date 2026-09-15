import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9001";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function detailToMessage(detail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.msg) {
          return item.msg;
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.message ?? JSON.stringify(detail);
  }

  return null;
}

export function normalizeApiError(error) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const responseData = error.response?.data;
  const message =
    detailToMessage(responseData?.detail) ??
    detailToMessage(responseData?.message) ??
    error.message ??
    "API request failed";

  return new Error(message);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);

