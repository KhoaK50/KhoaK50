const MOCK_LIBRARY_DATA = {
  "topics": [
    {
      "id": "t1",
      "title": "KIẾN THỨC CHUẨN BỊ",
      "sections": [
        {
          "id": "s1",
          "title": "1. Vector ở phổ thông",
          "lessons": [
            {
              "id": "l1",
              "num": 1,
              "title": "Khái niệm vector, phương, hướng và độ dài",
              "complexity": 5,
              "time": 45,
              "abstract": "Mô tả chi tiết về Khái niệm vector, phương, hướng và độ dài",
              "contentHTML": "<div><p>Trong toán học và vật lý, <strong>vector</strong> là một đại lượng có cả độ lớn và hướng. Điều này khác biệt với <em>vô hướng</em> (scalar), là những đại lượng chỉ có độ lớn (như nhiệt độ, khối lượng).</p><h3>1. Khái niệm Vector</h3><p>Một vector thường được biểu diễn bằng một đoạn thẳng có mũi tên chỉ hướng. Ký hiệu phổ biến là <b>v&#8407;</b> hoặc <b>AB&#8407;</b> (vector đi từ điểm A đến điểm B).</p><div style=\"background:var(--s2); padding:16px; border-radius:8px; margin: 16px 0;\"><strong>Đặc điểm chính của vector <b>AB&#8407;</b>:</strong><ul style=\"margin-top:8px;\"><li><strong>Điểm đầu (gốc):</strong> Điểm A.</li><li><strong>Điểm cuối (ngọn):</strong> Điểm B.</li></ul></div><h3>2. Phương và Hướng của Vector</h3><p>Đây là hai khái niệm dễ gây nhầm lẫn nhưng rất quan trọng:</p><ul><li><strong>Phương (Line of action):</strong> Là đường thẳng chứa vector hoặc đường thẳng song song với vector đó. Hai vector có thể cùng phương nếu chúng nằm trên các đường thẳng song song.</li><li><strong>Hướng (Sense):</strong> Là chiều cụ thể trên phương đó (ví dụ: từ trái sang phải, từ A sang B). Hai vector cùng phương có thể <em>cùng hướng</em> hoặc <em>ngược hướng</em>.</li></ul><h3>3. Độ dài (Độ lớn) của Vector</h3><p>Độ dài của vector <b>AB&#8407;</b>, ký hiệu là |<b>AB&#8407;</b>|, là khoảng cách từ điểm đầu A đến điểm cuối B.</p><div style=\"background:var(--amber-fill, #fffbeb); color:var(--amber-text, #b45309); padding:16px; border-radius:8px; margin: 16px 0; border-left: 4px solid var(--amber, #f59e0b);\"><strong>Lưu ý:</strong> Vector có độ dài bằng 0 được gọi là <em>vector không</em> (<b>0&#8407;</b>). Vector không có điểm đầu và điểm cuối trùng nhau, cùng phương và cùng hướng với mọi vector.</div><h3>4. Ứng dụng thực tế</h3><p>Vector là nền tảng để mô tả lực, vận tốc, gia tốc trong không gian. Khi bạn đẩy một vật, bạn không chỉ quan tâm lực đẩy mạnh bao nhiêu (độ lớn), mà còn phải chú ý bạn đẩy về hướng nào (hướng). Đó chính là ứng dụng thực tế của vector.</p></div>"
            },
            {
              "id": "l2",
              "num": 2,
              "title": "Phép cộng, trừ vector và nhân vector với một số (quy tắc hình bình hành)",
              "complexity": 3,
              "time": 30,
              "abstract": "Mô tả chi tiết về Phép cộng, trừ vector và nhân vector với một số (quy tắc hình bình hành)",
              "contentHTML": "<h2>Phép cộng, trừ vector và nhân vector với một số (quy tắc hình bình hành)</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l3",
              "num": 3,
              "title": "Biểu diễn tọa độ của vector trong không gian 2D và 3D.",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Biểu diễn tọa độ của vector trong không gian 2D và 3D.",
              "contentHTML": "<h2>Biểu diễn tọa độ của vector trong không gian 2D và 3D.</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s2",
          "title": "2. Ánh xạ",
          "lessons": [
            {
              "id": "l4",
              "num": 4,
              "title": "Định nghĩa ánh xạ, tập nguồn, tập đích",
              "complexity": 4,
              "time": 50,
              "abstract": "Mô tả chi tiết về Định nghĩa ánh xạ, tập nguồn, tập đích",
              "contentHTML": "<h2>Định nghĩa ánh xạ, tập nguồn, tập đích</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l5",
              "num": 5,
              "title": "Đơn ánh, toàn ánh, song ánh",
              "complexity": 3,
              "time": 60,
              "abstract": "Mô tả chi tiết về Đơn ánh, toàn ánh, song ánh",
              "contentHTML": "<h2>Đơn ánh, toàn ánh, song ánh</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l6",
              "num": 6,
              "title": "Ánh xạ ngược và ánh xạ hợp",
              "complexity": 8,
              "time": 45,
              "abstract": "Mô tả chi tiết về Ánh xạ ngược và ánh xạ hợp",
              "contentHTML": "<h2>Ánh xạ ngược và ánh xạ hợp</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s3",
          "title": "3. Phép thế",
          "lessons": [
            {
              "id": "l7",
              "num": 7,
              "title": "Định nghĩa phép thế, phép thế đồng nhất",
              "complexity": 7,
              "time": 50,
              "abstract": "Mô tả chi tiết về Định nghĩa phép thế, phép thế đồng nhất",
              "contentHTML": "<h2>Định nghĩa phép thế, phép thế đồng nhất</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l8",
              "num": 8,
              "title": "Phép nhân hai phép thế",
              "complexity": 3,
              "time": 60,
              "abstract": "Mô tả chi tiết về Phép nhân hai phép thế",
              "contentHTML": "<h2>Phép nhân hai phép thế</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l9",
              "num": 9,
              "title": "Nghịch thế",
              "complexity": 7,
              "time": 60,
              "abstract": "Mô tả chi tiết về Nghịch thế",
              "contentHTML": "<h2>Nghịch thế</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l10",
              "num": 10,
              "title": "Dấu của phép thế",
              "complexity": 3,
              "time": 45,
              "abstract": "Mô tả chi tiết về Dấu của phép thế",
              "contentHTML": "<h2>Dấu của phép thế</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    },
    {
      "id": "t2",
      "title": "MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
      "sections": [
        {
          "id": "s4",
          "title": "1. Ma trận và các phép toán",
          "lessons": [
            {
              "id": "l11",
              "num": 11,
              "title": "Khái niệm ma trận và các loại ma trận đặc biệt",
              "complexity": 3,
              "time": 45,
              "abstract": "Mô tả chi tiết về Khái niệm ma trận và các loại ma trận đặc biệt",
              "contentHTML": "<h2>Khái niệm ma trận và các loại ma trận đặc biệt</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l12",
              "num": 12,
              "title": "Phép toán cộng ma trận và nhân ma trận với một số vô hướng",
              "complexity": 3,
              "time": 60,
              "abstract": "Mô tả chi tiết về Phép toán cộng ma trận và nhân ma trận với một số vô hướng",
              "contentHTML": "<h2>Phép toán cộng ma trận và nhân ma trận với một số vô hướng</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l13",
              "num": 13,
              "title": "Phép nhân hai ma trận và phép chuyển vị ma trận",
              "complexity": 5,
              "time": 50,
              "abstract": "Mô tả chi tiết về Phép nhân hai ma trận và phép chuyển vị ma trận",
              "contentHTML": "<h2>Phép nhân hai ma trận và phép chuyển vị ma trận</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s5",
          "title": "2. Hạng ma trận",
          "lessons": [
            {
              "id": "l14",
              "num": 14,
              "title": "Các phép biến đổi sơ cấp trên dòng/cột",
              "complexity": 4,
              "time": 60,
              "abstract": "Mô tả chi tiết về Các phép biến đổi sơ cấp trên dòng/cột",
              "contentHTML": "<h2>Các phép biến đổi sơ cấp trên dòng/cột</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l15",
              "num": 15,
              "title": "Ma trận bậc thang, ma trận bậc thang rút gọn và cách đưa ma trận về dạng bậc thang",
              "complexity": 3,
              "time": 45,
              "abstract": "Mô tả chi tiết về Ma trận bậc thang, ma trận bậc thang rút gọn và cách đưa ma trận về dạng bậc thang",
              "contentHTML": "<h2>Ma trận bậc thang, ma trận bậc thang rút gọn và cách đưa ma trận về dạng bậc thang</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l16",
              "num": 16,
              "title": "Định nghĩa và phương pháp tìm hạng của ma trận",
              "complexity": 5,
              "time": 60,
              "abstract": "Mô tả chi tiết về Định nghĩa và phương pháp tìm hạng của ma trận",
              "contentHTML": "<h2>Định nghĩa và phương pháp tìm hạng của ma trận</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s6",
          "title": "3. Định thức",
          "lessons": [
            {
              "id": "l17",
              "num": 17,
              "title": "Định nghĩa định thức thông qua phép thế",
              "complexity": 4,
              "time": 50,
              "abstract": "Mô tả chi tiết về Định nghĩa định thức thông qua phép thế",
              "contentHTML": "<h2>Định nghĩa định thức thông qua phép thế</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l18",
              "num": 18,
              "title": "Khai triển định thức theo dòng, cột (khai triển Laplace)",
              "complexity": 6,
              "time": 45,
              "abstract": "Mô tả chi tiết về Khai triển định thức theo dòng, cột (khai triển Laplace)",
              "contentHTML": "<h2>Khai triển định thức theo dòng, cột (khai triển Laplace)</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l19",
              "num": 19,
              "title": "Các tính chất của định thức và ứng dụng tính toán",
              "complexity": 4,
              "time": 45,
              "abstract": "Mô tả chi tiết về Các tính chất của định thức và ứng dụng tính toán",
              "contentHTML": "<h2>Các tính chất của định thức và ứng dụng tính toán</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s7",
          "title": "4. Ma trận nghịch đảo",
          "lessons": [
            {
              "id": "l20",
              "num": 20,
              "title": "Định nghĩa và điều kiện tồn tại ma trận nghịch đảo",
              "complexity": 6,
              "time": 45,
              "abstract": "Mô tả chi tiết về Định nghĩa và điều kiện tồn tại ma trận nghịch đảo",
              "contentHTML": "<h2>Định nghĩa và điều kiện tồn tại ma trận nghịch đảo</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l21",
              "num": 21,
              "title": "Tìm ma trận nghịch đảo bằng phương pháp khử Gauss-Jordan",
              "complexity": 3,
              "time": 30,
              "abstract": "Mô tả chi tiết về Tìm ma trận nghịch đảo bằng phương pháp khử Gauss-Jordan",
              "contentHTML": "<h2>Tìm ma trận nghịch đảo bằng phương pháp khử Gauss-Jordan</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l22",
              "num": 22,
              "title": "Tìm ma trận nghịch đảo bằng ma trận phụ hợp",
              "complexity": 6,
              "time": 45,
              "abstract": "Mô tả chi tiết về Tìm ma trận nghịch đảo bằng ma trận phụ hợp",
              "contentHTML": "<h2>Tìm ma trận nghịch đảo bằng ma trận phụ hợp</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s8",
          "title": "5. Hệ phương trình tuyến tính",
          "lessons": [
            {
              "id": "l23",
              "num": 23,
              "title": "Định nghĩa hệ phương trình tuyến tính",
              "complexity": 4,
              "time": 30,
              "abstract": "Mô tả chi tiết về Định nghĩa hệ phương trình tuyến tính",
              "contentHTML": "<h2>Định nghĩa hệ phương trình tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l24",
              "num": 24,
              "title": "Giải hệ phương trình bằng quy tắc Cramer",
              "complexity": 4,
              "time": 45,
              "abstract": "Mô tả chi tiết về Giải hệ phương trình bằng quy tắc Cramer",
              "contentHTML": "<h2>Giải hệ phương trình bằng quy tắc Cramer</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l25",
              "num": 25,
              "title": "Giải hệ phương trình bằng phương pháp Gauss",
              "complexity": 7,
              "time": 45,
              "abstract": "Mô tả chi tiết về Giải hệ phương trình bằng phương pháp Gauss",
              "contentHTML": "<h2>Giải hệ phương trình bằng phương pháp Gauss</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l26",
              "num": 26,
              "title": "Định lý Kronecker-Capelli (điều kiện có nghiệm)",
              "complexity": 7,
              "time": 30,
              "abstract": "Mô tả chi tiết về Định lý Kronecker-Capelli (điều kiện có nghiệm)",
              "contentHTML": "<h2>Định lý Kronecker-Capelli (điều kiện có nghiệm)</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l27",
              "num": 27,
              "title": "Hệ phương trình tuyến tính thuần nhất",
              "complexity": 6,
              "time": 30,
              "abstract": "Mô tả chi tiết về Hệ phương trình tuyến tính thuần nhất",
              "contentHTML": "<h2>Hệ phương trình tuyến tính thuần nhất</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l28",
              "num": 28,
              "title": "Không gian nghiệm của hệ phương trình",
              "complexity": 4,
              "time": 30,
              "abstract": "Mô tả chi tiết về Không gian nghiệm của hệ phương trình",
              "contentHTML": "<h2>Không gian nghiệm của hệ phương trình</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    },
    {
      "id": "t3",
      "title": "KHÔNG GIAN TUYẾN TÍNH",
      "sections": [
        {
          "id": "s9",
          "title": "1. Khái niệm không gian vector",
          "lessons": [
            {
              "id": "l29",
              "num": 29,
              "title": "8 tiên đề của không gian vector",
              "complexity": 7,
              "time": 45,
              "abstract": "Mô tả chi tiết về 8 tiên đề của không gian vector",
              "contentHTML": "<h2>8 tiên đề của không gian vector</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l30",
              "num": 30,
              "title": "Các không gian vector quen thuộc",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Các không gian vector quen thuộc",
              "contentHTML": "<h2>Các không gian vector quen thuộc</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s10",
          "title": "2. Không gian vector con",
          "lessons": [
            {
              "id": "l31",
              "num": 31,
              "title": "Điều kiện để một tập hợp là không gian vector con",
              "complexity": 8,
              "time": 50,
              "abstract": "Mô tả chi tiết về Điều kiện để một tập hợp là không gian vector con",
              "contentHTML": "<h2>Điều kiện để một tập hợp là không gian vector con</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l32",
              "num": 32,
              "title": "Giao và hợp của các không gian con",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Giao và hợp của các không gian con",
              "contentHTML": "<h2>Giao và hợp của các không gian con</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s11",
          "title": "3. Tổ hợp tuyến tính",
          "lessons": [
            {
              "id": "l33",
              "num": 33,
              "title": "Định nghĩa tổ hợp tuyến tính",
              "complexity": 5,
              "time": 30,
              "abstract": "Mô tả chi tiết về Định nghĩa tổ hợp tuyến tính",
              "contentHTML": "<h2>Định nghĩa tổ hợp tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l34",
              "num": 34,
              "title": "Bao tuyến tính (span) và ý nghĩa hình học",
              "complexity": 7,
              "time": 30,
              "abstract": "Mô tả chi tiết về Bao tuyến tính (span) và ý nghĩa hình học",
              "contentHTML": "<h2>Bao tuyến tính (span) và ý nghĩa hình học</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s12",
          "title": "4. Độc lập - phụ thuộc tuyến tính",
          "lessons": [
            {
              "id": "l35",
              "num": 35,
              "title": "Định nghĩa hệ độc lập tuyến tính và hệ phụ thuộc tuyến tính",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Định nghĩa hệ độc lập tuyến tính và hệ phụ thuộc tuyến tính",
              "contentHTML": "<h2>Định nghĩa hệ độc lập tuyến tính và hệ phụ thuộc tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l36",
              "num": 36,
              "title": "Nhận biết hệ độc lập/phụ thuộc tuyến tính qua định thức hoặc hạng",
              "complexity": 4,
              "time": 50,
              "abstract": "Mô tả chi tiết về Nhận biết hệ độc lập/phụ thuộc tuyến tính qua định thức hoặc hạng",
              "contentHTML": "<h2>Nhận biết hệ độc lập/phụ thuộc tuyến tính qua định thức hoặc hạng</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s13",
          "title": "5. Hạng của hệ vector",
          "lessons": [
            {
              "id": "l37",
              "num": 37,
              "title": "Định nghĩa hạng của hệ vector",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Định nghĩa hạng của hệ vector",
              "contentHTML": "<h2>Định nghĩa hạng của hệ vector</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l38",
              "num": 38,
              "title": "Cách tính hạng hệ vector thông qua ma trận",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Cách tính hạng hệ vector thông qua ma trận",
              "contentHTML": "<h2>Cách tính hạng hệ vector thông qua ma trận</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s14",
          "title": "6. Hệ sinh của không gian vector",
          "lessons": [
            {
              "id": "l39",
              "num": 39,
              "title": "Định nghĩa hệ sinh và tập sinh",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Định nghĩa hệ sinh và tập sinh",
              "contentHTML": "<h2>Định nghĩa hệ sinh và tập sinh</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s15",
          "title": "7. Cơ sở và số chiều",
          "lessons": [
            {
              "id": "l40",
              "num": 40,
              "title": "Định nghĩa cơ sở của một không gian vector",
              "complexity": 5,
              "time": 45,
              "abstract": "Mô tả chi tiết về Định nghĩa cơ sở của một không gian vector",
              "contentHTML": "<h2>Định nghĩa cơ sở của một không gian vector</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l41",
              "num": 41,
              "title": "Khái niệm số chiều",
              "complexity": 6,
              "time": 50,
              "abstract": "Mô tả chi tiết về Khái niệm số chiều",
              "contentHTML": "<h2>Khái niệm số chiều</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l42",
              "num": 42,
              "title": "Cách tìm cơ sở và số chiều cho không gian nghiệm hoặc không gian con sinh bởi hệ vector",
              "complexity": 6,
              "time": 50,
              "abstract": "Mô tả chi tiết về Cách tìm cơ sở và số chiều cho không gian nghiệm hoặc không gian con sinh bởi hệ vector",
              "contentHTML": "<h2>Cách tìm cơ sở và số chiều cho không gian nghiệm hoặc không gian con sinh bởi hệ vector</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s16",
          "title": "8. Tọa độ của vector đối với một cơ sở",
          "lessons": [
            {
              "id": "l43",
              "num": 43,
              "title": "Định nghĩa tọa độ của vector",
              "complexity": 6,
              "time": 50,
              "abstract": "Mô tả chi tiết về Định nghĩa tọa độ của vector",
              "contentHTML": "<h2>Định nghĩa tọa độ của vector</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l44",
              "num": 44,
              "title": "Cách tính tọa độ khi biết cơ sở",
              "complexity": 8,
              "time": 45,
              "abstract": "Mô tả chi tiết về Cách tính tọa độ khi biết cơ sở",
              "contentHTML": "<h2>Cách tính tọa độ khi biết cơ sở</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s17",
          "title": "9. Ma trận chuyển cơ sở",
          "lessons": [
            {
              "id": "l45",
              "num": 45,
              "title": "Xây dựng ma trận chuyển cơ sở từ cơ sở cũ sang cơ sở mới",
              "complexity": 8,
              "time": 30,
              "abstract": "Mô tả chi tiết về Xây dựng ma trận chuyển cơ sở từ cơ sở cũ sang cơ sở mới",
              "contentHTML": "<h2>Xây dựng ma trận chuyển cơ sở từ cơ sở cũ sang cơ sở mới</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l46",
              "num": 46,
              "title": "Công thức đổi tọa độ của một vector qua các cơ sở khác nhau",
              "complexity": 5,
              "time": 45,
              "abstract": "Mô tả chi tiết về Công thức đổi tọa độ của một vector qua các cơ sở khác nhau",
              "contentHTML": "<h2>Công thức đổi tọa độ của một vector qua các cơ sở khác nhau</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    },
    {
      "id": "t4",
      "title": "KHÔNG GIAN EUCLIDE",
      "sections": [
        {
          "id": "s18",
          "title": "1. Tích vô hướng của hai vector và định nghĩa không gian Euclide",
          "lessons": [
            {
              "id": "l47",
              "num": 47,
              "title": "Tích vô hướng của hai vector",
              "complexity": 7,
              "time": 45,
              "abstract": "Mô tả chi tiết về Tích vô hướng của hai vector",
              "contentHTML": "<h2>Tích vô hướng của hai vector</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l48",
              "num": 48,
              "title": "Không gian Euclide",
              "complexity": 5,
              "time": 60,
              "abstract": "Mô tả chi tiết về Không gian Euclide",
              "contentHTML": "<h2>Không gian Euclide</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s19",
          "title": "2. Khái niệm không gian Euclide và các phép toán",
          "lessons": [
            {
              "id": "l49",
              "num": 49,
              "title": "Định nghĩa độ dài vector (chuẩn) và bất đẳng thức Cauchy-Schwarz",
              "complexity": 7,
              "time": 30,
              "abstract": "Mô tả chi tiết về Định nghĩa độ dài vector (chuẩn) và bất đẳng thức Cauchy-Schwarz",
              "contentHTML": "<h2>Định nghĩa độ dài vector (chuẩn) và bất đẳng thức Cauchy-Schwarz</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l50",
              "num": 50,
              "title": "Định nghĩa góc giữa hai vector và khoảng cách",
              "complexity": 7,
              "time": 30,
              "abstract": "Mô tả chi tiết về Định nghĩa góc giữa hai vector và khoảng cách",
              "contentHTML": "<h2>Định nghĩa góc giữa hai vector và khoảng cách</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s20",
          "title": "3. Sự trực giao, cơ sở trực giao và trực chuẩn",
          "lessons": [
            {
              "id": "l51",
              "num": 51,
              "title": "Hệ vector trực giao và trực chuẩn",
              "complexity": 7,
              "time": 50,
              "abstract": "Mô tả chi tiết về Hệ vector trực giao và trực chuẩn",
              "contentHTML": "<h2>Hệ vector trực giao và trực chuẩn</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l52",
              "num": 52,
              "title": "Tìm tọa độ của vector trong một cơ sở trực chuẩn",
              "complexity": 3,
              "time": 60,
              "abstract": "Mô tả chi tiết về Tìm tọa độ của vector trong một cơ sở trực chuẩn",
              "contentHTML": "<h2>Tìm tọa độ của vector trong một cơ sở trực chuẩn</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s21",
          "title": "4. Thuật toán trực giao hóa Gram - Schmidt",
          "lessons": [
            {
              "id": "l53",
              "num": 53,
              "title": "Thuật toán trực giao hóa Gram - Schmidt",
              "complexity": 8,
              "time": 50,
              "abstract": "Mô tả chi tiết về Thuật toán trực giao hóa Gram - Schmidt",
              "contentHTML": "<h2>Thuật toán trực giao hóa Gram - Schmidt</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s22",
          "title": "5. Ma trận trực giao",
          "lessons": [
            {
              "id": "l54",
              "num": 54,
              "title": "Ma trận trực giao",
              "complexity": 6,
              "time": 45,
              "abstract": "Mô tả chi tiết về Ma trận trực giao",
              "contentHTML": "<h2>Ma trận trực giao</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    },
    {
      "id": "t5",
      "title": "ÁNH XẠ TUYẾN TÍNH",
      "sections": [
        {
          "id": "s23",
          "title": "1. Khái niệm ánh xạ tuyến tính",
          "lessons": [
            {
              "id": "l55",
              "num": 55,
              "title": "Định nghĩa ánh xạ tuyến tính, toán tử tuyến tính",
              "complexity": 8,
              "time": 60,
              "abstract": "Mô tả chi tiết về Định nghĩa ánh xạ tuyến tính, toán tử tuyến tính",
              "contentHTML": "<h2>Định nghĩa ánh xạ tuyến tính, toán tử tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l56",
              "num": 56,
              "title": "Các phép toán trên ánh xạ tuyến tính (phép cộng, nhân vô hướng, ánh xạ hợp)",
              "complexity": 4,
              "time": 45,
              "abstract": "Mô tả chi tiết về Các phép toán trên ánh xạ tuyến tính (phép cộng, nhân vô hướng, ánh xạ hợp)",
              "contentHTML": "<h2>Các phép toán trên ánh xạ tuyến tính (phép cộng, nhân vô hướng, ánh xạ hợp)</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s24",
          "title": "2. Đơn cấu, toàn cấu, đẳng cấu",
          "lessons": [
            {
              "id": "l57",
              "num": 57,
              "title": "Đơn cấu, toàn cấu, đẳng cấu",
              "complexity": 4,
              "time": 30,
              "abstract": "Mô tả chi tiết về Đơn cấu, toàn cấu, đẳng cấu",
              "contentHTML": "<h2>Đơn cấu, toàn cấu, đẳng cấu</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s25",
          "title": "3. Hạt nhân và ảnh",
          "lessons": [
            {
              "id": "l58",
              "num": 58,
              "title": "Định nghĩa và cách tìm không gian hạt nhân (ker) của ánh xạ tuyến tính",
              "complexity": 8,
              "time": 45,
              "abstract": "Mô tả chi tiết về Định nghĩa và cách tìm không gian hạt nhân (ker) của ánh xạ tuyến tính",
              "contentHTML": "<h2>Định nghĩa và cách tìm không gian hạt nhân (ker) của ánh xạ tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l59",
              "num": 59,
              "title": "Định nghĩa và cách tìm không gian ảnh (Im) của ánh xạ tuyến tính",
              "complexity": 5,
              "time": 45,
              "abstract": "Mô tả chi tiết về Định nghĩa và cách tìm không gian ảnh (Im) của ánh xạ tuyến tính",
              "contentHTML": "<h2>Định nghĩa và cách tìm không gian ảnh (Im) của ánh xạ tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l60",
              "num": 60,
              "title": "Định lý về số chiều",
              "complexity": 8,
              "time": 45,
              "abstract": "Mô tả chi tiết về Định lý về số chiều",
              "contentHTML": "<h2>Định lý về số chiều</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s26",
          "title": "4. Ma trận của ánh xạ tuyến tính",
          "lessons": [
            {
              "id": "l61",
              "num": 61,
              "title": "Ma trận của ánh xạ tuyến tính trong một cặp cơ sở",
              "complexity": 3,
              "time": 60,
              "abstract": "Mô tả chi tiết về Ma trận của ánh xạ tuyến tính trong một cặp cơ sở",
              "contentHTML": "<h2>Ma trận của ánh xạ tuyến tính trong một cặp cơ sở</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l62",
              "num": 62,
              "title": "Công thức đổi tọa độ trong ánh xạ tuyến tính",
              "complexity": 7,
              "time": 60,
              "abstract": "Mô tả chi tiết về Công thức đổi tọa độ trong ánh xạ tuyến tính",
              "contentHTML": "<h2>Công thức đổi tọa độ trong ánh xạ tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l63",
              "num": 63,
              "title": "Ma trận đồng dạng",
              "complexity": 4,
              "time": 30,
              "abstract": "Mô tả chi tiết về Ma trận đồng dạng",
              "contentHTML": "<h2>Ma trận đồng dạng</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    },
    {
      "id": "t6",
      "title": "TRỊ RIÊNG VÀ VECTOR RIÊNG",
      "sections": [
        {
          "id": "s27",
          "title": "1. Trị riêng và vector riêng của ma trận",
          "lessons": [
            {
              "id": "l64",
              "num": 64,
              "title": "Trị riêng và vector riêng của ma trận",
              "complexity": 6,
              "time": 30,
              "abstract": "Mô tả chi tiết về Trị riêng và vector riêng của ma trận",
              "contentHTML": "<h2>Trị riêng và vector riêng của ma trận</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s28",
          "title": "2. Đa thức đặc trưng và phương trình đặc trưng",
          "lessons": [
            {
              "id": "l65",
              "num": 65,
              "title": "Thiết lập và giải phương trình đặc trưng",
              "complexity": 6,
              "time": 60,
              "abstract": "Mô tả chi tiết về Thiết lập và giải phương trình đặc trưng",
              "contentHTML": "<h2>Thiết lập và giải phương trình đặc trưng</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l66",
              "num": 66,
              "title": "Tìm không gian con riêng ứng với vector riêng",
              "complexity": 5,
              "time": 60,
              "abstract": "Mô tả chi tiết về Tìm không gian con riêng ứng với vector riêng",
              "contentHTML": "<h2>Tìm không gian con riêng ứng với vector riêng</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s29",
          "title": "3. Chéo hóa ma trận",
          "lessons": [
            {
              "id": "l67",
              "num": 67,
              "title": "Điều kiện để một ma trận chéo hóa được",
              "complexity": 7,
              "time": 60,
              "abstract": "Mô tả chi tiết về Điều kiện để một ma trận chéo hóa được",
              "contentHTML": "<h2>Điều kiện để một ma trận chéo hóa được</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l68",
              "num": 68,
              "title": "Các bước tìm ma trận làm chéo hóa và ma trận đường chéo",
              "complexity": 7,
              "time": 50,
              "abstract": "Mô tả chi tiết về Các bước tìm ma trận làm chéo hóa và ma trận đường chéo",
              "contentHTML": "<h2>Các bước tìm ma trận làm chéo hóa và ma trận đường chéo</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s30",
          "title": "4. Chéo hóa ma trận đối xứng bởi ma trận trực giao",
          "lessons": [
            {
              "id": "l69",
              "num": 69,
              "title": "Chéo hóa ma trận đối xứng bởi ma trận trực giao",
              "complexity": 8,
              "time": 30,
              "abstract": "Mô tả chi tiết về Chéo hóa ma trận đối xứng bởi ma trận trực giao",
              "contentHTML": "<h2>Chéo hóa ma trận đối xứng bởi ma trận trực giao</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s31",
          "title": "5. Trị riêng và vector riêng của ánh xạ tuyến tính",
          "lessons": [
            {
              "id": "l70",
              "num": 70,
              "title": "Trị riêng và vector riêng của ánh xạ tuyến tính",
              "complexity": 5,
              "time": 45,
              "abstract": "Mô tả chi tiết về Trị riêng và vector riêng của ánh xạ tuyến tính",
              "contentHTML": "<h2>Trị riêng và vector riêng của ánh xạ tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s32",
          "title": "6. Chéo hóa ánh xạ tuyến tính",
          "lessons": [
            {
              "id": "l71",
              "num": 71,
              "title": "Chéo hóa ánh xạ tuyến tính",
              "complexity": 5,
              "time": 50,
              "abstract": "Mô tả chi tiết về Chéo hóa ánh xạ tuyến tính",
              "contentHTML": "<h2>Chéo hóa ánh xạ tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s33",
          "title": "7. Ứng dụng của chéo hóa",
          "lessons": [
            {
              "id": "l72",
              "num": 72,
              "title": "Tính lũy thừa của ma trận",
              "complexity": 7,
              "time": 45,
              "abstract": "Mô tả chi tiết về Tính lũy thừa của ma trận",
              "contentHTML": "<h2>Tính lũy thừa của ma trận</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    },
    {
      "id": "t7",
      "title": "DẠNG TOÀN PHƯƠNG",
      "sections": [
        {
          "id": "s34",
          "title": "1. Dạng song tuyến tính",
          "lessons": [
            {
              "id": "l73",
              "num": 73,
              "title": "Dạng song tuyến tính",
              "complexity": 6,
              "time": 50,
              "abstract": "Mô tả chi tiết về Dạng song tuyến tính",
              "contentHTML": "<h2>Dạng song tuyến tính</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s35",
          "title": "2. Dạng toàn phương và ma trận của dạng toàn phương",
          "lessons": [
            {
              "id": "l74",
              "num": 74,
              "title": "Dạng toàn phương và ma trận của dạng toàn phương",
              "complexity": 4,
              "time": 45,
              "abstract": "Mô tả chi tiết về Dạng toàn phương và ma trận của dạng toàn phương",
              "contentHTML": "<h2>Dạng toàn phương và ma trận của dạng toàn phương</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s36",
          "title": "3. Đưa dạng toàn phương về dạng chính tắc",
          "lessons": [
            {
              "id": "l75",
              "num": 75,
              "title": "Phương pháp Lagrange",
              "complexity": 5,
              "time": 60,
              "abstract": "Mô tả chi tiết về Phương pháp Lagrange",
              "contentHTML": "<h2>Phương pháp Lagrange</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l76",
              "num": 76,
              "title": "Phương pháp Jacobi",
              "complexity": 7,
              "time": 50,
              "abstract": "Mô tả chi tiết về Phương pháp Jacobi",
              "contentHTML": "<h2>Phương pháp Jacobi</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            },
            {
              "id": "l77",
              "num": 77,
              "title": "Phương pháp biến đổi trực giao",
              "complexity": 7,
              "time": 45,
              "abstract": "Mô tả chi tiết về Phương pháp biến đổi trực giao",
              "contentHTML": "<h2>Phương pháp biến đổi trực giao</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        },
        {
          "id": "s37",
          "title": "4. Xác định dấu của dạng toàn phương",
          "lessons": [
            {
              "id": "l78",
              "num": 78,
              "title": "Tiêu chuẩn Sylvester",
              "complexity": 7,
              "time": 50,
              "abstract": "Mô tả chi tiết về Tiêu chuẩn Sylvester",
              "contentHTML": "<h2>Tiêu chuẩn Sylvester</h2><p>Nội dung chi tiết sẽ được bổ sung từ Backend.</p>"
            }
          ]
        }
      ]
    }
  ],
  "graph": {
    "nodes": [
      {
        "id": "l1",
        "num": 1,
        "label": "Khái niệm vector, phương, hướng và độ dài",
        "group": "s1",
        "value": 8,
        "time": 45,
        "color": "#1d2bcb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 1. Vector ở phổ thông"
      },
      {
        "id": "l2",
        "num": 2,
        "label": "Phép cộng, trừ vector và nhân vector với một số (quy tắc hình bình hành)",
        "group": "s1",
        "value": 6,
        "time": 30,
        "color": "#1d2bcb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 1. Vector ở phổ thông"
      },
      {
        "id": "l3",
        "num": 3,
        "label": "Biểu diễn tọa độ của vector trong không gian 2D và 3D.",
        "group": "s1",
        "value": 6,
        "time": 60,
        "color": "#1d2bcb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 1. Vector ở phổ thông"
      },
      {
        "id": "l4",
        "num": 4,
        "label": "Định nghĩa ánh xạ, tập nguồn, tập đích",
        "group": "s2",
        "value": 9,
        "time": 50,
        "color": "#5c51e5",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 2. Ánh xạ"
      },
      {
        "id": "l5",
        "num": 5,
        "label": "Đơn ánh, toàn ánh, song ánh",
        "group": "s2",
        "value": 6,
        "time": 60,
        "color": "#5c51e5",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 2. Ánh xạ"
      },
      {
        "id": "l6",
        "num": 6,
        "label": "Ánh xạ ngược và ánh xạ hợp",
        "group": "s2",
        "value": 9,
        "time": 45,
        "color": "#5c51e5",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 2. Ánh xạ"
      },
      {
        "id": "l7",
        "num": 7,
        "label": "Định nghĩa phép thế, phép thế đồng nhất",
        "group": "s3",
        "value": 10,
        "time": 50,
        "color": "#dc8abb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 3. Phép thế"
      },
      {
        "id": "l8",
        "num": 8,
        "label": "Phép nhân hai phép thế",
        "group": "s3",
        "value": 5,
        "time": 60,
        "color": "#dc8abb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 3. Phép thế"
      },
      {
        "id": "l9",
        "num": 9,
        "label": "Nghịch thế",
        "group": "s3",
        "value": 7,
        "time": 60,
        "color": "#dc8abb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 3. Phép thế"
      },
      {
        "id": "l10",
        "num": 10,
        "label": "Dấu của phép thế",
        "group": "s3",
        "value": 8,
        "time": 45,
        "color": "#dc8abb",
        "title": "<b>Chủ đề:</b> KIẾN THỨC CHUẨN BỊ<br><b>Đề mục:</b> 3. Phép thế"
      },
      {
        "id": "l11",
        "num": 11,
        "label": "Khái niệm ma trận và các loại ma trận đặc biệt",
        "group": "s4",
        "value": 9,
        "time": 45,
        "color": "#d05895",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 1. Ma trận và các phép toán"
      },
      {
        "id": "l12",
        "num": 12,
        "label": "Phép toán cộng ma trận và nhân ma trận với một số vô hướng",
        "group": "s4",
        "value": 7,
        "time": 60,
        "color": "#d05895",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 1. Ma trận và các phép toán"
      },
      {
        "id": "l13",
        "num": 13,
        "label": "Phép nhân hai ma trận và phép chuyển vị ma trận",
        "group": "s4",
        "value": 10,
        "time": 50,
        "color": "#d05895",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 1. Ma trận và các phép toán"
      },
      {
        "id": "l14",
        "num": 14,
        "label": "Các phép biến đổi sơ cấp trên dòng/cột",
        "group": "s5",
        "value": 8,
        "time": 60,
        "color": "#e5359d",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 2. Hạng ma trận"
      },
      {
        "id": "l15",
        "num": 15,
        "label": "Ma trận bậc thang, ma trận bậc thang rút gọn và cách đưa ma trận về dạng bậc thang",
        "group": "s5",
        "value": 7,
        "time": 45,
        "color": "#e5359d",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 2. Hạng ma trận"
      },
      {
        "id": "l16",
        "num": 16,
        "label": "Định nghĩa và phương pháp tìm hạng của ma trận",
        "group": "s5",
        "value": 8,
        "time": 60,
        "color": "#e5359d",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 2. Hạng ma trận"
      },
      {
        "id": "l17",
        "num": 17,
        "label": "Định nghĩa định thức thông qua phép thế",
        "group": "s6",
        "value": 10,
        "time": 50,
        "color": "#64bee6",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 3. Định thức"
      },
      {
        "id": "l18",
        "num": 18,
        "label": "Khai triển định thức theo dòng, cột (khai triển Laplace)",
        "group": "s6",
        "value": 6,
        "time": 45,
        "color": "#64bee6",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 3. Định thức"
      },
      {
        "id": "l19",
        "num": 19,
        "label": "Các tính chất của định thức và ứng dụng tính toán",
        "group": "s6",
        "value": 5,
        "time": 45,
        "color": "#64bee6",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 3. Định thức"
      },
      {
        "id": "l20",
        "num": 20,
        "label": "Định nghĩa và điều kiện tồn tại ma trận nghịch đảo",
        "group": "s7",
        "value": 8,
        "time": 45,
        "color": "#b98ffb",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 4. Ma trận nghịch đảo"
      },
      {
        "id": "l21",
        "num": 21,
        "label": "Tìm ma trận nghịch đảo bằng phương pháp khử Gauss-Jordan",
        "group": "s7",
        "value": 9,
        "time": 30,
        "color": "#b98ffb",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 4. Ma trận nghịch đảo"
      },
      {
        "id": "l22",
        "num": 22,
        "label": "Tìm ma trận nghịch đảo bằng ma trận phụ hợp",
        "group": "s7",
        "value": 8,
        "time": 45,
        "color": "#b98ffb",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 4. Ma trận nghịch đảo"
      },
      {
        "id": "l23",
        "num": 23,
        "label": "Định nghĩa hệ phương trình tuyến tính",
        "group": "s8",
        "value": 7,
        "time": 30,
        "color": "#51f58a",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hệ phương trình tuyến tính"
      },
      {
        "id": "l24",
        "num": 24,
        "label": "Giải hệ phương trình bằng quy tắc Cramer",
        "group": "s8",
        "value": 9,
        "time": 45,
        "color": "#51f58a",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hệ phương trình tuyến tính"
      },
      {
        "id": "l25",
        "num": 25,
        "label": "Giải hệ phương trình bằng phương pháp Gauss",
        "group": "s8",
        "value": 10,
        "time": 45,
        "color": "#51f58a",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hệ phương trình tuyến tính"
      },
      {
        "id": "l26",
        "num": 26,
        "label": "Định lý Kronecker-Capelli (điều kiện có nghiệm)",
        "group": "s8",
        "value": 6,
        "time": 30,
        "color": "#51f58a",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hệ phương trình tuyến tính"
      },
      {
        "id": "l27",
        "num": 27,
        "label": "Hệ phương trình tuyến tính thuần nhất",
        "group": "s8",
        "value": 8,
        "time": 30,
        "color": "#51f58a",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hệ phương trình tuyến tính"
      },
      {
        "id": "l28",
        "num": 28,
        "label": "Không gian nghiệm của hệ phương trình",
        "group": "s8",
        "value": 7,
        "time": 30,
        "color": "#51f58a",
        "title": "<b>Chủ đề:</b> MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hệ phương trình tuyến tính"
      },
      {
        "id": "l29",
        "num": 29,
        "label": "8 tiên đề của không gian vector",
        "group": "s9",
        "value": 9,
        "time": 45,
        "color": "#5bf6e6",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 1. Khái niệm không gian vector"
      },
      {
        "id": "l30",
        "num": 30,
        "label": "Các không gian vector quen thuộc",
        "group": "s9",
        "value": 10,
        "time": 60,
        "color": "#5bf6e6",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 1. Khái niệm không gian vector"
      },
      {
        "id": "l31",
        "num": 31,
        "label": "Điều kiện để một tập hợp là không gian vector con",
        "group": "s10",
        "value": 5,
        "time": 50,
        "color": "#a2d8f2",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 2. Không gian vector con"
      },
      {
        "id": "l32",
        "num": 32,
        "label": "Giao và hợp của các không gian con",
        "group": "s10",
        "value": 7,
        "time": 60,
        "color": "#a2d8f2",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 2. Không gian vector con"
      },
      {
        "id": "l33",
        "num": 33,
        "label": "Định nghĩa tổ hợp tuyến tính",
        "group": "s11",
        "value": 6,
        "time": 30,
        "color": "#3fd2a5",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 3. Tổ hợp tuyến tính"
      },
      {
        "id": "l34",
        "num": 34,
        "label": "Bao tuyến tính (span) và ý nghĩa hình học",
        "group": "s11",
        "value": 9,
        "time": 30,
        "color": "#3fd2a5",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 3. Tổ hợp tuyến tính"
      },
      {
        "id": "l35",
        "num": 35,
        "label": "Định nghĩa hệ độc lập tuyến tính và hệ phụ thuộc tuyến tính",
        "group": "s12",
        "value": 8,
        "time": 60,
        "color": "#eb8152",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 4. Độc lập - phụ thuộc tuyến tính"
      },
      {
        "id": "l36",
        "num": 36,
        "label": "Nhận biết hệ độc lập/phụ thuộc tuyến tính qua định thức hoặc hạng",
        "group": "s12",
        "value": 9,
        "time": 50,
        "color": "#eb8152",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 4. Độc lập - phụ thuộc tuyến tính"
      },
      {
        "id": "l37",
        "num": 37,
        "label": "Định nghĩa hạng của hệ vector",
        "group": "s13",
        "value": 6,
        "time": 60,
        "color": "#89f179",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hạng của hệ vector"
      },
      {
        "id": "l38",
        "num": 38,
        "label": "Cách tính hạng hệ vector thông qua ma trận",
        "group": "s13",
        "value": 8,
        "time": 60,
        "color": "#89f179",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 5. Hạng của hệ vector"
      },
      {
        "id": "l39",
        "num": 39,
        "label": "Định nghĩa hệ sinh và tập sinh",
        "group": "s14",
        "value": 7,
        "time": 60,
        "color": "#14e18d",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 6. Hệ sinh của không gian vector"
      },
      {
        "id": "l40",
        "num": 40,
        "label": "Định nghĩa cơ sở của một không gian vector",
        "group": "s15",
        "value": 8,
        "time": 45,
        "color": "#6ce452",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 7. Cơ sở và số chiều"
      },
      {
        "id": "l41",
        "num": 41,
        "label": "Khái niệm số chiều",
        "group": "s15",
        "value": 5,
        "time": 50,
        "color": "#6ce452",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 7. Cơ sở và số chiều"
      },
      {
        "id": "l42",
        "num": 42,
        "label": "Cách tìm cơ sở và số chiều cho không gian nghiệm hoặc không gian con sinh bởi hệ vector",
        "group": "s15",
        "value": 10,
        "time": 50,
        "color": "#6ce452",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 7. Cơ sở và số chiều"
      },
      {
        "id": "l43",
        "num": 43,
        "label": "Định nghĩa tọa độ của vector",
        "group": "s16",
        "value": 6,
        "time": 50,
        "color": "#93c3de",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 8. Tọa độ của vector đối với một cơ sở"
      },
      {
        "id": "l44",
        "num": 44,
        "label": "Cách tính tọa độ khi biết cơ sở",
        "group": "s16",
        "value": 7,
        "time": 45,
        "color": "#93c3de",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 8. Tọa độ của vector đối với một cơ sở"
      },
      {
        "id": "l45",
        "num": 45,
        "label": "Xây dựng ma trận chuyển cơ sở từ cơ sở cũ sang cơ sở mới",
        "group": "s17",
        "value": 5,
        "time": 30,
        "color": "#d78d53",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 9. Ma trận chuyển cơ sở"
      },
      {
        "id": "l46",
        "num": 46,
        "label": "Công thức đổi tọa độ của một vector qua các cơ sở khác nhau",
        "group": "s17",
        "value": 8,
        "time": 45,
        "color": "#d78d53",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN TUYẾN TÍNH<br><b>Đề mục:</b> 9. Ma trận chuyển cơ sở"
      },
      {
        "id": "l47",
        "num": 47,
        "label": "Tích vô hướng của hai vector",
        "group": "s18",
        "value": 10,
        "time": 45,
        "color": "#d04462",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 1. Tích vô hướng của hai vector và định nghĩa không gian Euclide"
      },
      {
        "id": "l48",
        "num": 48,
        "label": "Không gian Euclide",
        "group": "s18",
        "value": 7,
        "time": 60,
        "color": "#d04462",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 1. Tích vô hướng của hai vector và định nghĩa không gian Euclide"
      },
      {
        "id": "l49",
        "num": 49,
        "label": "Định nghĩa độ dài vector (chuẩn) và bất đẳng thức Cauchy-Schwarz",
        "group": "s19",
        "value": 8,
        "time": 30,
        "color": "#e30c2d",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 2. Khái niệm không gian Euclide và các phép toán"
      },
      {
        "id": "l50",
        "num": 50,
        "label": "Định nghĩa góc giữa hai vector và khoảng cách",
        "group": "s19",
        "value": 8,
        "time": 30,
        "color": "#e30c2d",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 2. Khái niệm không gian Euclide và các phép toán"
      },
      {
        "id": "l51",
        "num": 51,
        "label": "Hệ vector trực giao và trực chuẩn",
        "group": "s20",
        "value": 5,
        "time": 50,
        "color": "#296aea",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 3. Sự trực giao, cơ sở trực giao và trực chuẩn"
      },
      {
        "id": "l52",
        "num": 52,
        "label": "Tìm tọa độ của vector trong một cơ sở trực chuẩn",
        "group": "s20",
        "value": 9,
        "time": 60,
        "color": "#296aea",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 3. Sự trực giao, cơ sở trực giao và trực chuẩn"
      },
      {
        "id": "l53",
        "num": 53,
        "label": "Thuật toán trực giao hóa Gram - Schmidt",
        "group": "s21",
        "value": 7,
        "time": 50,
        "color": "#7778ef",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 4. Thuật toán trực giao hóa Gram - Schmidt"
      },
      {
        "id": "l54",
        "num": 54,
        "label": "Ma trận trực giao",
        "group": "s22",
        "value": 8,
        "time": 45,
        "color": "#e7b0c8",
        "title": "<b>Chủ đề:</b> KHÔNG GIAN EUCLIDE<br><b>Đề mục:</b> 5. Ma trận trực giao"
      },
      {
        "id": "l55",
        "num": 55,
        "label": "Định nghĩa ánh xạ tuyến tính, toán tử tuyến tính",
        "group": "s23",
        "value": 9,
        "time": 60,
        "color": "#f2927c",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 1. Khái niệm ánh xạ tuyến tính"
      },
      {
        "id": "l56",
        "num": 56,
        "label": "Các phép toán trên ánh xạ tuyến tính (phép cộng, nhân vô hướng, ánh xạ hợp)",
        "group": "s23",
        "value": 10,
        "time": 45,
        "color": "#f2927c",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 1. Khái niệm ánh xạ tuyến tính"
      },
      {
        "id": "l57",
        "num": 57,
        "label": "Đơn cấu, toàn cấu, đẳng cấu",
        "group": "s24",
        "value": 10,
        "time": 30,
        "color": "#dd93fa",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 2. Đơn cấu, toàn cấu, đẳng cấu"
      },
      {
        "id": "l58",
        "num": 58,
        "label": "Định nghĩa và cách tìm không gian hạt nhân (ker) của ánh xạ tuyến tính",
        "group": "s25",
        "value": 10,
        "time": 45,
        "color": "#62d6ee",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 3. Hạt nhân và ảnh"
      },
      {
        "id": "l59",
        "num": 59,
        "label": "Định nghĩa và cách tìm không gian ảnh (Im) của ánh xạ tuyến tính",
        "group": "s25",
        "value": 5,
        "time": 45,
        "color": "#62d6ee",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 3. Hạt nhân và ảnh"
      },
      {
        "id": "l60",
        "num": 60,
        "label": "Định lý về số chiều",
        "group": "s25",
        "value": 10,
        "time": 45,
        "color": "#62d6ee",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 3. Hạt nhân và ảnh"
      },
      {
        "id": "l61",
        "num": 61,
        "label": "Ma trận của ánh xạ tuyến tính trong một cặp cơ sở",
        "group": "s26",
        "value": 9,
        "time": 60,
        "color": "#e48a47",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 4. Ma trận của ánh xạ tuyến tính"
      },
      {
        "id": "l62",
        "num": 62,
        "label": "Công thức đổi tọa độ trong ánh xạ tuyến tính",
        "group": "s26",
        "value": 10,
        "time": 60,
        "color": "#e48a47",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 4. Ma trận của ánh xạ tuyến tính"
      },
      {
        "id": "l63",
        "num": 63,
        "label": "Ma trận đồng dạng",
        "group": "s26",
        "value": 7,
        "time": 30,
        "color": "#e48a47",
        "title": "<b>Chủ đề:</b> ÁNH XẠ TUYẾN TÍNH<br><b>Đề mục:</b> 4. Ma trận của ánh xạ tuyến tính"
      },
      {
        "id": "l64",
        "num": 64,
        "label": "Trị riêng và vector riêng của ma trận",
        "group": "s27",
        "value": 8,
        "time": 30,
        "color": "#442ab2",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 1. Trị riêng và vector riêng của ma trận"
      },
      {
        "id": "l65",
        "num": 65,
        "label": "Thiết lập và giải phương trình đặc trưng",
        "group": "s28",
        "value": 6,
        "time": 60,
        "color": "#2cbb6b",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 2. Đa thức đặc trưng và phương trình đặc trưng"
      },
      {
        "id": "l66",
        "num": 66,
        "label": "Tìm không gian con riêng ứng với vector riêng",
        "group": "s28",
        "value": 9,
        "time": 60,
        "color": "#2cbb6b",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 2. Đa thức đặc trưng và phương trình đặc trưng"
      },
      {
        "id": "l67",
        "num": 67,
        "label": "Điều kiện để một ma trận chéo hóa được",
        "group": "s29",
        "value": 8,
        "time": 60,
        "color": "#1936d4",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 3. Chéo hóa ma trận"
      },
      {
        "id": "l68",
        "num": 68,
        "label": "Các bước tìm ma trận làm chéo hóa và ma trận đường chéo",
        "group": "s29",
        "value": 6,
        "time": 50,
        "color": "#1936d4",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 3. Chéo hóa ma trận"
      },
      {
        "id": "l69",
        "num": 69,
        "label": "Chéo hóa ma trận đối xứng bởi ma trận trực giao",
        "group": "s30",
        "value": 8,
        "time": 30,
        "color": "#a1e2e2",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 4. Chéo hóa ma trận đối xứng bởi ma trận trực giao"
      },
      {
        "id": "l70",
        "num": 70,
        "label": "Trị riêng và vector riêng của ánh xạ tuyến tính",
        "group": "s31",
        "value": 5,
        "time": 45,
        "color": "#e3a3da",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 5. Trị riêng và vector riêng của ánh xạ tuyến tính"
      },
      {
        "id": "l71",
        "num": 71,
        "label": "Chéo hóa ánh xạ tuyến tính",
        "group": "s32",
        "value": 5,
        "time": 50,
        "color": "#d0cb03",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 6. Chéo hóa ánh xạ tuyến tính"
      },
      {
        "id": "l72",
        "num": 72,
        "label": "Tính lũy thừa của ma trận",
        "group": "s33",
        "value": 6,
        "time": 45,
        "color": "#8027af",
        "title": "<b>Chủ đề:</b> TRỊ RIÊNG VÀ VECTOR RIÊNG<br><b>Đề mục:</b> 7. Ứng dụng của chéo hóa"
      },
      {
        "id": "l73",
        "num": 73,
        "label": "Dạng song tuyến tính",
        "group": "s34",
        "value": 6,
        "time": 50,
        "color": "#37c427",
        "title": "<b>Chủ đề:</b> DẠNG TOÀN PHƯƠNG<br><b>Đề mục:</b> 1. Dạng song tuyến tính"
      },
      {
        "id": "l74",
        "num": 74,
        "label": "Dạng toàn phương và ma trận của dạng toàn phương",
        "group": "s35",
        "value": 10,
        "time": 45,
        "color": "#e09e2a",
        "title": "<b>Chủ đề:</b> DẠNG TOÀN PHƯƠNG<br><b>Đề mục:</b> 2. Dạng toàn phương và ma trận của dạng toàn phương"
      },
      {
        "id": "l75",
        "num": 75,
        "label": "Phương pháp Lagrange",
        "group": "s36",
        "value": 6,
        "time": 60,
        "color": "#8bf9c6",
        "title": "<b>Chủ đề:</b> DẠNG TOÀN PHƯƠNG<br><b>Đề mục:</b> 3. Đưa dạng toàn phương về dạng chính tắc"
      },
      {
        "id": "l76",
        "num": 76,
        "label": "Phương pháp Jacobi",
        "group": "s36",
        "value": 5,
        "time": 50,
        "color": "#8bf9c6",
        "title": "<b>Chủ đề:</b> DẠNG TOÀN PHƯƠNG<br><b>Đề mục:</b> 3. Đưa dạng toàn phương về dạng chính tắc"
      },
      {
        "id": "l77",
        "num": 77,
        "label": "Phương pháp biến đổi trực giao",
        "group": "s36",
        "value": 9,
        "time": 45,
        "color": "#8bf9c6",
        "title": "<b>Chủ đề:</b> DẠNG TOÀN PHƯƠNG<br><b>Đề mục:</b> 3. Đưa dạng toàn phương về dạng chính tắc"
      },
      {
        "id": "l78",
        "num": 78,
        "label": "Tiêu chuẩn Sylvester",
        "group": "s37",
        "value": 5,
        "time": 50,
        "color": "#d45169",
        "title": "<b>Chủ đề:</b> DẠNG TOÀN PHƯƠNG<br><b>Đề mục:</b> 4. Xác định dấu của dạng toàn phương"
      }
    ],
    "edges": [
      {
        "from": "l1",
        "to": "l2",
        "arrows": "to"
      },
      {
        "from": "l2",
        "to": "l3",
        "arrows": "to"
      },
      {
        "from": "l4",
        "to": "l5",
        "arrows": "to"
      },
      {
        "from": "l5",
        "to": "l6",
        "arrows": "to"
      },
      {
        "from": "l7",
        "to": "l8",
        "arrows": "to"
      },
      {
        "from": "l8",
        "to": "l9",
        "arrows": "to"
      },
      {
        "from": "l9",
        "to": "l10",
        "arrows": "to"
      },
      {
        "from": "l11",
        "to": "l12",
        "arrows": "to"
      },
      {
        "from": "l12",
        "to": "l13",
        "arrows": "to"
      },
      {
        "from": "l14",
        "to": "l15",
        "arrows": "to"
      },
      {
        "from": "l15",
        "to": "l16",
        "arrows": "to"
      },
      {
        "from": "l17",
        "to": "l18",
        "arrows": "to"
      },
      {
        "from": "l18",
        "to": "l19",
        "arrows": "to"
      },
      {
        "from": "l20",
        "to": "l21",
        "arrows": "to"
      },
      {
        "from": "l21",
        "to": "l22",
        "arrows": "to"
      },
      {
        "from": "l23",
        "to": "l24",
        "arrows": "to"
      },
      {
        "from": "l24",
        "to": "l25",
        "arrows": "to"
      },
      {
        "from": "l25",
        "to": "l26",
        "arrows": "to"
      },
      {
        "from": "l26",
        "to": "l27",
        "arrows": "to"
      },
      {
        "from": "l27",
        "to": "l28",
        "arrows": "to"
      },
      {
        "from": "l29",
        "to": "l30",
        "arrows": "to"
      },
      {
        "from": "l31",
        "to": "l32",
        "arrows": "to"
      },
      {
        "from": "l33",
        "to": "l34",
        "arrows": "to"
      },
      {
        "from": "l35",
        "to": "l36",
        "arrows": "to"
      },
      {
        "from": "l37",
        "to": "l38",
        "arrows": "to"
      },
      {
        "from": "l40",
        "to": "l41",
        "arrows": "to"
      },
      {
        "from": "l41",
        "to": "l42",
        "arrows": "to"
      },
      {
        "from": "l43",
        "to": "l44",
        "arrows": "to"
      },
      {
        "from": "l45",
        "to": "l46",
        "arrows": "to"
      },
      {
        "from": "l47",
        "to": "l48",
        "arrows": "to"
      },
      {
        "from": "l49",
        "to": "l50",
        "arrows": "to"
      },
      {
        "from": "l51",
        "to": "l52",
        "arrows": "to"
      },
      {
        "from": "l55",
        "to": "l56",
        "arrows": "to"
      },
      {
        "from": "l58",
        "to": "l59",
        "arrows": "to"
      },
      {
        "from": "l59",
        "to": "l60",
        "arrows": "to"
      },
      {
        "from": "l61",
        "to": "l62",
        "arrows": "to"
      },
      {
        "from": "l62",
        "to": "l63",
        "arrows": "to"
      },
      {
        "from": "l65",
        "to": "l66",
        "arrows": "to"
      },
      {
        "from": "l67",
        "to": "l68",
        "arrows": "to"
      },
      {
        "from": "l75",
        "to": "l76",
        "arrows": "to"
      },
      {
        "from": "l76",
        "to": "l77",
        "arrows": "to"
      },
      {
        "from": "l3",
        "to": "l11",
        "arrows": "to"
      },
      {
        "from": "l6",
        "to": "l55",
        "arrows": "to"
      },
      {
        "from": "l10",
        "to": "l17",
        "arrows": "to"
      },
      {
        "from": "l13",
        "to": "l14",
        "arrows": "to"
      },
      {
        "from": "l13",
        "to": "l17",
        "arrows": "to"
      },
      {
        "from": "l13",
        "to": "l20",
        "arrows": "to"
      },
      {
        "from": "l16",
        "to": "l23",
        "arrows": "to"
      },
      {
        "from": "l19",
        "to": "l20",
        "arrows": "to"
      },
      {
        "from": "l19",
        "to": "l23",
        "arrows": "to"
      },
      {
        "from": "l22",
        "to": "l23",
        "arrows": "to"
      },
      {
        "from": "l28",
        "to": "l29",
        "arrows": "to"
      },
      {
        "from": "l30",
        "to": "l31",
        "arrows": "to"
      },
      {
        "from": "l32",
        "to": "l33",
        "arrows": "to"
      },
      {
        "from": "l34",
        "to": "l35",
        "arrows": "to"
      },
      {
        "from": "l36",
        "to": "l37",
        "arrows": "to"
      },
      {
        "from": "l34",
        "to": "l39",
        "arrows": "to"
      },
      {
        "from": "l39",
        "to": "l40",
        "arrows": "to"
      },
      {
        "from": "l36",
        "to": "l40",
        "arrows": "to"
      },
      {
        "from": "l42",
        "to": "l43",
        "arrows": "to"
      },
      {
        "from": "l44",
        "to": "l45",
        "arrows": "to"
      },
      {
        "from": "l30",
        "to": "l47",
        "arrows": "to"
      },
      {
        "from": "l48",
        "to": "l49",
        "arrows": "to"
      },
      {
        "from": "l48",
        "to": "l51",
        "arrows": "to"
      },
      {
        "from": "l42",
        "to": "l51",
        "arrows": "to"
      },
      {
        "from": "l52",
        "to": "l53",
        "arrows": "to"
      },
      {
        "from": "l52",
        "to": "l54",
        "arrows": "to"
      },
      {
        "from": "l53",
        "to": "l54",
        "arrows": "to"
      },
      {
        "from": "l30",
        "to": "l55",
        "arrows": "to"
      },
      {
        "from": "l56",
        "to": "l57",
        "arrows": "to"
      },
      {
        "from": "l56",
        "to": "l58",
        "arrows": "to"
      },
      {
        "from": "l56",
        "to": "l61",
        "arrows": "to"
      },
      {
        "from": "l44",
        "to": "l61",
        "arrows": "to"
      },
      {
        "from": "l13",
        "to": "l64",
        "arrows": "to"
      },
      {
        "from": "l28",
        "to": "l64",
        "arrows": "to"
      },
      {
        "from": "l64",
        "to": "l65",
        "arrows": "to"
      },
      {
        "from": "l66",
        "to": "l67",
        "arrows": "to"
      },
      {
        "from": "l54",
        "to": "l69",
        "arrows": "to"
      },
      {
        "from": "l68",
        "to": "l69",
        "arrows": "to"
      },
      {
        "from": "l63",
        "to": "l70",
        "arrows": "to"
      },
      {
        "from": "l64",
        "to": "l70",
        "arrows": "to"
      },
      {
        "from": "l70",
        "to": "l71",
        "arrows": "to"
      },
      {
        "from": "l68",
        "to": "l71",
        "arrows": "to"
      },
      {
        "from": "l71",
        "to": "l72",
        "arrows": "to"
      },
      {
        "from": "l68",
        "to": "l72",
        "arrows": "to"
      },
      {
        "from": "l13",
        "to": "l73",
        "arrows": "to"
      },
      {
        "from": "l56",
        "to": "l73",
        "arrows": "to"
      },
      {
        "from": "l73",
        "to": "l74",
        "arrows": "to"
      },
      {
        "from": "l74",
        "to": "l75",
        "arrows": "to"
      },
      {
        "from": "l69",
        "to": "l75",
        "arrows": "to"
      },
      {
        "from": "l77",
        "to": "l78",
        "arrows": "to"
      },
      {
        "from": "l19",
        "to": "l78",
        "arrows": "to"
      }
    ]
  }
};
