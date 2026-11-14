// =========================================================================
// topic4_euclidean_spaces.js - Module Chu De 4: Khong Gian Euclide
// Khao sat su truc giao, Thuat toan Gram - Schmidt va Phan ra QR
// Tuan thu Zero Em-dash, chuan muc Anti-Slop, UMD Node/Browser.
// =========================================================================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Topic4GS = mod;
    window.App.Topic4Module = mod.Topic4Module;
    window.App.computeGSFromItems = mod.computeGSFromItems;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SYNC_KEY = "topic4_gs";

  function getFmt() {
    if (typeof window !== "undefined" && window.App && window.App.LatexFmt) {
      return window.App.LatexFmt;
    }
    if (typeof require === "function") {
      try {
        return require("../../../utils/latex_format.js");
      } catch (_) {}
    }
    return null;
  }

  function getResultCardApi() {
    if (typeof window !== "undefined" && window.App && window.App.ResultCard) {
      return {
        ResultCard: window.App.ResultCard,
        SolutionSync: window.App.SolutionSync
      };
    }
    if (typeof require === "function") {
      try {
        return require("../../ui/result_card_renderer.js");
      } catch (_) {}
    }
    return { ResultCard: null, SolutionSync: null };
  }

  function snap(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    if (Math.abs(n) <= 1e-10) return 0;
    const r = Math.round(n);
    if (Math.abs(n - r) <= 1e-10) return r === 0 ? 0 : r;
    return n;
  }

  function toDimVec(raw, dim) {
    const arr = raw && Array.isArray(raw.vec) ? raw.vec : (Array.isArray(raw) ? raw : []);
    const len = Math.max(dim, 3);
    const out = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      out[i] = snap(arr[i] !== undefined ? arr[i] : 0);
    }
    return out;
  }

  function dotN(a, b, dim) {
    let s = 0;
    for (let i = 0; i < dim; i++) {
      s += (Number(a[i]) || 0) * (Number(b[i]) || 0);
    }
    return snap(s);
  }

  function normN(a, dim) {
    return Math.sqrt(Math.max(0, dotN(a, a, dim)));
  }

  function scaleVecN(v, s, len) {
    const out = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      out[i] = snap((Number(v[i]) || 0) * s);
    }
    return out;
  }

  function addVecN(a, b, len) {
    const out = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      out[i] = snap((Number(a[i]) || 0) + (Number(b[i]) || 0));
    }
    return out;
  }

  function subVecN(a, b, len) {
    const out = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      out[i] = snap((Number(a[i]) || 0) - (Number(b[i]) || 0));
    }
    return out;
  }

  function getVecSymbol(item, idx, fmt) {
    if (item && !Array.isArray(item)) {
      if (typeof window !== "undefined" && window.App && typeof window.App.getVectorName === "function") {
        return fmt.normalizeVecSymbol(window.App.getVectorName(item), true);
      }
      if (item.name) {
        return fmt.normalizeVecSymbol(item.name, true);
      }
    }
    return "\\mathbf{v}_{" + (idx + 1) + "}";
  }

  function getGSSelectedItems() {
    if (typeof document === "undefined") return [];
    const container = document.getElementById("gsChecklist");
    const appRef = (typeof window !== "undefined" && window.App) ? window.App : {};
    const vList = Array.isArray(appRef.vectorList) ? appRef.vectorList.filter(function (v) { return v.id > 0; }) : [];
    if (container && !container.querySelector("input[type=\"checkbox\"]") && vList.length > 0) {
      if (typeof appRef.renderExtraCalcOptions === "function") {
        appRef.renderExtraCalcOptions();
      }
    }
    const items = [];
    if (container && vList.length > 0) {
      container.querySelectorAll("input[type=\"checkbox\"]:checked").forEach(function (cb) {
        const id = Number(cb.value);
        const found = vList.find(function (v) { return v.id === id; });
        if (found) items.push(found);
      });
      if (items.length === 0 && vList.length >= 1) {
        const autoPick = vList.slice(0, Math.min(3, vList.length));
        container.querySelectorAll("input[type=\"checkbox\"]").forEach(function (cb) {
          if (autoPick.some(function (it) { return it.id === Number(cb.value); })) {
            cb.checked = true;
          }
        });
        return autoPick;
      }
    }
    return items;
  }

  // Thuc hien truc giao hoa Gram - Schmidt tong quat (giu 100% tuong thich GSAnimator)
  function computeGSFromItems(items) {
    const safeItems = Array.isArray(items) ? items : [];
    let maxCoordLen = 2;
    for (let i = 0; i < safeItems.length; i++) {
      const raw = safeItems[i] && Array.isArray(safeItems[i].vec) ? safeItems[i].vec : safeItems[i];
      if (Array.isArray(raw) && raw.length > maxCoordLen) {
        maxCoordLen = raw.length;
      }
    }
    const appMode3D = typeof window !== "undefined" && window.App && window.App.mode === "3D";
    const is3D = maxCoordLen >= 3 || appMode3D;
    const dim = maxCoordLen > 3 ? maxCoordLen : (is3D ? 3 : 2);
    const storeLen = Math.max(dim, 3);

    const vectors = safeItems.map(function (it) { return toDimVec(it, dim); });
    const steps = [];
    const orthogonalBasis = [];
    const collapsedIndices = [];

    for (let k = 0; k < vectors.length; k++) {
      const vk = vectors[k];
      let pk = new Array(storeLen).fill(0);
      const projTerms = [];

      for (let j = 0; j < orthogonalBasis.length; j++) {
        const basisItem = orthogonalBasis[j];
        const uj = basisItem.u;
        const dotVU = dotN(vk, uj, dim);
        const normUSq = basisItem.normUSq;
        const coeff = normUSq > 1e-11 ? snap(dotVU / normUSq) : 0;
        const termVec = scaleVecN(uj, coeff, storeLen);
        pk = addVecN(pk, termVec, storeLen);
        projTerms.push({
          fromStepIndex: basisItem.stepIndex,
          basisIndex: basisItem.basisIndex,
          u: uj,
          dotVU: dotVU,
          normUSq: normUSq,
          coeff: coeff,
          termVec: termVec
        });
      }

      const rawU = subVecN(vk, pk, storeLen);
      const nUSq = dotN(rawU, rawU, dim);
      const nU = Math.sqrt(Math.max(0, nUSq));
      const isZero = nU < 1e-7;
      const uk = isZero ? new Array(storeLen).fill(0) : rawU;
      const ek = isZero ? new Array(storeLen).fill(0) : scaleVecN(uk, 1 / nU, storeLen);
      const assignedBasisIndex = isZero ? null : (orthogonalBasis.length + 1);

      if (isZero) {
        collapsedIndices.push(k + 1);
      } else {
        orthogonalBasis.push({
          stepIndex: k + 1,
          basisIndex: assignedBasisIndex,
          v: vk,
          p: pk,
          u: uk,
          e: ek,
          normU: nU,
          normUSq: nUSq
        });
      }

      steps.push({
        stepIndex: k + 1,
        basisIndex: assignedBasisIndex,
        v: vk,
        p: pk,
        u: uk,
        e: ek,
        normU: isZero ? 0 : nU,
        normUSq: isZero ? 0 : nUSq,
        isZero: isZero,
        projTerms: projTerms
      });
    }

    const zero3 = new Array(storeLen).fill(0);
    const v1 = vectors[0] || zero3.slice();
    const v2 = vectors[1] || zero3.slice();
    const v3 = vectors.length >= 3 ? vectors[2] : null;

    const u1 = steps[0] ? steps[0].u : zero3.slice();
    const u2 = steps[1] ? steps[1].u : zero3.slice();
    const u3 = steps[2] ? steps[2].u : null;

    const p1 = steps[1] ? steps[1].p : zero3.slice();
    const p12 = steps[2] ? steps[2].p : zero3.slice();
    const p31 = steps[2] && steps[2].projTerms[0] ? steps[2].projTerms[0].termVec : zero3.slice();
    const p32 = steps[2] && steps[2].projTerms[1] ? steps[2].projTerms[1].termVec : zero3.slice();

    const e1 = steps[0] ? steps[0].e : zero3.slice();
    const e2 = steps[1] ? steps[1].e : zero3.slice();
    const e3 = steps[2] ? steps[2].e : null;

    const nU1 = steps[0] ? steps[0].normU : 0;
    const nU2 = steps[1] ? steps[1].normU : 0;
    const nU3 = steps[2] ? steps[2].normU : 0;

    const nU1Sq = steps[0] ? steps[0].normUSq : 0;
    const nU2Sq = steps[1] ? steps[1].normUSq : 0;
    const nU3Sq = steps[2] ? steps[2].normUSq : 0;

    return {
      items: safeItems,
      vectors: vectors,
      is3D: is3D,
      dim: dim,
      steps: steps,
      orthogonalBasis: orthogonalBasis,
      collapsedIndices: collapsedIndices,
      rank: orthogonalBasis.length,
      v1: v1,
      v2: v2,
      v3: v3,
      u1: u1,
      u2: u2,
      u3: u3,
      p1: p1,
      p31: p31,
      p32: p32,
      p12: p12,
      e1: e1,
      e2: e2,
      e3: e3,
      nU1: nU1,
      nU2: nU2,
      nU3: nU3,
      nU1Sq: nU1Sq,
      nU2Sq: nU2Sq,
      nU3Sq: nU3Sq
    };
  }

  function buildGSSidebarCard(res) {
    const fmt = getFmt();
    const dim = res.dim;
    const m = res.vectors.length;
    const r = res.rank;
    const hasDependent = res.collapsedIndices.length > 0;
    const syms = res.items.map(function (it, idx) {
      return getVecSymbol(it, idx, fmt);
    });

    const primaryRows = [];
    if (r === 0) {
      primaryRows.push({
        labelHtml: "Cơ sở trực chuẩn",
        latex: "E = \\varnothing",
        noteHtml: "Toàn bộ hệ đầu vào là vector không nên không gian con W chỉ gồm gốc tọa độ."
      });
    } else {
      for (let j = 0; j < res.orthogonalBasis.length; j++) {
        const b = res.orthogonalBasis[j];
        const eSlice = b.e.slice(0, dim);
        const srcSym = syms[b.stepIndex - 1] || ("\\mathbf{v}_{" + b.stepIndex + "}");
        primaryRows.push({
          labelHtml: "Trục trực chuẩn thứ " + b.basisIndex + " (từ vector nguồn thứ " + b.stepIndex + ")",
          latex: "\\mathbf{e}_{" + b.basisIndex + "} = " + fmt.vecTupleLatex(eSlice),
          noteHtml: r < m ? ("Sinh từ phần dư trực giao của \\(" + srcSym + "\\).") : ""
        });
      }
    }

    const secondaryRows = [];
    if (r > 0) {
      const ortLatex = res.orthogonalBasis.map(function (b) {
        return "\\mathbf{u}_{" + b.basisIndex + "} = " + fmt.vecTupleLatex(b.u.slice(0, dim));
      }).join(",\\quad ");
      secondaryRows.push({
        labelHtml: "Hệ cơ sở trực giao trước chuẩn hóa",
        latex: ortLatex
      });
    }
    if (hasDependent) {
      const droppedSyms = res.collapsedIndices.map(function (stepIdx) {
        return "\\(" + (syms[stepIdx - 1] || ("\\mathbf{v}_{" + stepIdx + "}")) + "\\)";
      }).join(", ");
      secondaryRows.push({
        labelHtml: "Vector phụ thuộc tuyến tính bị loại",
        noteHtml: "Đã loại bỏ " + droppedSyms + " do phần dư trực giao triệt tiêu về vector không."
      });
    }

    return {
      titleLeft: "Hệ cơ sở trực chuẩn E",
      badgeRightLatex: "\\dim(W) = " + r + " / " + m,
      badgeTone: r === 0 ? "danger" : (hasDependent ? "primary" : "success"),
      primaryRows: primaryRows,
      secondarySection: secondaryRows.length > 0 ? {
        titleHtml: "Hệ trực giao trung gian & kiểm tra phụ thuộc",
        rows: secondaryRows
      } : null
    };
  }

  function renderGSInfoCard(res) {
    const api = getResultCardApi();
    if (!api.ResultCard || !res) return "";
    const opts = buildGSSidebarCard(res);
    return api.ResultCard.mount("result_gs_info", opts);
  }

  function buildMethod1Html(res, syms, fmt) {
    const dim = res.dim;
    const steps = res.steps;
    const basis = res.orthogonalBasis;
    const sections = [];

    const inputDefs = steps.map(function (s, idx) {
      return syms[idx] + " = " + fmt.vecTupleLatex(s.v.slice(0, dim));
    }).join(",\\quad ");

    sections.push(fmt.stepSectionHtml(
      "Bước 1: Thiết lập bài toán trong không gian Euclide",
      [
        "<div class=\"sol-text\">Xét hệ gồm " + steps.length + " vector trong không gian Euclide \\(\\mathbb{R}^{" + dim + "}\\) trang bị tích vô hướng chính tắc \\(\\langle \\mathbf{x}, \\mathbf{y} \\rangle = \\sum_{i=1}^{" + dim + "} x_i y_i\\):</div>",
        fmt.mathBlockHtml(inputDefs),
        "<div class=\"sol-text\">Tại mỗi bước thứ \\(k\\), ta chiếu trực giao vector đang xét lên không gian con sinh bởi các trục trực giao \\(\\{\\mathbf{u}_1, \\dots, \\mathbf{u}_q\\}\\) đã thu được trước đó, rồi lấy phần dư trực giao \\(\\tilde{\\mathbf{u}}_k = " + (syms[0] ? "\\mathbf{v}_k" : "\\mathbf{v}_k") + " - \\mathbf{p}_k\\). Nếu \\(\\tilde{\\mathbf{u}}_k = \\mathbf{0}\\), vector đó phụ thuộc tuyến tính và bị loại bỏ; ngược lại ta đặt \\(\\mathbf{u}_{q+1} = \\tilde{\\mathbf{u}}_k\\) và chuẩn hóa \\(\\mathbf{e}_{q+1} = \\frac{1}{\\|\\mathbf{u}_{q+1}\\|}\\mathbf{u}_{q+1}\\).</div>"
      ]
    ));

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const k = s.stepIndex;
      const vSym = syms[i];
      const vCol = fmt.vecTupleLatex(s.v.slice(0, dim), { colMode: true });
      const uCol = fmt.vecTupleLatex(s.u.slice(0, dim), { colMode: true });
      const stepParts = [];

      if (s.projTerms.length === 0) {
        stepParts.push(
          "<div class=\"sol-text\">Do chưa có trục trực giao nào được dựng trước đó, phần dư trực giao trùng với chính vector \\(" + vSym + "\\):</div>",
          fmt.mathBlockHtml("\\tilde{\\mathbf{u}}_{" + k + "} = " + vSym + " = " + vCol)
        );
      } else {
        const innerLines = s.projTerms.map(function (t) {
          return (
            "\\langle " + vSym + ",\\; \\mathbf{u}_{" + t.basisIndex + "} \\rangle = " + fmt.scalarToLatex(t.dotVU) +
            ",\\quad \\|\\mathbf{u}_{" + t.basisIndex + "}\\|^2 = " + fmt.scalarToLatex(t.normUSq) +
            " \\implies \\frac{\\langle " + vSym + ",\\; \\mathbf{u}_{" + t.basisIndex + "} \\rangle}{\\|\\mathbf{u}_{" + t.basisIndex + "}\\|^2} = " + fmt.scalarToLatex(t.coeff)
          );
        });
        stepParts.push(
          "<div class=\"sol-text\">Tính các hệ số chiếu trực giao của \\(" + vSym + "\\) lên từng trục đã dựng:</div>",
          fmt.mathBlockHtml(innerLines.join(" \\\\[6pt] "))
        );

        const formulaSum = s.projTerms.map(function (t) {
          return "\\frac{\\langle " + vSym + ",\\; \\mathbf{u}_{" + t.basisIndex + "} \\rangle}{\\|\\mathbf{u}_{" + t.basisIndex + "}\\|^2}\\mathbf{u}_{" + t.basisIndex + "}";
        }).join(" + ");

        const coeffArr = s.projTerms.map(function (t) { return t.coeff; });
        const uSymArr = s.projTerms.map(function (t) { return "\\mathbf{u}_{" + t.basisIndex + "}"; });
        const combTex = fmt.linearCombLatex(coeffArr, uSymArr, { keepZeros: true });
        const pCol = fmt.vecTupleLatex(s.p.slice(0, dim), { colMode: true });

        stepParts.push(
          "<div class=\"sol-text\">Tổng hợp hình chiếu vuông góc \\(\\mathbf{p}_{" + k + "}\\) và khử thành phần song song:</div>",
          fmt.mathBlockHtml(
            "\\mathbf{p}_{" + k + "} = " + formulaSum + " = " + combTex + " = " + pCol
          ),
          fmt.mathBlockHtml(
            "\\tilde{\\mathbf{u}}_{" + k + "} = " + vSym + " - \\mathbf{p}_{" + k + "} = " + vCol + " - " + pCol + " = " + uCol
          )
        );
      }

      if (s.isZero) {
        stepParts.push(
          "<div class=\"sol-note-box\">Vì \\(\\tilde{\\mathbf{u}}_{" + k + "} = \\mathbf{0}\\), vector \\(" + vSym + "\\) là tổ hợp tuyến tính của các trục trực giao đi trước nên bị loại khỏi cơ sở.</div>"
        );
      } else {
        const bIdx = s.basisIndex;
        const normSqTex = fmt.scalarToLatex(s.normUSq);
        const normTex = fmt.scalarToLatex(s.normU);
        const invNormTex = fmt.scalarToLatex(1 / s.normU);
        const eCol = fmt.vecTupleLatex(s.e.slice(0, dim), { colMode: true });
        stepParts.push(
          "<div class=\"sol-text\">Vì \\(\\tilde{\\mathbf{u}}_{" + k + "} \\neq \\mathbf{0}\\), ta nhận \\(\\mathbf{u}_{" + bIdx + "} = \\tilde{\\mathbf{u}}_{" + k + "}\\) làm trục trực giao thứ " + bIdx + ", tính chuẩn và chuẩn hóa đơn vị:</div>",
          fmt.mathBlockHtml(
            "\\|\\mathbf{u}_{" + bIdx + "}\\|^2 = " + normSqTex + ",\\quad \\|\\mathbf{u}_{" + bIdx + "}\\| = " + normTex
          ),
          fmt.mathBlockHtml(
            "\\mathbf{e}_{" + bIdx + "} = \\frac{1}{\\|\\mathbf{u}_{" + bIdx + "}\\|}\\mathbf{u}_{" + bIdx + "} = " + invNormTex + "\\," + uCol + " = " + eCol
          )
        );
      }

      sections.push(fmt.stepSectionHtml(
        "Bước " + (i + 2) + ": Xét vector thứ " + k + " là \\(" + vSym + "\\)",
        stepParts
      ));
    }

    const ortSetLatex = basis.length > 0
      ? "\\left\\{ " + basis.map(function (b) { return "\\mathbf{u}_{" + b.basisIndex + "} = " + fmt.vecTupleLatex(b.u.slice(0, dim)); }).join(",\\; ") + " \\right\\}"
      : "\\varnothing";
    const normSetLatex = basis.length > 0
      ? "\\left\\{ " + basis.map(function (b) { return "\\mathbf{e}_{" + b.basisIndex + "} = " + fmt.vecTupleLatex(b.e.slice(0, dim)); }).join(",\\; ") + " \\right\\}"
      : "\\varnothing";

    sections.push(fmt.stepSectionHtml(
      "Bước " + (steps.length + 2) + ": Kết luận cơ sở trực giao và cơ sở trực chuẩn",
      [
        "<div class=\"sol-text\">Không gian con \\(W = \\span\\{" + syms.join(",\\; ") + "\\}\\) có số chiều \\(\\dim(W) = " + basis.length + "\\):</div>",
        fmt.mathBlockHtml("B_{\\perp} = " + ortSetLatex),
        fmt.mathBlockHtml("E = " + normSetLatex)
      ]
    ));

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildMethod2Html(res, syms, fmt) {
    const dim = res.dim;
    const m = res.vectors.length;
    const r = res.rank;
    const basis = res.orthogonalBasis;

    const A = [];
    for (let i = 0; i < dim; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        row.push(snap(res.vectors[j][i]));
      }
      A.push(row);
    }
    const ALatex = fmt.matrixToLatex(A);

    if (r === 0) {
      return fmt.wrapStepContainer(
        fmt.stepSectionHtml("Bước 1: Ma trận cột của hệ vector", [
          "<div class=\"sol-text\">Ghép các vector đầu vào thành các cột của ma trận \\(A \\in \\mathbb{R}^{" + dim + " \\times " + m + "}\\):</div>",
          fmt.mathBlockHtml("A = " + ALatex),
          "<div class=\"sol-text\">Vì \\(A = O_{" + dim + " \\times " + m + "}\\) có hạng \\(\\rank(A) = 0\\), không tồn tại cột trực chuẩn nào (\\(E = \\varnothing\\)).</div>"
        ])
      );
    }

    const Q = [];
    for (let i = 0; i < dim; i++) {
      const row = [];
      for (let j = 0; j < r; j++) {
        row.push(snap(basis[j].e[i]));
      }
      Q.push(row);
    }

    // QtQ = Q^T * Q (r x r)
    const QtQ = [];
    for (let i = 0; i < r; i++) {
      const row = [];
      for (let j = 0; j < r; j++) {
        row.push(dotN(basis[i].e, basis[j].e, dim));
      }
      QtQ.push(row);
    }

    // R = Q^T * A (r x m)
    const R = [];
    for (let i = 0; i < r; i++) {
      const row = [];
      for (let k = 0; k < m; k++) {
        row.push(dotN(basis[i].e, res.vectors[k], dim));
      }
      R.push(row);
    }

    // QR = Q * R (dim x m)
    const QR = [];
    for (let i = 0; i < dim; i++) {
      const row = [];
      for (let k = 0; k < m; k++) {
        let s = 0;
        for (let j = 0; j < r; j++) {
          s += Q[i][j] * R[j][k];
        }
        row.push(snap(s));
      }
      QR.push(row);
    }

    const QLatex = fmt.matrixToLatex(Q);
    const QtQLatex = fmt.matrixToLatex(QtQ);
    const RLatex = fmt.matrixToLatex(R);
    const QRLatex = fmt.matrixToLatex(QR);

    const sections = [];
    sections.push(fmt.stepSectionHtml(
      "Bước 1: Lập ma trận cột \\(A\\) và ma trận trực chuẩn \\(Q\\)",
      [
        "<div class=\"sol-text\">Xếp các vector ban đầu làm các cột của \\(A \\in \\mathbb{R}^{" + dim + " \\times " + m + "}\\) và các vector cơ sở trực chuẩn \\(\\mathbf{e}_1, \\dots, \\mathbf{e}_{" + r + "}\\) làm các cột của \\(Q \\in \\mathbb{R}^{" + dim + " \\times " + r + "}\\):</div>",
        fmt.mathBlockHtml("A = " + ALatex + ",\\qquad Q = " + QLatex)
      ]
    ));

    sections.push(fmt.stepSectionHtml(
      "Bước 2: Kiểm chứng tính trực chuẩn thông qua ma trận Gram \\(Q^T Q\\)",
      [
        "<div class=\"sol-text\">Hệ cột của \\(Q\\) là hệ trực chuẩn khi và chỉ khi \\(\\langle \\mathbf{e}_i, \\mathbf{e}_j \\rangle = \\delta_{ij}\\), tức là \\(Q^T Q = I_{" + r + "}\\):</div>",
        fmt.mathBlockHtml("Q^T Q = " + QtQLatex + " = I_{" + r + "}")
      ]
    ));

    const rShapeDesc = r === m
      ? "ma trận tam giác trên khả nghịch với các phần tử đường chéo chính dương \\(r_{jj} = \\|\\mathbf{u}_j\\| > 0\\)"
      : "ma trận hình thang trên cỡ \\(" + r + " \\times " + m + "\\) phản ánh chính xác tổ hợp biểu diễn các cột phụ thuộc";

    sections.push(fmt.stepSectionHtml(
      "Bước 3: Xác định ma trận hệ số \\(R = Q^T A\\) và kiểm chứng \\(A = QR\\)",
      [
        "<div class=\"sol-text\">Chiếu từng cột của \\(A\\) lên cơ sở trực chuẩn \\(E\\) bằng phép nhân \\(R = Q^T A\\) với \\(r_{jk} = \\langle \\mathbf{e}_j, " + (syms[0] ? "\\mathbf{v}_k" : "\\mathbf{v}_k") + " \\rangle\\). Ta thu được " + rShapeDesc + ":</div>",
        fmt.mathBlockHtml("R = Q^T A = " + RLatex),
        "<div class=\"sol-text\">Nhân kiểm chứng lại tích \\(Q R\\):</div>",
        fmt.mathBlockHtml("Q R = " + QLatex + RLatex + " = " + QRLatex + " = A"),
        "<div class=\"sol-text\">Đẳng thức \\(A = Q R\\) và \\(Q^T Q = I_{" + r + "}\\) khẳng định kết quả trực chuẩn hóa hoàn toàn chính xác.</div>"
      ]
    ));

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildGSSolution(items) {
    const fmt = getFmt();
    const res = computeGSFromItems(items);
    const dim = res.dim;
    const syms = res.items.map(function (it, idx) {
      return getVecSymbol(it, idx, fmt);
    });

    const content1 = buildMethod1Html(res, syms, fmt);
    const content2 = buildMethod2Html(res, syms, fmt);

    const logLatex = res.rank > 0
      ? "E = \\left\\{ " + res.orthogonalBasis.map(function (b) { return fmt.vecTupleLatex(b.e.slice(0, dim)); }).join(",\\; ") + " \\right\\}"
      : "E = \\varnothing";

    return {
      analysis: res,
      cardOptions: buildGSSidebarCard(res),
      logLatex: logLatex,
      modalConfig: {
        title: "Trực giao hóa Gram - Schmidt & Phân rã QR",
        math: "W = \\span\\{" + syms.join(",\\; ") + "\\} \\subset \\mathbb{R}^{" + dim + "}",
        tab1Label: "Cách 1: Thuật toán Gram - Schmidt từng bước",
        tab2Label: "Cách 2: Phân rã ma trận A = QR & Kiểm chứng",
        showSubTabs: false,
        content1: content1,
        content2: content2,
        content2Sub: ""
      }
    };
  }

  function currentChecklistSignature() {
    const api = getResultCardApi();
    if (api.SolutionSync && typeof api.SolutionSync.checklistSig === "function") {
      return api.SolutionSync.checklistSig("gsChecklist");
    }
    return "";
  }

  // Module dieu hanh Chu de 4 tren giao dien
  const Topic4Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized || typeof document === "undefined") return;
      const btnOrth = document.getElementById("btnGSOrthogonalize");
      const btnAnim = document.getElementById("btnGSAnimate");
      const btnSol = document.getElementById("btnGSSolution");
      if (!btnOrth && !btnAnim && !btnSol) return;
      this._isInitialized = true;

      const self = this;

      if (btnOrth) {
        btnOrth.addEventListener("click", function () {
          if (typeof App.requireVectors === "function" && !App.requireVectors()) return;
          const items = getGSSelectedItems();
          if (!items || items.length < 1) {
            if (typeof App.showToast === "function") {
              App.showToast("Hãy chọn ít nhất 1 vector để trực giao hóa Gram - Schmidt.", "warning");
            }
            return;
          }
          self.execute({ logHistory: true });
        });
      }

      if (btnAnim) {
        btnAnim.addEventListener("click", function () {
          if (typeof App.requireVectors === "function" && !App.requireVectors()) return;
          const items = getGSSelectedItems();
          if (!items || items.length < 2) {
            if (typeof App.showToast === "function") {
              App.showToast("Hãy chọn ít nhất 2 vector để phát hoạt cảnh chiếu trực giao 3 bước.", "warning");
            }
            return;
          }
          self.execute({ logHistory: false });
          if (App.GSAnimator && typeof App.GSAnimator.start === "function") {
            App.GSAnimator.start(items);
          }
        });
      }

      if (btnSol) {
        btnSol.dataset.syncManaged = "1";
        btnSol.addEventListener("click", function () {
          const api = getResultCardApi();
          if (api.SolutionSync && typeof api.SolutionSync.openWithSync === "function") {
            api.SolutionSync.openWithSync({
              key: SYNC_KEY,
              getSig: currentChecklistSignature,
              recomputeStatic: function () {
                self.execute({ silent: true, logHistory: false });
              },
              emptyTitle: "Trực giao hóa Gram - Schmidt",
              emptyHintHtml: "Hãy tạo và tích chọn ít nhất <b>1 vector</b> trong danh sách để xem lời giải trực giao hóa chi tiết."
            });
          }
        });
      }
    },

    execute: function (opts) {
      const options = opts || {};
      if (!this._isInitialized) this.init();

      const api = getResultCardApi();
      const items = getGSSelectedItems();
      if (!items || items.length < 1) {
        if (api.ResultCard) {
          api.ResultCard.mountError(
            "result_gs_info",
            "Hãy tích chọn ít nhất <b>1 vector</b> trong danh sách phía trên để trực giao hóa Gram - Schmidt.",
            "Chưa chọn vector"
          );
        }
        return null;
      }

      const pack = buildGSSolution(items);
      if (api.ResultCard) {
        api.ResultCard.mount("result_gs_info", pack.cardOptions);
      }

      if (api.SolutionSync) {
        api.SolutionSync.save(SYNC_KEY, currentChecklistSignature(), pack.modalConfig);
      }
      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(Object.assign({}, pack.modalConfig, { autoOpen: false }));
      }

      if (options.logHistory !== false && window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === "function") {
        window.App.PaperLogger.log(
          "Trực giao hóa Gram - Schmidt",
          pack.logLatex,
          "",
          pack.modalConfig,
          { type: "gram_schmidt", count: items.length }
        );
      }

      if (!options.silent) {
        if (App.mode === "2D" && window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
          Vec2D.draw2DAllVectors();
        } else if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
          Vec3D.hardRefresh3D(false);
        }
      }

      return pack;
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "topic4_gram_schmidt" ||
        taskId === "s21" ||
        taskId === "topic4_orthogonality" ||
        taskId === "s20"
      ) {
        if (typeof App.renderExtraCalcOptions === "function") {
          App.renderExtraCalcOptions();
        }
        this.init();
      } else {
        if (App.GSAnimator && typeof App.GSAnimator.stop === "function" && App.GSAnimator.isActive()) {
          App.GSAnimator.stop();
        }
      }
    }
  };

  if (typeof window !== "undefined") {
    window.App = window.App || {};
    if (typeof window.App.registerTopicModule === "function") {
      window.App.registerTopicModule("t4", Topic4Module);
    } else if (typeof window.addEventListener === "function") {
      window.addEventListener("DOMContentLoaded", function () {
        if (typeof window.App.registerTopicModule === "function") {
          window.App.registerTopicModule("t4", Topic4Module);
        }
      });
    }
  }

  return {
    computeGSFromItems: computeGSFromItems,
    buildGSSidebarCard: buildGSSidebarCard,
    buildGSSolution: buildGSSolution,
    renderGSInfoCard: renderGSInfoCard,
    Topic4Module: Topic4Module
  };
});
