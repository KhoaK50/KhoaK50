// =========================================================================
// topic3_vector_spaces.js - Module Chủ Đề 3: Không Gian Tuyến Tính
// Kế thừa và bảo toàn 100% 4 bài toán năm trước kèm toàn bộ bộ sinh lời giải
// =========================================================================
(function () {
  window.App = window.App || {};

  const Topic3Module = {
    id: "t3",
    name: "Chủ đề 3: Không gian tuyến tính",
    tasks: [
      { id: "linear_independence", title: "Độc lập - phụ thuộc tuyến tính" },
      { id: "rank", title: "Hạng của hệ vector" },
      { id: "basis", title: "Cơ sở và số chiều" },
      { id: "coordinates", title: "Tọa độ của vector đối với một cơ sở" }
    ],

    init: function () {
      // Đảm bảo các controller cũ đã sẵn sàng
      if (typeof App.renderExtraCalcOptions === "function") {
        App.renderExtraCalcOptions();
      }
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "linear_independence" ||
        taskId === "rank" ||
        taskId === "basis" ||
        taskId === "coordinates"
      ) {
        // Đồng bộ danh sách checkbox vector cho các bài toán của Chủ đề 3
        if (typeof App.renderExtraCalcOptions === "function") {
          App.renderExtraCalcOptions();
        }
      }
    }
  };

  // Đăng ký vào hệ thống điều phối
  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t3", Topic3Module);
  } else {
    // Nếu registry nạp sau
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t3", Topic3Module);
      }
    });
  }
})();
