import json
import os
import threading
import time
from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_cors import CORS
from azure.eventhub import EventHubConsumerClient

app = Flask(__name__)

# Enable CORS for all routes and origins (allowing localhost, 127.0.0.1, and Vercel deployments)
CORS(app, resources={r"/*": {"origins": "*"}})

# Azure IoT Hub / Event Hub Endpoint
CONNECTION_STRING = os.environ.get(
    "AZURE_CONNECTION_STRING",
    "Endpoint=sb://ihsuprodpnres016dednamespace.servicebus.windows.net/;"
    "SharedAccessKeyName=iothubowner;"
    "SharedAccessKey=+mk2+0LDW4D+i/WE1G6/9sP41m5kWJAexAIoTObd5kE=;"
    "EntityPath=iothub-ehub-bharathiot-56245052-1173f97b8c"
)

CONSUMER_GROUP = os.environ.get("CONSUMER_GROUP", "$default")

latest = {
    "status": "waiting",
    "raw": "",
    "ascii_values": "Waiting for telemetry...",
    "converted_string": "Waiting for telemetry...",
    "message": "Waiting for telemetry...",
    "timestamp": None,
    "device_id": None,
}
data_lock = threading.Lock()


def process_telemetry(raw):
    """
    Decodes received telemetry payload and extracts:
    1. ascii_values: comma-separated list of ASCII integers (e.g. 72, 101, 108, 108, 111)
    2. converted_string: corresponding decoded ASCII string (e.g. Hello)
    """
    text = raw.decode("utf-8", errors="replace") if isinstance(raw, bytes) else str(raw)
    text = text.strip()

    # Case 1: JSON array of ASCII integer codes: [72, 101, 108, 108, 111] -> "Hello"
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list) and all(
            isinstance(x, int) and 0 <= x <= 255 for x in parsed
        ):
            ascii_str = ", ".join(str(x) for x in parsed)
            converted = "".join(chr(x) for x in parsed)
            return ascii_str, converted
    except (json.JSONDecodeError, TypeError):
        pass

    # Case 2: Comma-separated ASCII integers: "72, 101, 108, 108, 111" -> "Hello"
    parts = text.split(",")
    if len(parts) > 1:
        try:
            codes = [int(x.strip()) for x in parts]
            if all(0 <= x <= 255 for x in codes):
                ascii_str = ", ".join(str(x) for x in codes)
                converted = "".join(chr(x) for x in codes)
                return ascii_str, converted
        except ValueError:
            pass

    # Case 3: Single integer ASCII code: "65" -> "A"
    if text.isdigit() and 0 <= int(text) <= 255:
        code = int(text)
        return str(code), chr(code)

    # Case 4: Plain text / UTF-8 string: "one_credit_course_project"
    # Provide the ASCII numeric codes representation and the plain string
    ascii_str = ", ".join(str(ord(c)) for c in text)
    converted = text
    return ascii_str, converted


def receive_events():
    while True:
        try:
            print("Connecting to Azure Event Hubs...", flush=True)
            client = EventHubConsumerClient.from_connection_string(
                conn_str=CONNECTION_STRING,
                consumer_group=CONSUMER_GROUP,
            )

            def on_event(partition_context, event):
                if event is None:
                    return

                try:
                    raw = event.body_as_str(encoding="UTF-8")
                except Exception:
                    raw = str(event.body)

                ascii_vals, converted = process_telemetry(raw)
                timestamp = (
                    event.enqueued_time.isoformat()
                    if event.enqueued_time
                    else datetime.now(timezone.utc).isoformat()
                )

                # Extract device ID if available
                device_id = None
                if event.system_properties:
                    device_id = (
                        event.system_properties.get(b"iothub-connection-device-id")
                        or event.system_properties.get("iothub-connection-device-id")
                    )
                    if isinstance(device_id, bytes):
                        device_id = device_id.decode("utf-8", errors="replace")

                with data_lock:
                    latest["status"] = "active"
                    latest["raw"] = raw
                    latest["ascii_values"] = ascii_vals
                    latest["converted_string"] = converted
                    latest["message"] = converted  # backward compatibility
                    latest["timestamp"] = timestamp
                    latest["device_id"] = device_id

                print(f"[Azure Event] ASCII: {ascii_vals} | Converted: {converted}", flush=True)

            with client:
                client.receive(
                    on_event=on_event,
                    starting_position=os.environ.get("STARTING_POSITION", "-1"),
                )
        except Exception as exc:
            print(f"Azure receiver error: {exc}. Reconnecting in 5 seconds...", flush=True)
            time.sleep(5)


@app.route("/api/latest", methods=["GET"])
def get_latest():
    with data_lock:
        return jsonify(latest.copy())


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "azure-iot-hub-telemetry-backend",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


if __name__ == "__main__":
    receiver_thread = threading.Thread(
        target=receive_events,
        daemon=True,
    )
    receiver_thread.start()

    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Flask server on http://0.0.0.0:{port}...", flush=True)
    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )
