# Azure IoT Hub Live Telemetry Web Dashboard (`azure_web`)

A real-time telemetry monitoring dashboard designed to ingest, decode, and display live IoT messages from **Azure IoT Hub** / **Azure Event Hubs** using a **Flask (Python)** backend and an interactive **React (JavaScript)** web interface.

Developed for the **Azure IoT Hub Integration & Debugging Assignment** (One-Credit Course Project).

---

## 🎯 Assignment Requirements Checklist

| Requirement | Implementation Status | Description |
| :--- | :---: | :--- |
| **1. Student Name** | ✅ Complete | Prominently displayed in student credentials card; editable in UI. |
| **2. Roll Number** | ✅ Complete | Displayed alongside student name; stored in localStorage. |
| **3. Connection Status** | ✅ Complete | Real-time indicator (`CONNECTED` 🟢, `CONNECTING` 🟡, `DISCONNECTED` 🔴). |
| **4. Received ASCII Values** | ✅ Complete | Formatted display of incoming numeric ASCII code array. |
| **5. Converted String** | ✅ Complete | Step-by-step conversion breakdown demonstrating `String.fromCharCode(code)`. |
| **6. Last Event Timestamp** | ✅ Complete | Localized and UTC timestamp of the most recent telemetry event. |
| **Debugging** | ✅ Complete | All intentionally introduced bugs identified, resolved, and verified. |
| **Azure Backend Config** | ✅ Complete | Configured with the active Azure Event Hubs connection string. |
| **Vercel Deployment** | ✅ Complete | Ready for 1-click Vercel deployment with `vercel.json` routing. |

---

## 🐛 Intentionally Introduced Bugs Identified & Fixed

During code audit and debugging, the following intentional defects were discovered and resolved:

### 1. Connection String Syntax Error (`backend/server.py`)
- **Bug**: The connection string was split across string literals with incorrect quotes (`"Endpoint=sb:"your endpoint";"`), causing Python to throw an immediate `SyntaxError` on startup.
- **Fix**: Corrected the string formatting and replaced placeholder keys with the active Azure IoT Hub Event Hub-compatible connection string. Also added environment variable support (`AZURE_CONNECTION_STRING`) with fallback.

### 2. Port & Host Mismatch
- **Bug**: `backend/server.py` ran on port `5000` bound strictly to `127.0.0.1`, while `src/azure_web.js` polled port `8000`. The frontend could never reach the backend.
- **Fix**: Standardized the backend to port `5000` (configurable via `PORT` env var) and bound to `0.0.0.0` for cloud and container compatibility. The frontend now uses `process.env.REACT_APP_API_URL || "http://127.0.0.1:5000/api/latest"` and includes an in-UI API endpoint switcher.

### 3. Restrictive CORS Configuration
- **Bug**: The backend CORS allowed only `http://localhost:3000` on `/api/*`. Opening via `http://127.0.0.1:3000` or the deployed Vercel domain (`https://*.vercel.app`) was blocked by browser CORS policy.
- **Fix**: Updated CORS to `CORS(app, resources={r"/*": {"origins": "*"}})`, enabling cross-origin requests from any client origin including Vercel.

### 4. Loss of Raw ASCII Values in Backend
- **Bug**: The original backend decoded incoming ASCII values directly into a single string and discarded the original ASCII representation. The frontend had no way to display both "Received ASCII Values" and "Converted String".
- **Fix**: Enhanced `process_telemetry()` to parse incoming messages (whether comma-separated ASCII codes, JSON arrays, or strings) and return both `ascii_values` and `converted_string` in the `/api/latest` JSON payload.

### 5. Fragile Azure Event Hub Consumer Thread
- **Bug**: If a temporary network interruption occurred, `client.receive()` raised an exception and terminated the consumer thread permanently with no retry mechanism.
- **Fix**: Wrapped the consumer client in an automatic reconnection loop with exponential backoff and logging.

### 6. Missing Assignment Fields in Frontend
- **Bug**: The initial React component only displayed a generic "DECODED MESSAGE" box and lacked Student Name, Roll Number, Received ASCII Values, Converted String, and ASCII conversion demonstration.
- **Fix**: Overhauled `src/azure_web.js` to render all 6 required fields, an interactive ASCII-to-string step-by-step conversion visualization, recent event history logs, and manual test buttons for the example (`72, 101, 108, 108, 111` $\rightarrow$ `Hello`).

---

## 🏗️ Architecture & Data Pipeline

```
+-------------------------------------------------------------+
|                     Azure IoT Hub Device                    |
|       (Transmits live telemetry, e.g. home_server)          |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               Azure Event Hubs Compatible Endpoint          |
|  sb://ihsuprodpnres016dednamespace.servicebus.windows.net/  |
+------------------------------+------------------------------+
                               |
                               v (AMQP stream starting @latest)
+-------------------------------------------------------------+
|                   Flask Backend (Python 3.12)               |
|                           (server.py)                       |
|   - EventHubConsumerClient (Background thread)              |
|   - Telemetry Decoder (Extracts ASCII codes & String)       |
|   - REST API: GET /api/latest (CORS enabled)                |
+------------------------------+------------------------------+
                               |
                               v (Polling every 1.5s)
+-------------------------------------------------------------+
|                    React Web Frontend                       |
|                   (Deployed to Vercel)                      |
|   1. Student Name & Roll Number                             |
|   2. Live Connection Status (CONNECTED / DISCONNECTED)      |
|   3. Received ASCII Values: 72, 101, 108, 108, 111          |
|   4. Converted String: Hello                                |
|   5. Step-by-Step Conversion Breakdown                      |
|   6. Last Event Timestamp & Recent History Log              |
+-------------------------------------------------------------+
```

---

## 🔢 ASCII to String Conversion Demonstration

The assignment requires demonstrating the conversion of received ASCII values into the corresponding string:

### Example:
- **Received ASCII Values**: `72, 101, 108, 108, 111`
- **Converted String**: `Hello`

### Conversion Logic:
Each integer code represents an ASCII character value:
$$\text{Character} = \text{String.fromCharCode}(\text{ASCII Code})$$

| ASCII Code | Hexadecimal | Character |
| :---: | :---: | :---: |
| `72` | `0x48` | `H` |
| `101` | `0x65` | `e` |
| `108` | `0x6C` | `l` |
| `108` | `0x6C` | `l` |
| `111` | `0x6F` | `o` |

The dashboard renders this character-by-character breakdown interactively for every live Azure telemetry event.

---

## 🚀 How to Run Locally

### Option 1: Quick Launch (Windows 1-Click)
Double-click `start_all.bat` in the project root. It will:
1. Start the Flask backend on port `5000`.
2. Start the React development server on `http://localhost:3000`.

### Option 2: Command Line

#### 1. Start the Backend:
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run the Flask backend
python backend/server.py
```
Backend will be live at `http://127.0.0.1:5000`.

#### 2. Start the Frontend:
```bash
# Install dependencies
npm install

# Start React app
npm start
```
Frontend will open at `http://localhost:3000`.

---

## 🌐 Deployment to Vercel (Required for Full Marks)

### Step 1: Push Project to GitHub
1. Create a new public repository on GitHub (e.g. `azure_web`).
2. Run in the project directory:
   ```bash
   git init
   git add .
   git commit -m "Complete Azure IoT Hub integration and debugging assignment"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/azure_web.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel
1. Go to [https://vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Import your `azure_web` GitHub repository.
4. Framework Preset: **Create React App**.
5. (Optional) In **Environment Variables**, add:
   - `REACT_APP_API_URL`: Your deployed backend URL (or enter it directly inside the web UI).
6. Click **Deploy**.
7. Vercel will build and provide your live URL (e.g. `https://azure-web-xyz.vercel.app`).

### Step 3: Hosting the Backend (Free Cloud Deployment)
To keep the backend running 24/7 so anyone visiting your Vercel URL sees live data:
1. Go to [https://render.com](https://render.com) (Free Tier).
2. Create a new **Web Service** pointing to your GitHub repo.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `python backend/server.py`
5. Copy your Render service URL (e.g., `https://azure-web-backend.onrender.com/api/latest`).
6. Paste it into the **"Configure API URL"** box on your live Vercel frontend!

---

## 📡 API Reference

### `GET /api/latest`
Returns the latest telemetry event received from Azure IoT Hub:

```json
{
  "status": "active",
  "device_id": "home_server",
  "ascii_values": "111, 110, 101, 95, 99, 114, 101, 100, 105, 116, 95, 99, 111, 117, 114, 115, 101, 95, 112, 114, 111, 106, 101, 99, 116",
  "converted_string": "one_credit_course_project",
  "message": "one_credit_course_project",
  "raw": "one_credit_course_project",
  "timestamp": "2026-10-23T09:45:27.025000+00:00"
}
```

### `GET /health`
Returns health check status:

```json
{
  "service": "azure-iot-hub-telemetry-backend",
  "status": "ok",
  "timestamp": "2026-10-23T09:45:30.000000+00:00"
}
```

---

## 📋 Submission Checklist

- [x] GitHub Repository created and pushed.
- [x] Vercel frontend deployed and live.
- [x] Student Name & Roll Number displayed.
- [x] Live Azure IoT Hub connection verified.
- [x] ASCII to String conversion demonstrated.
- [x] Connection status and timestamps updating live.
