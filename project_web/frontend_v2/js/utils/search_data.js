const searchDatabase = [
    // ==============================================
    // CHƯƠNG 2: ĐỊNH THỨC
    // ==============================================
    {
        chapter: "CHƯƠNG 2: ĐỊNH THỨC",
        section: "1. Định nghĩa định thức",
        content: "Với mỗi ma trận vuông A cấp n, tồn tại một số thực được gọi là định thức của ma trận A, được ký hiệu là det(A) hay |A|.",
        url: "topics/sub_topic/dinh_thuc.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 2: ĐỊNH THỨC",
        section: "2. Định thức cấp 2",
        content: "Định thức cấp 2 được tính bằng cách lấy tích đường chéo chính trừ đi tích đường chéo phụ. Được dùng để xác định tích có hướng, diện tích hình bình hành, tam giác.",
        url: "topics/sub_topic/dinh_thuc.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: ĐỊNH THỨC",
        section: "3. Định thức cấp 3 (Quy tắc Sarrus)",
        content: "Định thức cấp 3 có thể được khai triển và ghi nhớ theo quy tắc Sarrus (bằng cách thêm 2 cột vào sau định thức). Dùng xác định tích hỗn tạp, thể tích hình hộp, tứ diện.",
        url: "topics/sub_topic/dinh_thuc.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: ĐỊNH THỨC",
        section: "4. Định thức cấp n & Phần bù đại số",
        content: "Định thức của ma trận vuông A được xác định bằng công thức khai triển theo hàng hoặc cột (khai triển Laplace). Trong đó dùng phần bù đại số Aij = (-1)^(i+j) * det(Mij).",
        url: "topics/sub_topic/dinh_thuc.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: ĐỊNH THỨC",
        section: "Các tính chất của định thức",
        content: "1. Không thay đổi qua phép chuyển vị. 2. Đổi chỗ 2 hàng/cột thì đổi dấu. 3. Nhân 1 hàng/cột với số lambda thì định thức nhân lambda. 4. Bằng 0 nếu có 2 hàng/cột tỉ lệ hoặc là tổ hợp tuyến tính.",
        url: "topics/sub_topic/dinh_thuc.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: ĐỊNH THỨC",
        section: "Định lý nhân định thức",
        content: "Giả sử A và B là hai ma trận vuông cùng cấp n, khi đó định thức của một tích bằng tích các định thức: det(AB) = det(A) * det(B).",
        url: "topics/sub_topic/dinh_thuc.html#ly-thuyet"
    },


    // ==============================================
    // CHƯƠNG 3: HẠNG MA TRẬN
    // ==============================================
    {
        chapter: "CHƯƠNG 3: HẠNG MA TRẬN",
        section: "1. Ma trận con",
        content: "Ma trận được tạo thành từ các phần tử nằm ở phần giao giữa r hàng và r cột của ma trận A được gọi là ma trận con cấp r của A.",
        url: "topics/sub_topic/hang_matran.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: HẠNG MA TRẬN",
        section: "2. Định nghĩa hạng ma trận",
        content: "Hạng của một ma trận A là cấp cao nhất của các định thức con khác không có trong A. Ký hiệu là rank(A) hay r(A).",
        url: "topics/sub_topic/hang_matran.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: HẠNG MA TRẬN",
        section: "Tính chất của hạng ma trận",
        content: "Ma trận O có hạng bằng 0. Hạng không đổi qua phép chuyển vị. Nếu A là ma trận vuông cấp n và det(A) khác 0 thì hạng bằng n (ma trận không suy biến).",
        url: "topics/sub_topic/hang_matran.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: HẠNG MA TRẬN",
        section: "3. Ma trận bậc thang",
        content: "Ma trận có các hàng bằng 0 (nếu có) nằm ở dưới cùng. Phần tử khác 0 đầu tiên của hàng dưới phải nằm về bên phải phần tử khác 0 đầu tiên của hàng trên.",
        url: "topics/sub_topic/hang_matran.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: HẠNG MA TRẬN",
        section: "4. Các phép biến đổi sơ cấp",
        content: "1. Nhân 1 số khác 0 vào 1 hàng. 2. Đổi chỗ 2 hàng. 3. Cộng vào 1 hàng với 1 hàng khác đã nhân thêm 1 số. Lưu ý: Hạng của ma trận không thay đổi qua các phép biến đổi sơ cấp.",
        url: "topics/sub_topic/hang_matran.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: HẠNG MA TRẬN",
        section: "5. Tìm hạng ma trận bằng phương pháp Gauss",
        content: "Dùng các phép biến đổi sơ cấp để đưa ma trận A về dạng ma trận bậc thang B. Lúc đó hạng của ma trận A bằng số hàng khác không của ma trận B.",
        url: "topics/sub_topic/hang_matran.html#ly-thuyet" 
    },



    // ==============================================
    // CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH
    // ==============================================
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "1. Định nghĩa hệ phương trình tuyến tính",
        content: "Một hệ gồm m phương trình bậc nhất với n ẩn. Có thể viết dưới dạng ma trận AX = B, trong đó A là ma trận hệ số, X là cột ẩn số, B là cột hệ số tự do.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "Ma trận hệ số mở rộng",
        content: "Ký hiệu là A_bs hoặc [A | B]. Là ma trận được tạo bằng cách ghép thêm cột hệ số tự do B vào bên phải ma trận hệ số A.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "2. Định lý Kronecker-Capelli",
        content: "Biện luận số nghiệm: Nếu r(A) < r(A_bs) thì hệ vô nghiệm. Nếu r(A) = r(A_bs) = n (số ẩn) thì hệ có nghiệm duy nhất. Nếu r(A) = r(A_bs) < n thì hệ có vô số nghiệm.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "3. Hệ phương trình Cramer",
        content: "Hệ có số phương trình bằng số ẩn và định thức det(A) khác 0. Hệ luôn có nghiệm duy nhất được tính bằng công thức xj = Dj / D.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "4. Giải hệ bằng phương pháp Gauss",
        content: "Lập ma trận hệ số mở rộng [A | B], dùng biến đổi sơ cấp đưa về dạng bậc thang, sau đó giải ngược từ dưới lên để tìm các ẩn số.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "5. Hệ phương trình tuyến tính thuần nhất",
        content: "Là hệ phương trình có cột hệ số tự do B = 0 (dạng AX = 0). Hệ luôn có nghiệm. Nghiệm toàn số 0 gọi là nghiệm tầm thường.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 4: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
        section: "Biện luận hệ thuần nhất",
        content: "Nếu det(A) khác 0 (hoặc r(A) = n) thì hệ chỉ có nghiệm duy nhất tầm thường. Nếu det(A) = 0 (hoặc r(A) < n) thì hệ có vô số nghiệm không tầm thường.",
        url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet" 
    },




    // ==============================================
    // CHƯƠNG 3: MA TRẬN NGHỊCH ĐẢO
    // ==============================================
    {
        chapter: "CHƯƠNG 3: MA TRẬN NGHỊCH ĐẢO",
        section: "1. Định nghĩa ma trận khả nghịch",
        content: "Cho A là ma trận vuông cấp n. A gọi là ma trận khả nghịch nếu tồn tại ma trận B vuông cấp n sao cho AB = BA = I_n (ma trận đơn vị). Lúc này B là ma trận nghịch đảo của A, ký hiệu A^-1.",
        url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: MA TRẬN NGHỊCH ĐẢO",
        section: "Tính chất ma trận nghịch đảo",
        content: "Chỉ ma trận vuông mới có thể khả nghịch. Ma trận đơn vị I luôn khả nghịch. Ma trận không O không khả nghịch. Tích các ma trận khả nghịch là khả nghịch: (AB)^-1 = B^-1 * A^-1.",
        url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: MA TRẬN NGHỊCH ĐẢO",
        section: "2. Ma trận phụ hợp (P_A)",
        content: "Ma trận phụ hợp P_A được thiết lập từ các phần bù đại số (Aij) của ma trận gốc A, sau đó sắp xếp theo vị trí chuyển vị (đổi hàng thành cột).",
        url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: MA TRẬN NGHỊCH ĐẢO",
        section: "Cách 1: Tìm ma trận nghịch đảo bằng Phụ hợp",
        content: "Ma trận A khả nghịch khi và chỉ khi định thức det(A) khác 0. Công thức tính: A^-1 = (1 / det(A)) * P_A.",
        url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 3: MA TRẬN NGHỊCH ĐẢO",
        section: "Cách 2: Tìm ma trận nghịch đảo bằng Gauss",
        content: "Lập ma trận mở rộng [A | I_n] (ghép ma trận đơn vị bên phải). Dùng phép biến đổi sơ cấp trên dòng đưa phần A về ma trận đơn vị I_n. Lúc này phần bên phải biến thành A^-1.",
        url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet" 
    },



    // ==============================================
    // CHƯƠNG 2: MA TRẬN
    // ==============================================
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "1. Định nghĩa ma trận",
        content: "Một ma trận cấp m x n là một bảng gồm m.n số a_ij được sắp xếp thành m hàng và n cột. Phần tử a_ij nằm ở dòng i và cột j.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "2.1 Ma trận vuông",
        content: "Là ma trận có số dòng m bằng số cột n. Các phần tử a_11, a_22,..., a_nn là các phần tử thuộc đường chéo chính.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "2.2 Ma trận đơn vị",
        content: "Là ma trận vuông có tất cả các phần tử thuộc đường chéo chính đều bằng 1, các phần tử còn lại bằng 0. Kí hiệu là I hoặc E.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "2.3 Ma trận tam giác",
        content: "Bao gồm ma trận tam giác trên (các phần tử dưới đường chéo chính bằng 0) và ma trận tam giác dưới (các phần tử trên đường chéo chính bằng 0).",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "Các loại ma trận đặc biệt khác",
        content: "Bao gồm ma trận chéo (phần tử ngoài chéo chính bằng 0), ma trận cột (chỉ có 1 cột), ma trận hàng (chỉ có 1 hàng) và ma trận không (tất cả phần tử bằng 0).",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "3.1 Phép cộng hai ma trận",
        content: "Phép cộng (trừ) hai ma trận cùng cấp được thực hiện bằng cách cộng (trừ) các phần tử ở vị trí tương ứng với nhau.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "3.2 Phép nhân số thực với ma trận",
        content: "Tích của số thực lambda với ma trận A được thực hiện bằng cách nhân số lambda đó vào từng phần tử của ma trận A.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "3.3 Phép nhân hai ma trận",
        content: "Hai ma trận nhân được với nhau khi số cột của ma trận đầu bằng số hàng của ma trận hai. Phần tử c_ij của ma trận tích là tổng các tích của hàng i ma trận A và cột j ma trận B. Phép nhân KHÔNG có tính giao hoán.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "3.4 Phép chuyển vị ma trận",
        content: "Ma trận thu được bằng cách viết các hàng của ma trận gốc lần lượt thành các cột. Kí hiệu là A^T. (AB)^T = B^T.A^T.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "Ma trận đối xứng và Phản đối xứng",
        content: "Nếu A = A^T thì A là ma trận đối xứng. Nếu A = -A^T thì A là ma trận phản đối xứng.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 2: MA TRẬN",
        section: "3.5 Phép nâng lũy thừa & 3.6 Đa thức ma trận",
        content: "Lũy thừa bậc n của ma trận vuông A là tích của n ma trận A. Quy ước A^0 = I. Đa thức ma trận P(A) là việc thay biến số x thành ma trận A và số tự do nhân thêm ma trận I.",
        url: "topics/sub_topic/matran_pheptoan.html#ly-thuyet"
    },





    // ==============================================
    // CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn
    // ==============================================
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "1. Vector là gì?",
        content: "Vector là một đoạn thẳng có hướng, gồm điểm đầu (gốc) và điểm cuối (ngọn). Về mặt đại số, vector trong mặt phẳng được biểu diễn bằng một cặp số theo thứ tự gọi là tọa độ (v1, v2).",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "2. Độ dài của vector",
        content: "Độ dài (hay chuẩn) của vector là khoảng cách giữa điểm đầu và điểm cuối. Về đại số, được tính bằng định lý Pythagoras thông qua các thành phần tọa độ.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "3. Hai vector cùng phương, cùng hướng, bằng nhau",
        content: "Đường thẳng đi qua điểm đầu và điểm cuối gọi là giá. Hai vector cùng phương khi giá song song hoặc trùng nhau. Bằng nhau khi cùng độ dài và cùng hướng.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "4. Tổng của hai vector",
        content: "Cộng vector bằng quy tắc ba điểm (quy tắc nối đuôi) hoặc quy tắc hình bình hành (khi chung gốc). Về đại số, ta cộng các thành phần tọa độ tương ứng của chúng.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "5. Hiệu của hai vector (Vector đối, Vector không)",
        content: "Vector không có độ dài bằng 0. Vector đối có cùng độ dài nhưng ngược hướng. Phép trừ hai vector thực chất là tổng của vector thứ nhất với vector đối của vector thứ hai.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "6. Phép nhân vector với số thực",
        content: "Tích của vector v với số thực k tạo ra vector mới cùng phương, độ dài bị kéo dãn hoặc thu hẹp |k| lần. Đại số: nhân số k vào từng thành phần tọa độ.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "Vector trong không gian Rn",
        content: "Vector mở rộng từ mặt phẳng lên không gian n chiều (Rn), biểu diễn bằng một bộ n số thực theo thứ tự. Hai vector bằng nhau khi mọi thành phần tương ứng bằng nhau.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: VECTOR VÀ VECTOR TRONG Rn",
        section: "Các phép toán cơ bản trong Rn",
        content: "Các phép toán (cộng, trừ, nhân vô hướng với số thực) trong không gian Rn được mở rộng tự nhiên từ mặt phẳng bằng cách thực hiện trên từng thành phần tọa độ tương ứng.",
        url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet"
    },






    // ==============================================
    // CHƯƠNG 1: KHÔNG GIAN VECTOR VÀ KHÔNG GIAN CON
    // ==============================================
    {
        chapter: "CHƯƠNG 1: KHÔNG GIAN VECTOR",
        section: "1. Định nghĩa Không gian vector",
        content: "Cho tập hợp V và một trường số (thường là R). V là không gian vector nếu thỏa mãn 8 tiên đề về phép cộng hai vector và phép nhân vector với vô hướng (giao hoán, kết hợp, phần tử trung hòa, phần tử đối, tính phân phối...).",
        url: "topics/vector_space.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: KHÔNG GIAN VECTOR",
        section: "Các không gian vector phổ biến",
        content: "Không gian thực n chiều (Rn), tập các hàm số liên tục, tập các đa thức (P_n), tập các ma trận cỡ m x n (M_mn).",
        url: "topics/vector_space.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: KHÔNG GIAN VECTOR",
        section: "2. Không gian vector con",
        content: "Tập con W của V là không gian con nếu nó đóng kín với phép cộng (u+v thuộc W), đóng kín với phép nhân vô hướng (ku thuộc W) và chứa vector không (W khác rỗng).",
        url: "topics/vector_space.html#ly-thuyet"
    },
    {
        chapter: "CHƯƠNG 1: KHÔNG GIAN VECTOR",
        section: "Nhận xét về không gian vector con",
        content: "Một tập con trong Rn định nghĩa bởi các phương trình/hệ phương trình sẽ là không gian con nếu TẤT CẢ các phương trình đó là bậc nhất và thuần nhất (vế phải bằng 0).",
        url: "topics/vector_space.html#ly-thuyet"
    },





    // ==============================================
    // CHƯƠNG 1: TỔ HỢP - ĐỘC LẬP - PHỤ THUỘC TUYẾN TÍNH
    // ==============================================
    {
        chapter: "CHƯƠNG 1: TỔ HỢP - ĐỘC LẬP - PHỤ THUỘC TUYẾN TÍNH",
        section: "1. Tổ hợp tuyến tính (Biểu diễn tuyến tính)",
        content: "Vector v là tổ hợp tuyến tính của hệ vector S = {v1, v2,..., vn} nếu v có thể viết dưới dạng tổng các tích của vô hướng (c1, c2,..., cn) với từng vector trong hệ. Ví dụ: v = c1v1 + c2v2 + ... + cnvn.",
        url: "topics/linear_independence.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 1: TỔ HỢP - ĐỘC LẬP - PHỤ THUỘC TUYẾN TÍNH",
        section: "2. Phụ thuộc tuyến tính (PTTT)",
        content: "Hệ vector S phụ thuộc tuyến tính nếu tồn tại các hệ số c1, c2,..., cn KHÔNG đồng thời bằng 0 sao cho c1v1 + c2v2 + ... + cnvn = 0. Đồng nghĩa với việc phương trình có nghiệm KHÔNG tầm thường.",
        url: "topics/linear_independence.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 1: TỔ HỢP - ĐỘC LẬP - PHỤ THUỘC TUYẾN TÍNH",
        section: "Độc lập tuyến tính (ĐLTT)",
        content: "Hệ vector S độc lập tuyến tính nếu phương trình c1v1 + c2v2 + ... + cnvn = 0 CHỈ có duy nhất nghiệm tầm thường (c1 = c2 = ... = cn = 0).",
        url: "topics/linear_independence.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 1: TỔ HỢP - ĐỘC LẬP - PHỤ THUỘC TUYẾN TÍNH",
        section: "Tính chất cơ bản của ĐLTT & PTTT",
        content: "Hệ chứa vector 0 luôn PTTT. Hệ 2 vector PTTT khi chúng tỷ lệ với nhau. Hệ ĐLTT thì mọi hệ con của nó cũng ĐLTT. Hệ PTTT khi có ít nhất 1 vector biểu diễn tuyến tính được qua các vector còn lại.",
        url: "topics/linear_independence.html#ly-thuyet" 
    },
    {
        chapter: "CHƯƠNG 1: TỔ HỢP - ĐỘC LẬP - PHỤ THUỘC TUYẾN TÍNH",
        section: "Kiểm tra hệ ĐLTT/PTTT bằng Ma trận",
        content: "Lập ma trận A với các vector làm cột/hàng. Dùng biến đổi Gauss: Nếu hạng của ma trận r(A) bằng số vector n thì hệ ĐLTT. Hoặc tính định thức: Nếu det(A) khác 0 thì hệ ĐLTT.",
        url: "topics/linear_independence.html#ly-thuyet" 
    }
];