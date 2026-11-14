// =========================================================================
// Automated Verification Test for Academic Linear Independence Animation
// =========================================================================
const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Mock Browser Environment
global.window = global;
global.document = {
  body: {
    classList: {
      contains: () => false
    }
  },
  getElementById: (id) => {
    return null;
  },
  createElement: (tag) => {
    return {
      id: "",
      className: "",
      style: {},
      innerHTML: "",
      textContent: "",
      appendChild: () => {},
      insertBefore: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
  }
};

global.App = {
  mode: "2D"
};

// Load state.js & indep_animation.js
const stateCode = fs.readFileSync(
  path.join(__dirname, "../frontend_v2/js/app/state.js"),
  "utf8"
);
eval(stateCode);

const code = fs.readFileSync(
  path.join(__dirname, "../frontend_v2/js/app/playback/indep_animation.js"),
  "utf8"
);
eval(code);

App.vectorList = [
  { id: 1, vec: [1, 2], visible: true, alpha: 1.0, colorCss: "#38bdf8" },
  { id: 2, vec: [2, 4], visible: true, alpha: 1.0, colorCss: "#10b981" },
  { id: 3, vec: [0, 1], visible: true, alpha: 1.0, colorCss: "#f59e0b" }
];

console.log("=== BẮT ĐẦU KIỂM THỬ HOẠT CẢNH ĐỘC LẬP TUYẾN TÍNH CHUẨN TOÁN HỌC ===");

// 1. Kiểm tra tồn tại
assert(window.App.IndepAnimator, "App.IndepAnimator phải tồn tại");
assert(typeof window.App.startIndepAnimation === "function", "startIndepAnimation phải là function");
assert(typeof window.App.stopIndepAnimation === "function", "stopIndepAnimation phải là function");
console.log("✓ Module initialization verified");

// 2. Ca thử 1: 2 vector cùng phương trong 2D [1, 2] và [2, 4]
{
  App.mode = "2D";
  const items = [
    { id: 1, vec: [1, 2] },
    { id: 2, vec: [2, 4] }
  ];
  App.IndepAnimator.start(items);
  const an = App.IndepAnimator.getAnalysis();
  assert.strictEqual(an.isIndependent, false, "Hệ [1,2] và [2,4] phải phụ thuộc");
  assert.strictEqual(an.isV2Collinear, true, "v2 phải cùng phương v1");
  assert.strictEqual(Math.round(an.collinearRatio), 2, "Hệ số tỉ lệ v2/v1 phải là 2");
  assert.strictEqual(App._indepAnimActive, true, "Cờ khóa tương tác _indepAnimActive phải là true");
  App.IndepAnimator.stop();
  assert.strictEqual(App._indepAnimActive, false, "Cờ khóa tương tác phải trở về false sau khi stop");
  console.log("✓ Test 1: Collinear 2D vectors correctly identified at Step 2 (v2 = 2*v1)");
}

// 3. Ca thử 2: 2 vector độc lập trong 2D [1, 0] và [0, 1]
{
  App.mode = "2D";
  const items = [
    { id: 1, vec: [1, 0] },
    { id: 3, vec: [0, 1] }
  ];
  App.IndepAnimator.start(items);
  const an = App.IndepAnimator.getAnalysis();
  assert.strictEqual(an.isIndependent, true, "Hệ [1,0] và [0,1] phải độc lập");
  assert.strictEqual(an.isV2Collinear, false, "v2 không được cùng phương v1");
  assert.strictEqual(an.rank, 2, "Hạng phải là 2");
  App.IndepAnimator.stop();
  console.log("✓ Test 2: Independent 2D vectors correctly expand plane R^2");
}

// 4. Ca thử 3: 3 vector trong 2D: [1, 0], [0, 1], [3, 5] -> Phụ thuộc tại bước 3
{
  App.mode = "2D";
  const items = [
    { id: 1, vec: [1, 0] },
    { id: 2, vec: [0, 1] },
    { id: 3, vec: [3, 5] }
  ];
  App.IndepAnimator.start(items);
  const an = App.IndepAnimator.getAnalysis();
  assert.strictEqual(an.isIndependent, false, "3 vector trong 2D luôn phụ thuộc");
  assert.strictEqual(an.isV3Coplanar, true, "v3 phải nằm trọn trong mặt phẳng 2D");
  assert.strictEqual(Math.round(an.decompC1), 3, "Hệ số c1 phải là 3");
  assert.strictEqual(Math.round(an.decompC2), 5, "Hệ số c2 phải là 5");
  App.IndepAnimator.stop();
  console.log("✓ Test 3: 3 vectors in 2D correctly decompose into v3 = 3*v1 + 5*v2");
}

// 5. Ca thử 4: 3 vector đồng phẳng trong 3D: [1, 0, 0], [0, 1, 0], [2, 4, 0] -> Phụ thuộc
{
  App.mode = "3D";
  const items = [
    { id: 1, vec: [1, 0, 0] },
    { id: 2, vec: [0, 1, 0] },
    { id: 3, vec: [2, 4, 0] }
  ];
  App.IndepAnimator.start(items);
  const an = App.IndepAnimator.getAnalysis();
  assert.strictEqual(an.isIndependent, false, "Hệ 3 vector đồng phẳng trong 3D phải phụ thuộc");
  assert.strictEqual(an.isV3Coplanar, true, "v3 phải đồng phẳng với v1, v2");
  assert.strictEqual(Math.round(an.decompC1), 2, "Hệ số c1 = 2");
  assert.strictEqual(Math.round(an.decompC2), 4, "Hệ số c2 = 4");
  App.IndepAnimator.stop();
  console.log("✓ Test 4: Coplanar 3D vectors correctly identified as dependent");
}

// 6. Ca thử 5: 3 vector độc lập trong 3D: [1, 0, 0], [0, 1, 0], [0, 0, 1] -> Độc lập
{
  App.mode = "3D";
  const items = [
    { id: 1, vec: [1, 0, 0] },
    { id: 2, vec: [0, 1, 0] },
    { id: 3, vec: [0, 0, 1] }
  ];
  App.IndepAnimator.start(items);
  const an = App.IndepAnimator.getAnalysis();
  assert.strictEqual(an.isIndependent, true, "Hệ cơ sở chuẩn trong 3D phải độc lập");
  assert.strictEqual(an.isV3Coplanar, false, "v3 không được đồng phẳng với span(v1, v2)");
  assert.strictEqual(an.rank, 3, "Hạng của hệ phải là 3");
  assert(an.escapeDist > 0.99, "Khoảng cách thoát h_perp phải bằng 1");
  App.IndepAnimator.stop();
  console.log("✓ Test 5: Full 3D independent basis vectors correctly expand to dim = 3");
}

// 7. Kiểm tra an toàn dữ liệu: Tuyệt đối không thêm mock object vào App.vectorList
{
  const initialLength = App.vectorList.length;
  App.IndepAnimator.start(App.vectorList);
  assert.strictEqual(App.vectorList.length, initialLength, "App.vectorList không được bị thêm bớt phần tử");
  const hasNegativeId = App.vectorList.some((v) => v.id < 0);
  assert.strictEqual(hasNegativeId, false, "Tuyệt đối không được tồn tại ID âm trong App.vectorList");
  App.IndepAnimator.stop();
  assert.strictEqual(App.vectorList.length, initialLength, "App.vectorList sau khi stop phải nguyên vẹn");
  console.log("✓ Test 6: Zero data pollution confirmed (App.vectorList untouched)");
}

// 8. Kiểm tra mock render 2D hook
{
  App.mode = "2D";
  const items = [
    { id: 1, vec: [1, 0] },
    { id: 2, vec: [0, 1] },
    { id: 3, vec: [2, 2] }
  ];
  App.IndepAnimator.start(items);

  const mockCtx = {
    canvas: { width: 1000, height: 800 },
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    setLineDash: () => {},
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1
  };
  const mockGrid = { cx: 500, cy: 400, px: 40, w: 1000, h: 800 };

  // Render Buoc 1
  App.IndepAnimator.goToPhase(0);
  App.IndepAnimator.render2DSubspace(mockCtx, mockGrid);
  App.IndepAnimator.render2DProjections(mockCtx, mockGrid);

  // Render Buoc 2
  App.IndepAnimator.goToPhase(1);
  App.IndepAnimator.render2DSubspace(mockCtx, mockGrid);
  App.IndepAnimator.render2DProjections(mockCtx, mockGrid);

  // Render Buoc 3
  App.IndepAnimator.goToPhase(2);
  App.IndepAnimator.render2DSubspace(mockCtx, mockGrid);
  App.IndepAnimator.render2DProjections(mockCtx, mockGrid);

  App.IndepAnimator.stop();
  console.log("✓ Test 7: Mock 2D canvas render hooks executed across all 3 phases without error");
}

// 9. Kiểm tra tô màu phân biệt độc lập và phụ thuộc tuyến tính
{
  App.vectorList = [
    { id: 1, vec: [1, 0], visible: true, alpha: 1.0, colorCss: "#38bdf8" },
    { id: 2, vec: [0, 1], visible: true, alpha: 1.0, colorCss: "#a855f7" },
    { id: 3, vec: [2, 3], visible: true, alpha: 1.0, colorCss: "#ec4899" }
  ];
  App.IndepAnimator.start(App.vectorList);

  // Pha 0: v1 độc lập
  App.IndepAnimator.goToPhase(0);
  assert.strictEqual(App.vectorList[0]._indepColorCss, "#10b981", "v1 phải được tô màu xanh độc lập (#10b981)");

  // Pha 1: v2 độc lập với v1
  App.IndepAnimator.goToPhase(1);
  assert.strictEqual(App.vectorList[0]._indepColorCss, "#10b981", "v1 vẫn độc lập");
  assert.strictEqual(App.vectorList[1]._indepColorCss, "#10b981", "v2 độc lập với v1");

  // Pha 2: v3 là tổ hợp tuyến tính của v1, v2 trong 2D -> PHỤ THUỘC (#f59e0b)
  App.IndepAnimator.goToPhase(2);
  assert.strictEqual(App.vectorList[0]._indepColorCss, "#10b981", "v1 độc lập");
  assert.strictEqual(App.vectorList[1]._indepColorCss, "#10b981", "v2 độc lập");
  assert.strictEqual(App.vectorList[2]._indepColorCss, "#f59e0b", "v3 phải được tô màu hổ phách phụ thuộc (#f59e0b)");

  App.IndepAnimator.stop();

  // Kiểm tra dọn dẹp cờ màu sau khi stop
  assert.strictEqual(App.vectorList[0]._indepColorCss, undefined, "Cờ _indepColorCss của v1 phải được xóa sau khi stop");
  assert.strictEqual(App.vectorList[2]._indepColorCss, undefined, "Cờ _indepColorCss của v3 phải được xóa sau khi stop");
  console.log("✓ Test 8: Independent (#10b981) vs Dependent (#f59e0b) color differentiation verified");
}

// 10. Kiểm tra khóa tương tác kéo vector khi hoạt cảnh đang chạy
{
  App.IndepAnimator.start([
    { id: 1, vec: [1, 2] },
    { id: 2, vec: [3, 4] }
  ]);
  assert.strictEqual(App.isInteractionBlocked(), true, "App.isInteractionBlocked() phải trả về true khi đang chạy hoạt cảnh");
  assert.strictEqual(App.isAnimating, true, "App.isAnimating phải là true");

  App.IndepAnimator.stop();
  assert.strictEqual(App.isInteractionBlocked(), false, "App.isInteractionBlocked() phải trả về false khi đã stop hoạt cảnh");
  assert.strictEqual(App.isAnimating, false, "App.isAnimating phải là false");
  console.log("✓ Test 9: Vector drag interaction lock verified during animation lifecycle");
}

// 11. Kiểm tra dừng toàn bộ hoạt cảnh khi đổi bài toán hoặc qua tab khác
{
  App.IndepAnimator.start([
    { id: 1, vec: [1, 2] },
    { id: 2, vec: [3, 4] }
  ]);
  assert.strictEqual(App.IndepAnimator.isActive(), true, "Hoạt cảnh phải đang active");

  // Giả lập chuyển sang bài toán khác bằng App.stopAllAnimations
  App.stopAllAnimations("rank");
  assert.strictEqual(App.IndepAnimator.isActive(), false, "IndepAnimator phải bị dừng khi chuyển sang bài toán khác");
  assert.strictEqual(App.isInteractionBlocked(), false, "Tương tác kéo vector phải được mở khóa sau khi stopAllAnimations");
  console.log("✓ Test 10: App.stopAllAnimations cleanly stops active animation and unlocks drag");
}

console.log("=== TẤT CẢ 10 CA KIỂM THỬ TOÁN HỌC, TÔ MÀU & KHÓA TƯƠNG TÁC ĐÃ ĐẠT 100%! ===");
