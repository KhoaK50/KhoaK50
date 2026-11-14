(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.ResultCard = mod.ResultCard;
    window.App.SolutionSync = mod.SolutionSync;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function getFmt() {
    if (typeof window !== "undefined" && window.App && window.App.LatexFmt) {
      return window.App.LatexFmt;
    }
    if (typeof require === "function") {
      try {
        return require("../../utils/latex_format.js");
      } catch (_) {}
    }
    return null;
  }

  function esc(s) {
    const fmt = getFmt();
    if (fmt && typeof fmt.escapeHtml === "function") return fmt.escapeHtml(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMathSnippet(latex, displayMode) {
    const fmt = getFmt();
    if (fmt && typeof fmt.renderKatexSafe === "function") {
      return fmt.renderKatexSafe(latex, displayMode, false);
    }
    return displayMode ? "\\[" + latex + "\\]" : "\\(" + latex + "\\)";
  }

  function renderRowsHtml(rows, isSecondary) {
    if (!Array.isArray(rows) || rows.length === 0) return "";
    const rowCls = isSecondary ? "res-card-row res-card-row-sec" : "res-card-row";
    const chunks = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      let inner = "";
      if (row.labelHtml) {
        inner += "<div class=\"res-card-row-label\">" + row.labelHtml + "</div>";
      }
      if (row.latex) {
        const useDisplay = row.displayMode !== false;
        inner += "<div class=\"res-card-math\">" + renderMathSnippet(row.latex, useDisplay) + "</div>";
      }
      if (row.html) {
        inner += "<div class=\"res-card-row-html\">" + row.html + "</div>";
      }
      if (row.noteHtml) {
        inner += "<div class=\"res-card-row-note\">" + row.noteHtml + "</div>";
      }
      if (inner) {
        chunks.push("<div class=\"" + rowCls + "\">" + inner + "</div>");
      }
    }
    return chunks.join("");
  }

  const ResultCard = {
    render: function (options) {
      const opts = options || {};
      const titleLeft = opts.titleLeft || "Kết quả tính toán";
      const tone = opts.badgeTone || "primary";

      let badgeHtml = "";
      if (opts.badgeRightLatex) {
        badgeHtml = "<span class=\"res-card-badge tone-" + esc(tone) + "\">" + renderMathSnippet(opts.badgeRightLatex, false) + "</span>";
      } else if (opts.badgeRight) {
        badgeHtml = "<span class=\"res-card-badge tone-" + esc(tone) + "\">" + opts.badgeRight + "</span>";
      }

      const headerHtml =
        "<div class=\"res-card-header\">" +
          "<span class=\"res-card-title\">" + titleLeft + "</span>" +
          badgeHtml +
        "</div>";

      const primaryRowsHtml = renderRowsHtml(opts.primaryRows || [], false);
      const mainBoxHtml = primaryRowsHtml
        ? "<div class=\"res-card-main\">" + primaryRowsHtml + "</div>"
        : "";

      const sec = opts.secondarySection || (
        (opts.secondaryRows && opts.secondaryRows.length > 0) || opts.secondaryEmptyHtml
          ? {
              titleHtml: opts.secondaryTitle || "",
              rows: opts.secondaryRows || [],
              emptyHtml: opts.secondaryEmptyHtml || ""
            }
          : null
      );

      let secBoxHtml = "";
      if (sec && ((sec.rows && sec.rows.length > 0) || sec.emptyHtml)) {
        const secTitle = sec.titleHtml
          ? "<div class=\"res-card-sec-title\">" + sec.titleHtml + "</div>"
          : "";
        const secBody = (sec.rows && sec.rows.length > 0)
          ? renderRowsHtml(sec.rows, true)
          : "<div class=\"res-card-sec-empty\">" + sec.emptyHtml + "</div>";
        secBoxHtml =
          "<div class=\"res-card-secondary\">" +
            secTitle +
            secBody +
          "</div>";
      }

      const footerHtml = opts.footerHintHtml
        ? "<div class=\"res-card-footer\">" + opts.footerHintHtml + "</div>"
        : "";

      return (
        "<div class=\"res-card\">" +
          headerHtml +
          mainBoxHtml +
          secBoxHtml +
          footerHtml +
        "</div>"
      );
    },

    renderError: function (messageHtml, titleText) {
      const title = titleText || "Chưa đủ dữ liệu đầu vào";
      return (
        "<div class=\"res-card res-card-error\">" +
          "<div class=\"res-card-error-title\">" + title + "</div>" +
          "<div class=\"res-card-error-msg\">" + messageHtml + "</div>" +
        "</div>"
      );
    },

    mount: function (targetElOrId, options) {
      if (typeof document === "undefined") return "";
      const el = typeof targetElOrId === "string" ? document.getElementById(targetElOrId) : targetElOrId;
      const html = ResultCard.render(options);
      if (!el) return html;
      el.style.display = "block";
      el.innerHTML = html;
      const fmt = getFmt();
      if (fmt && typeof fmt.renderMathInContainer === "function") {
        fmt.renderMathInContainer(el);
      }
      return html;
    },

    mountError: function (targetElOrId, messageHtml, titleText) {
      if (typeof document === "undefined") return "";
      const el = typeof targetElOrId === "string" ? document.getElementById(targetElOrId) : targetElOrId;
      const html = ResultCard.renderError(messageHtml, titleText);
      if (!el) return html;
      el.style.display = "block";
      el.innerHTML = html;
      const fmt = getFmt();
      if (fmt && typeof fmt.renderMathInContainer === "function") {
        fmt.renderMathInContainer(el);
      }
      return html;
    }
  };

  // Input Signature Guard Registry
  const registry = Object.create(null);

  function serializeVecItem(it) {
    if (!it) return "null";
    const coords = Array.isArray(it.vec)
      ? it.vec.map(function (n) { return Number(Number(n).toFixed(10)); }).join(",")
      : "";
    const name = (typeof window !== "undefined" && window.App && typeof window.App.getVectorName === "function")
      ? window.App.getVectorName(it)
      : String(it.name || it.id || "");
    return String(it.id) + ":" + name + ":[" + coords + "]:" + String(it.latex || "");
  }

  const SolutionSync = {
    save: function (key, sig, config) {
      if (!key) return;
      registry[key] = {
        sig: String(sig == null ? "" : sig),
        config: config || null,
        savedAt: Date.now()
      };
    },

    clear: function (key) {
      if (!key) return;
      delete registry[key];
    },

    get: function (key, currentSig) {
      const entry = registry[key];
      if (!entry || !entry.config) return null;
      if (currentSig !== undefined && currentSig !== null && entry.sig !== String(currentSig)) {
        return null;
      }
      return entry.config;
    },

    getLatest: function (key) {
      const entry = registry[key];
      return entry ? entry.config : null;
    },

    vectorItemsSig: function (items) {
      if (!Array.isArray(items) || items.length === 0) return "empty";
      return items.map(serializeVecItem).join("|");
    },

    checklistSig: function (checklistId) {
      if (typeof document === "undefined") return "no-dom";
      const box = document.getElementById(checklistId);
      if (!box) return "missing:" + checklistId;
      const checked = Array.prototype.slice.call(box.querySelectorAll("input[type=\"checkbox\"]:checked"));
      if (checked.length === 0) return "none-checked";
      const list = (typeof window !== "undefined" && window.App && Array.isArray(window.App.vectorList))
        ? window.App.vectorList
        : [];
      return checked.map(function (cb) {
        const val = String(cb.value);
        const found = list.find(function (v) { return String(v.id) === val; });
        return found ? serializeVecItem(found) : "id:" + val;
      }).join("|");
    },

    matrixSig: function (mat) {
      if (!Array.isArray(mat)) return "no-mat";
      return mat.map(function (row) {
        if (!Array.isArray(row)) return "";
        return row.map(function (x) { return Number(Number(x).toFixed(10)); }).join(",");
      }).join(";");
    },

    openWithSync: async function (opts, argGetSig, argRecompute, argExtra) {
      const options = (typeof opts === "string")
        ? Object.assign({}, argExtra || {}, {
            key: opts,
            getSig: argGetSig,
            recomputeStatic: argRecompute
          })
        : (opts || {});
      const key = options.key;
      const getSig = options.getSig;
      const recomputeStatic = options.recomputeStatic;
      const emptyTitle = options.emptyTitle || "Lời giải chi tiết";
      const emptyMath = options.emptyMath || "";
      const emptyHintHtml = options.emptyHintHtml || "Vui lòng chọn dữ liệu hợp lệ và thực hiện phép tính để xem lời giải từng bước.";

      const openPanel = function (cfg) {
        if (typeof window !== "undefined" && window.App && typeof window.App.openSolutionPanel === "function") {
          window.App.openSolutionPanel(Object.assign({}, cfg, { autoOpen: true }));
        }
      };

      const currentSig = typeof getSig === "function" ? String(getSig()) : "";
      const existing = SolutionSync.get(key, currentSig);
      if (existing) {
        openPanel(existing);
        return true;
      }

      if (typeof recomputeStatic === "function") {
        let directRet = null;
        try {
          directRet = await Promise.resolve(recomputeStatic());
        } catch (err) {
          console.warn("[SolutionSync] Recompute warning:", err);
        }
        const postSig = typeof getSig === "function" ? String(getSig()) : currentSig;
        const fresh = SolutionSync.get(key, postSig) || (postSig === currentSig ? SolutionSync.getLatest(key) : null);
        if (fresh && registry[key] && registry[key].sig === postSig) {
          openPanel(fresh);
          return true;
        }
        const directModal = directRet && (directRet.modalConfig || (directRet.content1 ? directRet : null));
        if (directModal) {
          openPanel(directModal);
          return true;
        }
      }

      openPanel({
        title: emptyTitle,
        math: emptyMath,
        content1: "<div class=\"sol-empty\">" + emptyHintHtml + "</div>",
        content2: "",
        content2Sub: "",
        showSubTabs: false,
        autoOpen: true
      });
      return false;
    }
  };

  return {
    ResultCard: ResultCard,
    SolutionSync: SolutionSync
  };
});
