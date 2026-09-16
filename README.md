# Chat Lab

Chat Lab là demo full-stack mô phỏng lỗi **generation state leak** giữa nhiều conversation, sau đó cho bật/tắt giữa hai chế độ:

- `Before (Bug)`: cố tình dùng generation state global để tái hiện bug.
- `After (Fixed)`: dùng generation state riêng theo từng conversation.

## Tech stack

- Backend: Python FastAPI
- Frontend: ReactJS + Vite + Axios
- Streaming: Server-Sent Events qua Axios `onDownloadProgress`
- Store: in-memory `dict[str, Conversation]`, không dùng database
- LLM: Groq API

## Project structure

```text
backend/
  main.py
  models.py
  store.py
  llm.py
  .env.example

frontend/
  src/
    App.jsx
    api/
      client.js
      conversations.js
      sse.js
      index.js
    components/
      Sidebar.jsx
      ChatWindow.jsx
      BugToggle.jsx
  .env.example
```

## How to run it

### 1. Requirements

Cài sẵn:

- Python 3.10+
- Node.js 18+
- npm
- Groq API key

Nếu chưa có Groq API key: vào `https://console.groq.com` -> `API Keys`.

### 2. Backend setup

Vào thư mục backend:

```bash
cd backend
```

Cài dependencies:

```bash
pip install fastapi uvicorn groq python-dotenv
```

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Mở `backend/.env` và điền:

```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
CORS_ALLOWED_ORIGINS=http://localhost:5000,http://127.0.0.1:5000
CORS_ALLOW_ORIGIN_REGEX=http://(localhost|127\.0\.0\.1):\d+
```

Chạy backend ở port `9001`:

```bash
uvicorn main:app --host 127.0.0.1 --port 9001
```

Backend URL:

```text
http://127.0.0.1:9001
```

Kiểm tra backend:

```bash
curl http://127.0.0.1:9001/conversations
```

Kết quả đúng ban đầu thường là:

```json
[]
```

### 3. Frontend setup

Mở terminal mới, vào thư mục frontend:

```bash
cd frontend
```

Cài dependencies:

```bash
npm install
```

Tạo file `.env.local` từ file mẫu:

```bash
copy .env.example .env.local
```

Trên macOS/Linux:

```bash
cp .env.example .env.local
```

Nội dung `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:9001
```

Chạy frontend ở port `5000`:

```bash
npm run dev -- --host 127.0.0.1 --port 5000
```

Frontend URL:

```text
http://127.0.0.1:5000
```

## How to test the bug/fix

### Test bug mode

1. Mở `http://127.0.0.1:5000`.
2. Tạo ít nhất 2 conversation trong sidebar.
3. Bật toggle sang `Before (Bug)`.
4. Mở conversation A.
5. Gửi một tin nhắn để bắt đầu streaming.
6. Trong lúc A đang trả lời, bấm sang conversation B.
7. Quan sát: B cũng hiện `Đang trả lời...` và input bị disable dù B chưa gửi gì.

Đây là bug state leak.

### Test fixed mode

1. Tắt toggle về `After (Fixed)`.
2. Mở conversation A.
3. Gửi một tin nhắn.
4. Trong lúc A đang stream, chuyển sang conversation B.
5. Quan sát: B vẫn bình thường, input không bị disable.

Đây là behavior đúng.

## Main API endpoints

```text
POST   /conversations
GET    /conversations
GET    /conversations/{id}
DELETE /conversations/{id}
POST   /conversations/{id}/messages?simulate_bug=true|false
```



