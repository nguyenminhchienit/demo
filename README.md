# Chat Lab

Prototype này được build lại thành app full-stack:

- Backend: Python FastAPI
- Frontend: ReactJS + Vite + Axios
- Giao tiếp: REST API + Server-Sent Events streaming qua `fetch` + `ReadableStream`
- Store: in-memory `dict[str, Conversation]`, không dùng database

## Cài đặt

Backend:

```bash
cd backend
pip install fastapi uvicorn groq python-dotenv
uvicorn main:app --reload --host 127.0.0.1 --port 9001
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5000
```

Mở Vite URL: `http://127.0.0.1:5000`. Frontend mặc định gọi backend tại `http://127.0.0.1:9001`.

## Groq API key

File `backend/.env` đã được tạo sẵn với placeholder:

```bash
GROQ_API_KEY=xxx
GROQ_MODEL=openai/gpt-oss-120b
```

Bạn tự thay `GROQ_API_KEY` bằng key thật. Nếu chưa có key: vào `console.groq.com` -> `API Keys`.

`llama-3.3-70b-versatile` đã bị Groq đánh dấu deprecated cho free/developer tier, nên app mặc định dùng `openai/gpt-oss-120b`. Nếu tài khoản của bạn vẫn có quyền dùng Llama enterprise, đổi `GROQ_MODEL=llama-3.3-70b-versatile`.

## Cách test bug/fix

1. Chạy backend và frontend.
2. Tạo ít nhất 2 conversation trong sidebar.
3. Bật toggle `Before (Bug)`.
4. Mở conversation A, gửi 1 tin nhắn để bắt đầu stream.
5. Trong lúc A đang stream, mở conversation B.
6. Quan sát: B cũng hiện `Đang trả lời...` và input bị disable dù B chưa gửi gì.
7. Tắt toggle về `After (Fixed)`.
8. Lặp lại bước 4-5.
9. Quan sát: B vẫn bình thường, input không bị disable.

## Nguyên nhân bug

Ở bug mode, backend cố tình dùng biến module-level:

```python
IS_GENERATING_GLOBAL = False
```

Khi conversation A đang generate, `IS_GENERATING_GLOBAL=True`. Mọi request `GET /conversations/{id}?simulate_bug=true` đều đọc cùng flag này, nên conversation B bị hiểu nhầm là cũng đang generate.

Ở fixed mode, backend dùng đúng state riêng của từng conversation:

```python
conversation.is_generating = True
```

Vì `is_generating` nằm trong object `Conversation` theo từng `id`, conversation A stream không làm leak state sang conversation B. Client cũng không gửi lại toàn bộ `messages[]`; nó chỉ gửi `content` mới, còn server là nguồn sự thật.
