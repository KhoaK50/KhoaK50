(function () {
  window.App = window.App || {};

  /* ===== Utilities / Debug ===== */
  App.log = function (s) {
    console.log(s);
    const el = document.getElementById("logOut");
    if (!el) return;
    el.innerText = (el.innerText === "—" ? "" : el.innerText + "\n") + String(s);
  };

  App.pingBackend = async function () {
    try {
      const r = await fetch(`${App.API_BASE}/api/health`, { mode: "cors" });
      const j = await r.json();
      App.log(`Backend OK (${App.API_BASE}) — health: ${JSON.stringify(j)}`);
    } catch (e) {
      App.log(`Không gọi được /api/health — ${e}`);
      alert("Không kết nối được backend local. Hãy chạy Flask ở 127.0.0.1:5000.");
    }
  };

  App.callAPI = async function (op, payload) {
    const url = `${App.API_BASE}/api/${op}`;
    let res;

    try {
      res = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (netErr) {
      throw new Error(`Network error calling ${op}: ${netErr.message}`);
    }

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`API ${op} failed: HTTP ${res.status} ${t}`);
    }
    return await res.json();
  };
})();
