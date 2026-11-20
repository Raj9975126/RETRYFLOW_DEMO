# ⚡ RetryFlow — Live Demo

A live interactive demo showcasing the **RetryFlow** NPM package — a lightweight, zero-dependency retry engine for JavaScript & Node.js.

## 🚀 Live Demo

👉 **[View Live Demo](https://retryflow-demo.onrender.com)**

## 📦 What is RetryFlow?

RetryFlow is a retry utility that makes async operations resilient:

- 🔄 Configurable retry attempts
- 📈 Exponential & fixed backoff strategies
- ⏱️ Per-attempt & overall timeout
- 🛑 Cancellation via AbortController
- 🌐 HTTP status-aware retry (429, 500, 502, 503, 504)
- 📦 Zero dependencies, ESM + CJS support

## 🎮 Demo Features

| Demo | Description |
|------|-------------|
| **Basic Retry** | Simulates a flaky function with configurable retries and backoff |
| **HTTP Fetch** | Real API call to JSONPlaceholder with retry protection |
| **Timeout** | Per-attempt timeout handling (1s limit on 3s operations) |
| **All Fail** | Shows RetryError when all retries are exhausted |
| **Backoff Visualizer** | Interactive chart showing delay calculations |

## 🛠️ Run Locally

```bash
git clone https://github.com/Raj9975126/RETRYFLOW_DEMO.git
cd RETRYFLOW_DEMO
npm install
npm start
```

Open **http://localhost:3000** in your browser.

## 📁 Project Structure

```
retryflow-demo/
├── server.js          # Express server with API endpoints
├── lib/
│   ├── retryflow.js   # RetryFlow core (retry, sleep, etc.)
│   ├── backoff.js     # calculateDelay() function
│   ├── timeout.js     # withTimeout, createDeadlineController
│   └── errors.js      # RetryError, TimeoutError, AbortError
├── public/
│   └── index.html     # Frontend UI with interactive demos
├── package.json
└── README.md
```

## 👨‍💻 Author

**Rajkumar**

## 📄 License

MIT
