(function () {
  window.App = window.App || {};

  // chỉ ẩn các vector phụ thuộc, không đụng focus
  App.hideDependentsOnly = function (dependentIds) {
    if (!Array.isArray(dependentIds)) dependentIds = [];
    App.vectorList.forEach((item) => {
      item.visible = !dependentIds.includes(item.id);
    });

    App.renderVectorList();

    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  };

  App.playBasisSolution = async function (explanationText, dependentIds) {
    const el = document.getElementById("result_basis");
    if (!el) return;
    await App.typeText(el, explanationText, 25);
    App.hideDependentsOnly(dependentIds);
  };

  App.basisAndDimUI = async function () {
    const checklist = document.getElementById("basisChecklist");
    if (!checklist) return;

    const selectedItems = [];
    checklist.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      const id = Number(cb.value);
      const it = App.vectorList.find((v) => v.id === id);
      if (it) selectedItems.push(it);
    });

    if (!selectedItems.length) { alert("Tick ít nhất 1 vector để xét cơ sở."); return; }

    const vecs = selectedItems.map((it) => it.vec.slice());

    try {
      const res = await fetch(`${App.API_BASE}/api/basis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: vecs }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const basis = data?.basis;
      const dim = data?.dimension;

      if (!Array.isArray(basis)) {
        document.getElementById("result_basis").innerText = "Không đọc được cơ sở.";
        return;
      }

      let explanationText = "";
      if (Array.isArray(data?.steps) && data.steps.length) {
        explanationText = App.renderStepsToText(data.steps);
      } else {
        const basisStr = basis.map((v) => App.formatVectorShort(v)).join("\n");
        explanationText =
          "KẾT QUẢ CƠ SỞ & SỐ CHIỀU\n\n" +
          "Cơ sở (chọn từ các vector ban đầu):\n" +
          basisStr + "\n\n" +
          "Số chiều (rank của hệ vector): " + App.formatScalar(dim);
      }

      // dependents: idx theo selectedItems
      let dependentIds = [];
      if (Array.isArray(data?.dependents) && data.dependents.length) {
        dependentIds = data.dependents
          .map((idx) => selectedItems[idx])
          .filter(Boolean)
          .map((it) => it.id);
      }

      App.playBasisSolution(explanationText, dependentIds);

    } catch (err) {
      document.getElementById("result_basis").innerText = "Lỗi: " + err.message;
    }
  };

  App.checkIndependenceUI = async function () {
    const vecs = App.getCheckedVectors(document.getElementById("indepChecklist"));
    if (!vecs.length) { alert("Tick ít nhất 1 vector để kiểm tra."); return; }

    try {
      const data = await App.callAPI("linear_independence", { vectors: vecs });
      const msg = (typeof data?.result === "string") ? data.result : "Không xác định được.";
      document.getElementById("result_indep").innerText = msg;
    } catch (err) {
      document.getElementById("result_indep").innerText = "Lỗi: " + err.message;
    }
  };

  App.rankVecUI = async function () {
    const vecs = App.getCheckedVectors(document.getElementById("rankChecklist"));
    if (!vecs.length) { alert("Tick ít nhất 1 vector để tính rank."); return; }

    try {
      const res = await fetch(`${App.API_BASE}/api/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: vecs }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rank = (typeof data?.rank === "number") ? data.rank : null;
      document.getElementById("result_rank").innerText = (rank !== null) ? App.formatScalar(rank) : "Không đọc được rank.";
    } catch (err) {
      document.getElementById("result_rank").innerText = "Lỗi: " + err.message;
    }
  };
})();
