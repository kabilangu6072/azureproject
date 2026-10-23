import React, { useEffect, useState, useMemo } from "react";

// Default API URL fallback - checks environment variable first, then relative /api/latest (for Vercel serverless), then local Flask backend
const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:5000/api/latest";

/**
 * Utility: Converts comma-separated ASCII codes or numbers into string.
 * Demonstrates: 72, 101, 108, 108, 111 -> "Hello"
 */
export function convertAsciiToString(asciiInput) {
  if (!asciiInput) return "";
  const parts = String(asciiInput)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const decodedChars = [];
  for (const part of parts) {
    const code = parseInt(part, 10);
    if (!isNaN(code) && code >= 0 && code <= 255) {
      decodedChars.push(String.fromCharCode(code));
    }
  }
  return decodedChars.join("");
}

/**
 * Utility: Converts plain text into comma-separated ASCII codes.
 * Demonstrates: "Hello" -> "72, 101, 108, 108, 111"
 */
export function convertStringToAscii(textInput) {
  if (!textInput) return "";
  return Array.from(String(textInput))
    .map((c) => c.charCodeAt(0))
    .join(", ");
}

export default function AzureWeb() {
  // 1. Student Name & 2. Roll Number (editable with persistent local storage)
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem("azure_student_name") || "Student Name";
  });
  const [rollNumber, setRollNumber] = useState(() => {
    return localStorage.getItem("azure_roll_number") || "ROLL-123456";
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // 3. Connection Status: CONNECTED, CONNECTING, or DISCONNECTED
  const [status, setStatus] = useState("CONNECTING");

  // 4. Received ASCII Values
  const [receivedAscii, setReceivedAscii] = useState("Waiting for telemetry...");
  // 5. Converted String
  const [convertedString, setConvertedString] = useState("Waiting for telemetry...");
  // 6. Last Event Timestamp
  const [timestamp, setTimestamp] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  // Telemetry History Log
  const [history, setHistory] = useState([]);

  // Configurable Backend API URL
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem("azure_api_url") || DEFAULT_API_URL;
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiUrl);

  // Step-by-step conversion breakdown for demonstration
  const conversionBreakdown = useMemo(() => {
    if (!receivedAscii || receivedAscii.includes("Waiting")) return [];
    const parts = String(receivedAscii)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return parts.slice(0, 16).map((part) => {
      const code = parseInt(part, 10);
      const char = !isNaN(code) && code >= 0 ? String.fromCharCode(code) : "?";
      return {
        code,
        char: char === " " ? "␣" : char,
        hex: !isNaN(code) ? "0x" + code.toString(16).toUpperCase() : "--",
      };
    });
  }, [receivedAscii]);

  // Save student info changes
  const saveProfile = (name, roll) => {
    setStudentName(name);
    setRollNumber(roll);
    localStorage.setItem("azure_student_name", name);
    localStorage.setItem("azure_roll_number", roll);
    setIsEditingProfile(false);
  };

  // Save API URL
  const saveApiUrl = (newUrl) => {
    setApiUrl(newUrl);
    localStorage.setItem("azure_api_url", newUrl);
    setIsEditingUrl(false);
  };

  // Poll backend for latest telemetry
  useEffect(() => {
    let active = true;

    async function fetchTelemetry() {
      try {
        const response = await fetch(apiUrl, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (active) {
          setStatus("CONNECTED");

          const raw = data.raw ?? data.message ?? "";

          // Extract ASCII values and converted string
          let asciiVal = data.ascii_values;
          let converted = data.converted_string ?? data.message;

          // If backend didn't compute ascii_values, compute client-side
          if (!asciiVal) {
            if (/^[\d\s,]+$/.test(raw)) {
              asciiVal = raw;
              converted = convertAsciiToString(raw);
            } else if (raw) {
              asciiVal = convertStringToAscii(raw);
              converted = raw;
            } else {
              asciiVal = "No data";
              converted = "No data";
            }
          }

          setReceivedAscii(asciiVal);
          setConvertedString(converted);

          if (data.timestamp) {
            setTimestamp(data.timestamp);
          }
          if (data.device_id) {
            setDeviceId(data.device_id);
          }

          // Append to live history if unique timestamp
          if (data.timestamp) {
            setHistory((prev) => {
              if (prev.length > 0 && prev[0].timestamp === data.timestamp) {
                return prev;
              }
              const newEntry = {
                timestamp: data.timestamp,
                ascii: asciiVal,
                converted: converted,
                device: data.device_id || "IoT Device",
              };
              return [newEntry, ...prev.slice(0, 9)];
            });
          }
        }
      } catch (err) {
        if (active) {
          setStatus("DISCONNECTED");
        }
      }
    }

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [apiUrl]);

  // Demo sample loader for testing ASCII conversion
  const loadDemoAscii = (sample) => {
    let asciiSample = "72, 101, 108, 108, 111";
    if (sample === "iot") asciiSample = "65, 122, 117, 114, 101, 32, 73, 111, 84";
    if (sample === "assignment") asciiSample = "79, 110, 101, 32, 67, 114, 101, 100, 105, 116";

    const converted = convertAsciiToString(asciiSample);
    setReceivedAscii(asciiSample);
    setConvertedString(converted);
    setTimestamp(new Date().toISOString());
    setDeviceId("simulated_test");
  };

  const statusColor =
    status === "CONNECTED"
      ? "#10b981"
      : status === "CONNECTING"
      ? "#f59e0b"
      : "#ef4444";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* Header Section */}
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <div style={styles.badge}>Azure IoT Hub Live Telemetry</div>
            <div style={{ ...styles.statusBadge, borderColor: statusColor, color: statusColor }}>
              <span style={{ ...styles.statusDot, backgroundColor: statusColor }} />
              {status}
            </div>
          </div>
          <h1 style={styles.title}>IoT Hub Telemetry Monitor</h1>
          <p style={styles.subtitle}>
            One-Credit Course Project &bull; Azure Event Hub Integration &amp; Real-Time Decoder
          </p>
        </header>

        {/* Student Metadata Card (Requirements 1 & 2) */}
        <section style={styles.studentCard}>
          <div style={styles.cardHeader}>
            <span style={styles.sectionLabel}>STUDENT CREDENTIALS</span>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              style={styles.actionBtn}
            >
              {isEditingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {isEditingProfile ? (
            <div style={styles.editRow}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Student Name:</label>
                <input
                  type="text"
                  defaultValue={studentName}
                  id="studentNameInput"
                  style={styles.textInput}
                  placeholder="Enter Student Name"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Roll Number:</label>
                <input
                  type="text"
                  defaultValue={rollNumber}
                  id="rollNumberInput"
                  style={styles.textInput}
                  placeholder="Enter Roll Number"
                />
              </div>
              <button
                onClick={() => {
                  const name = document.getElementById("studentNameInput").value;
                  const roll = document.getElementById("rollNumberInput").value;
                  saveProfile(name, roll);
                }}
                style={styles.saveBtn}
              >
                Save
              </button>
            </div>
          ) : (
            <div style={styles.studentDetailsGrid}>
              <div style={styles.detailBox}>
                <span style={styles.detailTitle}>1. STUDENT NAME</span>
                <span style={styles.detailValueName}>{studentName}</span>
              </div>
              <div style={styles.detailBox}>
                <span style={styles.detailTitle}>2. ROLL NUMBER</span>
                <span style={styles.detailValueRoll}>{rollNumber}</span>
              </div>
              <div style={styles.detailBox}>
                <span style={styles.detailTitle}>3. CONNECTION STATUS</span>
                <span style={{ ...styles.detailValueStatus, color: statusColor }}>
                  <span style={{ ...styles.inlineDot, backgroundColor: statusColor }} />
                  {status}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Telemetry Display Section (Requirements 4, 5, 6) */}
        <section style={styles.telemetryPanel}>
          {/* Panel Top Meta */}
          <div style={styles.panelMetaRow}>
            <div style={styles.metaCol}>
              <span style={styles.sectionLabel}>DEVICE ID</span>
              <span style={styles.metaValue}>{deviceId || "home_server"}</span>
            </div>
            <div style={styles.metaCol}>
              <span style={styles.sectionLabel}>6. LAST EVENT TIMESTAMP</span>
              <span style={styles.metaValueHighlight}>
                {timestamp ? new Date(timestamp).toLocaleString() : "Waiting for Azure..."}
              </span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* 4. Received ASCII Values */}
          <div style={styles.dataBlock}>
            <div style={styles.blockHeader}>
              <span style={styles.dataLabel}>4. RECEIVED ASCII VALUES</span>
              <span style={styles.dataTag}>RAW INPUT CODES</span>
            </div>
            <div style={styles.codeContainer}>
              <code style={styles.codeText}>{receivedAscii}</code>
            </div>
          </div>

          {/* Demonstration of ASCII to String Conversion (Assignment Requirement) */}
          <div style={styles.conversionBox}>
            <div style={styles.conversionHeader}>
              <span style={styles.conversionTitle}>
                CONVERSION DEMONSTRATION &bull; <code>String.fromCharCode(code)</code>
              </span>
              <span style={styles.conversionFormula}>
                ASCII Values &rarr; String Characters
              </span>
            </div>

            {conversionBreakdown.length > 0 ? (
              <div style={styles.breakdownGrid}>
                {conversionBreakdown.map((item, idx) => (
                  <div key={idx} style={styles.breakdownItem}>
                    <span style={styles.breakdownCode}>{item.code}</span>
                    <span style={styles.breakdownArrow}>&darr;</span>
                    <span style={styles.breakdownChar}>{item.char}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.breakdownEmpty}>
                Waiting for incoming ASCII values from Azure IoT Hub...
              </div>
            )}
          </div>

          <div style={styles.divider} />

          {/* 5. Converted String */}
          <div style={styles.dataBlock}>
            <div style={styles.blockHeader}>
              <span style={styles.dataLabel}>5. CONVERTED STRING</span>
              <span style={styles.dataTagSuccess}>DECODED OUTPUT</span>
            </div>
            <div style={styles.stringContainer}>
              <div style={styles.stringValue}>{convertedString}</div>
            </div>
          </div>

          {/* Demo Tester Buttons for Manual Verification */}
          <div style={styles.demoSection}>
            <span style={styles.demoLabel}>Test ASCII Conversion Example:</span>
            <button
              onClick={() => loadDemoAscii("hello")}
              style={styles.demoBtn}
              title="72, 101, 108, 108, 111 -> Hello"
            >
              Load Example ("Hello")
            </button>
            <button
              onClick={() => loadDemoAscii("iot")}
              style={styles.demoBtn}
              title="Azure IoT demo"
            >
              Load "Azure IoT"
            </button>
            <button
              onClick={() => loadDemoAscii("assignment")}
              style={styles.demoBtn}
            >
              Load "One Credit"
            </button>
          </div>
        </section>

        {/* Live Event Stream Log */}
        {history.length > 0 && (
          <section style={styles.historyPanel}>
            <h3 style={styles.historyTitle}>Recent Azure Telemetry Events</h3>
            <div style={styles.historyTableWrap}>
              <table style={styles.historyTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Device</th>
                    <th style={styles.th}>ASCII Values</th>
                    <th style={styles.th}>Decoded String</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, i) => (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.tdTime}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={styles.tdDevice}>{item.device}</td>
                      <td style={styles.tdAscii}>{item.ascii}</td>
                      <td style={styles.tdConverted}>{item.converted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Backend Configuration / Vercel Settings Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerRow}>
            <span style={styles.footerInfo}>
              Backend Endpoint: <code>{apiUrl}</code>
            </span>
            <button
              onClick={() => {
                setIsEditingUrl(!isEditingUrl);
                setTempUrl(apiUrl);
              }}
              style={styles.configBtn}
            >
              {isEditingUrl ? "Cancel" : "Configure API URL"}
            </button>
          </div>

          {isEditingUrl && (
            <div style={styles.urlEditRow}>
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="http://127.0.0.1:5000/api/latest or https://your-backend.onrender.com/api/latest"
                style={styles.urlInput}
              />
              <button onClick={() => saveApiUrl(tempUrl)} style={styles.saveBtn}>
                Apply
              </button>
              <button
                onClick={() => saveApiUrl(DEFAULT_API_URL)}
                style={styles.resetBtn}
              >
                Reset Default
              </button>
            </div>
          )}

          <p style={styles.pipelineNote}>
            Data Pipeline: Azure IoT Hub &rarr; Event Hub &rarr; Flask Service (Port 5000) &rarr; React Web Dashboard
          </p>
        </footer>
      </div>
    </main>
  );
}

// Styled with a clean, high-contrast cyber/terminal aesthetic
const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#090d16",
    color: "#e2e8f0",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Fira Code', monospace",
    padding: "32px 16px",
  },
  container: {
    width: "100%",
    maxWidth: "960px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "28px",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "10px",
  },
  badge: {
    backgroundColor: "#1e293b",
    color: "#38bdf8",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 12px",
    borderRadius: "20px",
    border: "1px solid #334155",
    letterSpacing: "0.5px",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: "700",
    padding: "4px 14px",
    borderRadius: "20px",
    border: "1px solid",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  inlineDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    marginRight: "6px",
  },
  title: {
    fontSize: "clamp(26px, 4vw, 38px)",
    fontWeight: "800",
    color: "#ffffff",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "14px",
    margin: 0,
    lineHeight: "1.5",
  },
  studentCard: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  actionBtn: {
    backgroundColor: "#1e293b",
    color: "#38bdf8",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "5px 12px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "600",
  },
  studentDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  detailBox: {
    backgroundColor: "#172033",
    padding: "14px 18px",
    borderRadius: "10px",
    border: "1px solid #23314d",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  detailTitle: {
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "1px",
  },
  detailValueName: {
    color: "#f8fafc",
    fontSize: "18px",
    fontWeight: "700",
  },
  detailValueRoll: {
    color: "#38bdf8",
    fontSize: "18px",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  detailValueStatus: {
    fontSize: "15px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
  },
  editRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "flex-end",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: "1 1 200px",
  },
  inputLabel: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  textInput: {
    backgroundColor: "#172033",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  saveBtn: {
    backgroundColor: "#0284c7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    height: "40px",
  },
  telemetryPanel: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
  },
  panelMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  metaCol: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metaValue: {
    color: "#e2e8f0",
    fontSize: "13px",
    fontFamily: "monospace",
  },
  metaValueHighlight: {
    color: "#38bdf8",
    fontSize: "13px",
    fontWeight: "600",
  },
  divider: {
    height: "1px",
    backgroundColor: "#1e293b",
    margin: "20px 0",
  },
  dataBlock: {
    marginBottom: "20px",
  },
  blockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  dataLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
  },
  dataTag: {
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "600",
  },
  dataTagSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "600",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  codeContainer: {
    backgroundColor: "#070c17",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "16px",
    overflowX: "auto",
  },
  codeText: {
    color: "#38bdf8",
    fontSize: "14px",
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    lineHeight: "1.6",
    wordBreak: "break-all",
  },
  conversionBox: {
    backgroundColor: "#0b1220",
    border: "1px dashed #2a3a55",
    borderRadius: "10px",
    padding: "16px",
    margin: "18px 0",
  },
  conversionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  conversionTitle: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  conversionFormula: {
    color: "#94a3b8",
    fontSize: "11px",
    fontStyle: "italic",
  },
  breakdownGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  breakdownItem: {
    backgroundColor: "#172033",
    border: "1px solid #23314d",
    borderRadius: "6px",
    padding: "6px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "42px",
  },
  breakdownCode: {
    fontSize: "10px",
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  breakdownArrow: {
    fontSize: "10px",
    color: "#38bdf8",
    lineHeight: "1",
    margin: "2px 0",
  },
  breakdownChar: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#10b981",
    fontFamily: "monospace",
  },
  breakdownEmpty: {
    color: "#64748b",
    fontSize: "12px",
    fontStyle: "italic",
    textAlign: "center",
    padding: "8px",
  },
  stringContainer: {
    backgroundColor: "#070c17",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "20px 16px",
    minHeight: "60px",
    display: "flex",
    alignItems: "center",
  },
  stringValue: {
    color: "#ffffff",
    fontSize: "clamp(20px, 3.5vw, 28px)",
    fontWeight: "700",
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    letterSpacing: "0.5px",
    wordBreak: "break-all",
  },
  demoSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "16px",
    paddingTop: "14px",
    borderTop: "1px solid #172033",
  },
  demoLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },
  demoBtn: {
    backgroundColor: "#172033",
    color: "#94a3b8",
    border: "1px solid #23314d",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "11px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  historyPanel: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px",
  },
  historyTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#cbd5e1",
    margin: "0 0 14px 0",
    letterSpacing: "0.5px",
  },
  historyTableWrap: {
    overflowX: "auto",
  },
  historyTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    textAlign: "left",
  },
  th: {
    color: "#64748b",
    padding: "8px 12px",
    borderBottom: "1px solid #1e293b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  tr: {
    borderBottom: "1px solid #141f33",
  },
  tdTime: {
    padding: "10px 12px",
    color: "#94a3b8",
    whiteSpace: "nowrap",
  },
  tdDevice: {
    padding: "10px 12px",
    color: "#38bdf8",
    fontFamily: "monospace",
  },
  tdAscii: {
    padding: "10px 12px",
    color: "#64748b",
    fontFamily: "monospace",
    maxWidth: "260px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdConverted: {
    padding: "10px 12px",
    color: "#10b981",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  footer: {
    borderTop: "1px solid #1e293b",
    paddingTop: "20px",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "12px",
  },
  footerInfo: {
    fontSize: "12px",
    color: "#64748b",
  },
  configBtn: {
    backgroundColor: "transparent",
    color: "#38bdf8",
    border: "1px solid #23314d",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "11px",
    cursor: "pointer",
  },
  urlEditRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  urlInput: {
    flex: "1 1 300px",
    backgroundColor: "#172033",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "8px 12px",
    color: "#fff",
    fontSize: "12px",
    outline: "none",
  },
  resetBtn: {
    backgroundColor: "#334155",
    color: "#cbd5e1",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    fontSize: "12px",
    cursor: "pointer",
  },
  pipelineNote: {
    textAlign: "center",
    color: "#475569",
    fontSize: "11px",
    margin: "12px 0 0 0",
  },
};
