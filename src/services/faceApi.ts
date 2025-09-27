const FACE_API_BASE = import.meta.env.VITE_FACE_API_URL || "http://localhost:8001";

export default {
  async recognizeFace(imageData) {
    const res = await fetch(`${FACE_API_BASE}/api/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData }),
    });
    if (!res.ok) throw new Error("Recognition failed");
    return res.json();
  },
  async registerCapture(studentCode, name, imageData) {
    const res = await fetch(`${FACE_API_BASE}/api/register-capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentCode, name, imageData }),
    });
    if (!res.ok) throw new Error("Register failed");
    return res.json();
  },
  async reloadEncodings() {
    const res = await fetch(`${FACE_API_BASE}/api/reload`, { method: "POST" });
    if (!res.ok) throw new Error("Reload failed");
    return res.json();
  },
};