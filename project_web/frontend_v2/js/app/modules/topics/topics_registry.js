// =========================================================================
// topics_registry.js - Điều Phối Trung Tâm 7 Chủ Đề Đại Số Tuyến Tính
// Quản lý kiến trúc 2 cấp (Two-Tier Progressive Selection) trên Sidebar calculation.html
// 1. Chọn chủ đề -> 2. Chọn chức năng/bài toán chuẩn giáo trình -> 3. Tương tác form
// =========================================================================
(function () {
  window.App = window.App || {};
  App.TopicModules = App.TopicModules || {};

  // Dữ liệu chuẩn hóa 100% bám sát 7 Chủ đề và 37 Section từ MOCK_LIBRARY_DATA
  const TOPICS_DATA = [
    {
      id: "t1",
      title: "Chủ đề 1: Kiến thức chuẩn bị",
      phase: 2,
      sections: [
        {
          id: "topic1_parametric_vector",
          sectionId: "s1",
          title: "1. Vector ở phổ thông",
          phase: 2,
          ready: true,
          formId: "topic1_parametric_vector",
          lessons: [
            "Bài 1: Khái niệm vector, phương, hướng và độ dài",
            "Bài 2: Phép cộng, trừ vector và nhân vector với một số (quy tắc hình bình hành)",
            "Bài 3: Biểu diễn tọa độ của vector trong không gian 2D và 3D"
          ],
          desc: "Khảo sát hình học vector 2D/3D, quy tắc hình bình hành và vector tham số v(t) = [t, t^2] quét đường cong Parabol."
        },
        {
          id: "s2",
          title: "2. Ánh xạ",
          phase: 2,
          lessons: [
            "Bài 4: Định nghĩa ánh xạ, tập nguồn, tập đích",
            "Bài 5: Đơn ánh, toàn ánh, song ánh",
            "Bài 6: Ánh xạ ngược và ánh xạ hợp"
          ],
          desc: "Mô hình quan hệ ánh xạ giữa các tập hợp và không gian vector."
        },
        {
          id: "s3",
          title: "3. Phép thế",
          phase: 2,
          lessons: [
            "Bài 7: Định nghĩa phép thế, phép thế đồng nhất",
            "Bài 8: Phép nhân hai phép thế",
            "Bài 9: Nghịch thế",
            "Bài 10: Dấu của phép thế"
          ],
          desc: "Các phép hoán vị và ứng dụng trong tính định thức ma trận."
        }
      ]
    },
    {
      id: "t2",
      title: "Chủ đề 2: Ma trận và hệ phương trình tuyến tính",
      phase: 2,
      sections: [
        {
          id: "s4",
          title: "1. Ma trận và các phép toán",
          phase: 2,
          lessons: [
            "Bài 11: Khái niệm ma trận và các loại ma trận đặc biệt",
            "Bài 12: Phép toán cộng ma trận và nhân ma trận với một số vô hướng",
            "Bài 13: Phép nhân hai ma trận và phép chuyển vị ma trận"
          ],
          desc: "Đại số ma trận, các phép tính cơ bản và nâng cao."
        },
        {
          id: "s5",
          title: "2. Hạng ma trận",
          phase: 2,
          lessons: [
            "Bài 14: Định nghĩa hạng ma trận",
            "Bài 15: Các phép biến đổi sơ cấp",
            "Bài 16: Tìm hạng bằng thuật toán Gauss"
          ],
          desc: "Khảo sát số hàng độc lập tuyến tính và bậc tự do của ma trận."
        },
        {
          id: "topic2_matrix_param",
          sectionId: "s6",
          title: "3. Định thức",
          phase: 2,
          ready: true,
          formId: "topic2_matrix_param",
          lessons: [
            "Bài 17: Định thức cấp 2, 3 và cấp n",
            "Bài 18: Các tính chất của định thức",
            "Bài 19: Ý nghĩa hình học của định thức"
          ],
          desc: "Ý nghĩa hình học của det(A) như hệ số co giãn diện tích 2D và thể tích 3D theo tham số m."
        },
        {
          id: "s7",
          title: "4. Ma trận nghịch đảo",
          phase: 2,
          lessons: [
            "Bài 20: Điều kiện khả nghịch của ma trận",
            "Bài 21: Tìm ma trận nghịch đảo bằng ma trận phụ hợp",
            "Bài 22: Phương pháp Gauss-Jordan"
          ],
          desc: "Biến đổi ngược và giải phương trình ma trận."
        },
        {
          id: "topic2_matrix_system",
          sectionId: "s8",
          title: "5. Hệ phương trình tuyến tính",
          phase: 2,
          ready: true,
          formId: "topic2_matrix_param",
          lessons: [
            "Bài 23: Dạng tổng quát và ma trận mở rộng",
            "Bài 24: Định lý Kronecker-Capelli",
            "Bài 25: Phương pháp khử Gauss và Gauss-Jordan",
            "Bài 26: Quy tắc Cramer"
          ],
          desc: "Mô hình hình học giao điểm các mặt phẳng và biện luận nghiệm theo tham số m."
        }
      ]
    },
    {
      id: "t3",
      title: "Chủ đề 3: Không gian tuyến tính",
      phase: 1,
      sections: [
        {
          id: "linear_independence",
          sectionId: "s12",
          title: "4. Độc lập - phụ thuộc tuyến tính",
          phase: 1,
          ready: true,
          formId: "linear_independence",
          desc: "Khảo sát hệ vector độc lập hay phụ thuộc tuyến tính và mô hình trực quan hình hộp 3D."
        },
        {
          id: "rank",
          sectionId: "s13",
          title: "5. Hạng của hệ vector",
          phase: 1,
          ready: true,
          formId: "rank",
          desc: "Tính số chiều không gian con sinh bởi hệ vector."
        },
        {
          id: "basis",
          sectionId: "s15",
          title: "7. Cơ sở và số chiều",
          phase: 1,
          ready: true,
          formId: "basis",
          desc: "Tìm cơ sở cực đại, số chiều và sinh lời giải các bước chi tiết bằng thuật toán Gauss."
        },
        {
          id: "coordinates",
          sectionId: "s16",
          title: "8. Tọa độ của vector đối với một cơ sở",
          phase: 1,
          ready: true,
          formId: "coordinates",
          desc: "Biểu diễn vector qua tổ hợp tuyến tính của hệ cơ sở và sinh lời giải tọa độ."
        },
        {
          id: "s9",
          title: "1. Khái niệm không gian vector",
          phase: 1,
          lessons: [
            "Bài 27: Định nghĩa không gian vector và 8 tiên đề",
            "Bài 28: Các ví dụ kinh điển (Rn, Pn, Mn)"
          ],
          desc: "Cấu trúc đại số trừu tượng của không gian tuyến tính."
        },
        {
          id: "s10",
          title: "2. Không gian vector con",
          phase: 1,
          lessons: [
            "Bài 29: Khái niệm không gian con",
            "Bài 30: Điều kiện để một tập con là không gian con",
            "Bài 31: Giao và tổng của các không gian con"
          ],
          desc: "Đặc tính đóng kín với phép cộng vector và phép nhân vô hướng."
        },
        {
          id: "s11",
          title: "3. Tổ hợp tuyến tính",
          phase: 1,
          lessons: [
            "Bài 32: Khái niệm tổ hợp tuyến tính",
            "Bài 33: Biểu diễn vector dưới dạng tổ hợp tuyến tính"
          ],
          desc: "Phép kết hợp tuyến tính các vector."
        },
        {
          id: "s14",
          title: "6. Hệ sinh của không gian vector",
          phase: 1,
          lessons: [
            "Bài 34: Khái niệm hệ sinh",
            "Bài 35: Không gian con sinh bởi một tập hợp vector (Span)"
          ],
          desc: "Vùng không gian Span quét bởi hệ vector."
        },
        {
          id: "s17",
          title: "9. Ma trận chuyển cơ sở",
          phase: 1,
          lessons: [
            "Bài 36: Định nghĩa ma trận chuyển cơ sở",
            "Bài 37: Công thức đổi tọa độ khi đổi cơ sở"
          ],
          desc: "Mối liên hệ giữa hai hệ quy chiếu cơ sở trong cùng một không gian."
        }
      ]
    },
    {
      id: "t4",
      title: "Chủ đề 4: Không gian Euclide",
      phase: 3,
      sections: [
        {
          id: "s18",
          title: "1. Tích vô hướng của hai vector và định nghĩa không gian Euclide",
          phase: 3,
          lessons: [
            "Bài 38: Các tiên đề tích vô hướng",
            "Bài 39: Chuẩn vector và bất đẳng thức Cauchy-Schwarz"
          ],
          desc: "Đo lường độ dài và góc trong không gian tuyến tính tổng quát."
        },
        {
          id: "s19",
          title: "2. Khái niệm không gian Euclide và các phép toán",
          phase: 3,
          lessons: [
            "Bài 40: Khoảng cách giữa hai vector",
            "Bài 41: Góc giữa hai vector trong không gian Euclide"
          ],
          desc: "Hình học metric trên không gian vector."
        },
        {
          id: "topic4_orthogonality",
          sectionId: "s20",
          title: "3. Sự trực giao, cơ sở trực giao và trực chuẩn",
          phase: 3,
          ready: true,
          formId: "topic4_gram_schmidt",
          lessons: [
            "Bài 42: Hai vector trực giao",
            "Bài 43: Hệ vector trực giao và trực chuẩn",
            "Bài 44: Tọa độ theo cơ sở trực chuẩn"
          ],
          desc: "Hệ quy chiếu vuông góc tối ưu cho tính toán và chuẩn hóa vector về độ dài 1."
        },
        {
          id: "topic4_gram_schmidt",
          sectionId: "s21",
          title: "4. Thuật toán trực giao hóa Gram - Schmidt",
          phase: 3,
          ready: true,
          formId: "topic4_gram_schmidt",
          lessons: [
            "Bài 45: Quy trình Gram - Schmidt",
            "Bài 46: Chuẩn hóa vector",
            "Bài 47: Ý nghĩa hình học của phép chiếu"
          ],
          desc: "Hoạt họa từng bước dựng hình chiếu và nắn các vector về vuông góc 90 độ."
        },
        {
          id: "s22",
          title: "5. Ma trận trực giao",
          phase: 3,
          lessons: [
            "Bài 48: Định nghĩa ma trận trực giao",
            "Bài 49: Tính chất bảo toàn khoảng cách và góc",
            "Bài 50: Ma trận quay và ma trận phản xạ"
          ],
          desc: "Các phép biến đổi đẳng cự bảo toàn hình học."
        }
      ]
    },
    {
      id: "t5",
      title: "Chủ đề 5: Ánh xạ tuyến tính",
      phase: 3,
      sections: [
        {
          id: "s23",
          title: "1. Khái niệm ánh xạ tuyến tính",
          phase: 3,
          lessons: [
            "Bài 51: Định nghĩa ánh xạ tuyến tính",
            "Bài 52: Các tính chất cơ bản",
            "Bài 53: Ảnh của một tổ hợp tuyến tính"
          ],
          desc: "Phép biến đổi bảo toàn cấu trúc đại số tuyến tính."
        },
        {
          id: "s24",
          title: "2. Đơn cấu, toàn cấu, đẳng cấu",
          phase: 3,
          lessons: [
            "Bài 54: Điều kiện đơn cấu và toàn cấu",
            "Bài 55: Định lý đẳng cấu giữa các không gian cùng số chiều"
          ],
          desc: "Phân loại tính đơn ánh, toàn ánh và song ánh của ánh xạ."
        },
        {
          id: "topic5_kernel_image",
          sectionId: "s25",
          title: "3. Hạt nhân và ảnh",
          phase: 3,
          ready: true,
          formId: "topic5_linear_transformation",
          lessons: [
            "Bài 56: Định nghĩa Ker(T) và Im(T)",
            "Bài 57: Định lý số chiều (Rank-Nullity Theorem)"
          ],
          desc: "Trực quan hóa vùng không gian Ker(T) bị xẹp về gốc 0 và không gian ảnh đích Im(T)."
        },
        {
          id: "topic5_matrix_transform",
          sectionId: "s26",
          title: "4. Ma trận của ánh xạ tuyến tính",
          phase: 3,
          ready: true,
          formId: "topic5_linear_transformation",
          lessons: [
            "Bài 58: Cách lập ma trận theo cặp cơ sở",
            "Bài 59: Tác động của ma trận lên tọa độ vector"
          ],
          desc: "Biểu diễn đại số của phép biến hình không gian và mô phỏng biến đổi lưới."
        }
      ]
    },
    {
      id: "t6",
      title: "Chủ đề 6: Trị riêng và vector riêng",
      phase: 4,
      sections: [
        {
          id: "topic6_eigen",
          sectionId: "s27",
          title: "1. Trị riêng và vector riêng của ma trận",
          phase: 4,
          ready: true,
          formId: "topic6_eigen",
          lessons: [
            "Bài 60: Định nghĩa trị riêng, vector riêng",
            "Bài 61: Không gian riêng tương ứng với trị riêng"
          ],
          desc: "Săn tìm các hướng bất biến khi ma trận tác động và vẽ không gian riêng E_lambda."
        },
        {
          id: "topic6_char_poly",
          sectionId: "s28",
          title: "2. Đa thức đặc trưng và phương trình đặc trưng",
          phase: 4,
          ready: true,
          formId: "topic6_eigen",
          lessons: [
            "Bài 62: Phương trình det(A - lambda I) = 0",
            "Bài 63: Nghiệm của đa thức đặc trưng"
          ],
          desc: "Phương pháp giải tích tìm phổ trị riêng qua định thức det(A - lambda I)."
        },
        {
          id: "topic6_diagonalize",
          sectionId: "s29",
          title: "3. Chéo hóa ma trận",
          phase: 4,
          ready: true,
          formId: "topic6_eigen",
          lessons: [
            "Bài 64: Điều kiện cần và đủ để ma trận chéo hóa được",
            "Bài 65: Ma trận làm chéo P và ma trận chéo D"
          ],
          desc: "Tìm ma trận làm chéo P và ma trận chéo D = P^-1 A P."
        },
        {
          id: "topic6_symmetric_diag",
          sectionId: "s30",
          title: "4. Chéo hóa ma trận đối xứng bởi ma trận trực giao",
          phase: 4,
          ready: true,
          formId: "topic6_eigen",
          lessons: [
            "Bài 66: Định lý phổ cho ma trận đối xứng",
            "Bài 67: Các vector riêng trực giao từng đôi một"
          ],
          desc: "Khảo sát tính trực giao của các vector riêng trong ma trận đối xứng."
        },
        {
          id: "s31",
          title: "5. Trị riêng và vector riêng của ánh xạ tuyến tính",
          phase: 4,
          lessons: [
            "Bài 68: Khái niệm toán tử tuyến tính",
            "Bài 69: Trị riêng của toán tử"
          ],
          desc: "Bản chất hình học không phụ thuộc cơ sở biểu diễn."
        },
        {
          id: "s32",
          title: "6. Chéo hóa ánh xạ tuyến tính",
          phase: 4,
          lessons: [
            "Bài 70: Tìm cơ sở để ma trận ánh xạ có dạng chéo"
          ],
          desc: "Lựa chọn hệ quy chiếu tối ưu."
        },
        {
          id: "s33",
          title: "7. Ứng dụng của chéo hóa",
          phase: 4,
          lessons: [
            "Bài 71: Giải hệ phương trình vi phân tuyến tính",
            "Bài 72: Xích Markov và phân bố dừng"
          ],
          desc: "Ứng dụng trong khoa học dữ liệu và vật lý."
        }
      ]
    },
    {
      id: "t7",
      title: "Chủ đề 7: Dạng toàn phương",
      phase: 1,
      sections: [
        {
          id: "quadratic_form_conic",
          sectionId: "s35",
          title: "2. Dạng toàn phương và ma trận của dạng toàn phương",
          phase: 1,
          ready: true,
          formId: "quadratic_form_conic",
          desc: "Xác định ma trận đối xứng A, vẽ đường cong Parabol / Elip / Hyperbol và 2 trục vector riêng trên Canvas 2D."
        },
        {
          id: "quadratic_form_canonical",
          sectionId: "s36",
          title: "3. Đưa dạng toàn phương về dạng chính tắc",
          phase: 1,
          ready: true,
          formId: "quadratic_form_conic",
          desc: "Chéo hóa trực giao, hoạt họa nắn thẳng đường cong về hệ trục chính tắc Ox'y' mượt mà."
        },
        {
          id: "quadratic_form_sylvester",
          sectionId: "s37",
          title: "4. Xác định dấu của dạng toàn phương",
          phase: 1,
          ready: true,
          formId: "quadratic_form_conic",
          desc: "Kiểm tra dấu dạng toàn phương theo tiêu chuẩn Sylvester (xác định dương, âm, nửa xác định, không xác định)."
        },
        {
          id: "s34",
          title: "1. Dạng song tuyến tính",
          phase: 1,
          lessons: [
            "Bài 73: Định nghĩa dạng song tuyến tính",
            "Bài 74: Ma trận của dạng song tuyến tính trong một cơ sở"
          ],
          desc: "Khái niệm nền tảng của dạng toàn phương q(x) = B(x, x)."
        }
      ]
    }
  ];

  App.TopicsMeta = TOPICS_DATA;

  // Đăng ký module chủ đề vào registry
  App.registerTopicModule = function (topicId, moduleObj) {
    App.TopicModules[topicId] = moduleObj;
    if (typeof moduleObj.init === "function") {
      try {
        moduleObj.init();
      } catch (err) {
        console.error("Lỗi khởi tạo module " + topicId + ":", err);
      }
    }
  };

  // Nạp danh sách chức năng/bài toán tương ứng của một Chủ đề vào #opExtraSelect
  App.populateTopicTasks = function (topicId, targetTaskId) {
    const taskSelect = document.getElementById("opExtraSelect");
    if (!taskSelect) return;

    const topic = TOPICS_DATA.find((t) => t.id === topicId) || TOPICS_DATA[2]; // Mặc định Chủ đề 3
    taskSelect.innerHTML = "";

    topic.sections.forEach((sec) => {
      const opt = document.createElement("option");
      opt.value = sec.id;
      opt.textContent = sec.title;
      taskSelect.appendChild(opt);
    });

    // Chọn bài toán chỉ định hoặc bài toán đầu tiên
    let selectedId = targetTaskId;
    if (!selectedId || !topic.sections.some((s) => s.id === selectedId)) {
      // Ưu tiên chọn bài toán đã sẵn sàng (ready === true), nếu không thì chọn bài đầu tiên
      const readySec = topic.sections.find((s) => s.ready);
      selectedId = readySec ? readySec.id : topic.sections[0].id;
    }

    taskSelect.value = selectedId;
    App.switchTopicTask(selectedId);
  };

  // Khởi tạo điều khiển phân cấp 2 cấp trên Sidebar
  App.setupTopicsDropdown = function () {
    const catSelect = document.getElementById("topicCategorySelect");
    const taskSelect = document.getElementById("opExtraSelect");
    if (!taskSelect) return;

    // 1. Đồng bộ Dropdown Cấp 1 (Chủ đề)
    if (catSelect) {
      catSelect.innerHTML = "";
      TOPICS_DATA.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title;
        catSelect.appendChild(opt);
      });

      // Đọc trạng thái đã lưu trong sessionStorage nếu có, mặc định là Chủ đề 3
      const savedTopic = sessionStorage.getItem("vectoria_active_topic") || "t3";
      const topicExists = TOPICS_DATA.some((t) => t.id === savedTopic);
      const activeTopicId = topicExists ? savedTopic : "t3";
      catSelect.value = activeTopicId;

      // Lắng nghe sự kiện đổi Chủ đề -> Tự động nạp phần kế tiếp
      catSelect.addEventListener("change", function () {
        const newTopicId = this.value;
        sessionStorage.setItem("vectoria_active_topic", newTopicId);
        App.populateTopicTasks(newTopicId);
      });

      // Nạp danh sách bài toán ban đầu cho chủ đề đang chọn
      App.populateTopicTasks(activeTopicId);
    } else {
      // Fallback nếu giao diện chưa có #topicCategorySelect
      App.populateTopicTasks("t3");
    }

    // 2. Lắng nghe sự kiện đổi Bài toán (Cấp 2)
    taskSelect.addEventListener("change", function () {
      App.switchTopicTask(this.value);
    });
  };

  // Hiển thị khung xem trước thông tin bài học từ giáo trình cho các mục giai đoạn tiếp theo
  function renderTopicPreview(sec, topic) {
    const previewContent = document.getElementById("topicPreviewContent");
    if (!previewContent) return;

    let lessonsHtml = "";
    if (sec.lessons && sec.lessons.length > 0) {
      lessonsHtml = `
        <div style="margin-top: 10px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; letter-spacing: 0.5px;">
            Các bài học trong mục này:
          </div>
          <ul style="margin: 0; padding-left: 18px; color: var(--fg); font-size: 12px; line-height: 1.6;">
            ${sec.lessons.map((l) => `<li>${l}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    previewContent.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px;">
        <span style="font-size: 13px; font-weight: 700; color: var(--fg);">${sec.title}</span>
        <span style="display: inline-block; padding: 2px 7px; font-size: 10.5px; font-weight: 700; border-radius: 2px; background: rgba(0, 144, 255, 0.12); color: var(--primary-base); border: 1px solid rgba(0, 144, 255, 0.25); white-space: nowrap;">
          Giai đoạn ${sec.phase}
        </span>
      </div>
      <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
        ${sec.desc || "Nội dung học thuật được trích xuất từ đề cương 78 bài học của Vectoria."}
      </div>
      ${lessonsHtml}
      <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); display: flex; gap: 6px;">
        <button type="button" class="btn btn-secondary" style="flex: 1; padding: 7px 10px; font-size: 12px; border-radius: 4px;" onclick="document.querySelector('.sidebar-tabs .tab-btn')?.click();">
          Vào Tab Vector
        </button>
        <a href="knowledge_info.html" class="btn btn-secondary" style="flex: 1; padding: 7px 10px; font-size: 12px; border-radius: 4px; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
          Thư viện lý thuyết
        </a>
      </div>
    `;
  }

  // Điều phối chuyển đổi bài toán / chức năng
  App.switchTopicTask = function (taskId) {
    // 1. Tìm thông tin section trong dữ liệu chuẩn
    let foundSec = null;
    let foundTopic = null;
    for (const t of TOPICS_DATA) {
      const s = t.sections.find((sec) => sec.id === taskId);
      if (s) {
        foundSec = s;
        foundTopic = t;
        break;
      }
    }

    // 2. Dọn dẹp hook vẽ 2D tùy chỉnh khi chuyển khỏi bài toán đồ thị
    const isGraphicTask =
      taskId === "quadratic_form_conic" ||
      taskId === "quadratic_form_canonical" ||
      taskId === "quadratic_form_sylvester" ||
      taskId === "topic1_parametric_vector" ||
      taskId === "topic2_matrix_param" ||
      taskId === "topic2_matrix_system" ||
      taskId === "topic4_gram_schmidt" ||
      taskId === "topic4_orthogonality" ||
      taskId === "s20" ||
      taskId === "s21" ||
      taskId === "topic5_kernel_image" ||
      taskId === "topic5_matrix_transform" ||
      taskId === "s25" ||
      taskId === "s26" ||
      taskId === "topic6_eigen" ||
      taskId === "topic6_char_poly" ||
      taskId === "topic6_diagonalize" ||
      taskId === "topic6_symmetric_diag" ||
      taskId === "s27" ||
      taskId === "s28" ||
      taskId === "s29" ||
      taskId === "s30";

    if (!isGraphicTask) {
      App.custom2DDrawHook = null;
    }

    // 3. Chuyển đổi hiển thị form tương ứng trong #extraForms
    if (foundSec && foundSec.ready && foundSec.formId) {
      if (typeof App.showExtraForm === "function") {
        App.showExtraForm(foundSec.formId);
      }
    } else if (foundSec) {
      renderTopicPreview(foundSec, foundTopic);
      if (typeof App.showExtraForm === "function") {
        App.showExtraForm("topic-preview");
      }
    }

    // 4. Thông báo cho module phụ trách bài toán
    Object.keys(App.TopicModules).forEach((tId) => {
      const mod = App.TopicModules[tId];
      if (mod && typeof mod.onTaskSelect === "function") {
        mod.onTaskSelect(taskId);
      }
    });

    // 5. Yêu cầu vẽ lại Canvas nếu đang ở chế độ 2D
    if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
      Vec2D.draw2DAllVectors();
    }
  };

  // Tự động khởi chạy khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", function () {
    App.setupTopicsDropdown();
  });
})();
