const MOCK_LIBRARY_DATA = {
  "references": [
    {
      "id": "ref1",
      "title": "Introduction to Linear Algebra (5th Edition)",
      "author": "Gilbert Strang",
      "type": "Textbook",
      "link": "https://math.mit.edu/~gs/linearalgebra/"
    },
    {
      "id": "ref2",
      "title": "MIT 18.06 Video Lectures",
      "author": "Prof. Gilbert Strang",
      "type": "Video",
      "link": "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/"
    }
  ],
  "topics": [
    {
      "id": "t1",
      "title": "Unit 1: Ax = b and the Four Subspaces",
      "description": "Linear equations, elimination, matrix operations, and the fundamental subspaces.",
      "lessons": [
        {
          "id": "l1",
          "num": 1,
          "title": "1. The Geometry of Linear Equations",
          "complexity": 3,
          "time": 45,
          "abstract": "Hệ phương trình tuyến tính nhìn từ góc độ hình học: Row picture vs Column picture.",
          "contentHTML": "<h2>1. The Geometry of Linear Equations</h2><p>Hệ phương trình tuyến tính nhìn từ góc độ hình học: Row picture vs Column picture.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l2",
          "num": 2,
          "title": "2. Elimination with Matrices",
          "complexity": 4,
          "time": 50,
          "abstract": "Phương pháp Khử Gauss biểu diễn dưới dạng phép nhân ma trận.",
          "contentHTML": "<h2>2. Elimination with Matrices</h2><p>Phương pháp Khử Gauss biểu diễn dưới dạng phép nhân ma trận.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l3",
          "num": 3,
          "title": "3. Multiplication and Inverse Matrices",
          "complexity": 5,
          "time": 50,
          "abstract": "4 cách nhân ma trận và điều kiện tồn tại ma trận nghịch đảo.",
          "contentHTML": "<h2>3. Multiplication and Inverse Matrices</h2><p>4 cách nhân ma trận và điều kiện tồn tại ma trận nghịch đảo.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l4",
          "num": 4,
          "title": "4. Factorization into A = LU",
          "complexity": 6,
          "time": 55,
          "abstract": "Phân rã LU và ý nghĩa trong giải hệ phương trình.",
          "contentHTML": "<h2>4. Factorization into A = LU</h2><p>Phân rã LU và ý nghĩa trong giải hệ phương trình.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l5",
          "num": 5,
          "title": "5. Transposes, Permutations, Spaces R^n",
          "complexity": 4,
          "time": 45,
          "abstract": "Ma trận chuyển vị, hoán vị và khái niệm không gian vector.",
          "contentHTML": "<h2>5. Transposes, Permutations, Spaces R^n</h2><p>Ma trận chuyển vị, hoán vị và khái niệm không gian vector.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l6",
          "num": 6,
          "title": "6. Column Space and Nullspace",
          "complexity": 6,
          "time": 50,
          "abstract": "Không gian cột C(A) và không gian Null N(A) của ma trận.",
          "contentHTML": "<h2>6. Column Space and Nullspace</h2><p>Không gian cột C(A) và không gian Null N(A) của ma trận.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l7",
          "num": 7,
          "title": "7. Solving Ax = 0: Pivot Variables, Special Solutions",
          "complexity": 5,
          "time": 45,
          "abstract": "Tìm nghiệm tổng quát của hệ thuần nhất bằng biến pivot.",
          "contentHTML": "<h2>7. Solving Ax = 0: Pivot Variables, Special Solutions</h2><p>Tìm nghiệm tổng quát của hệ thuần nhất bằng biến pivot.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l8",
          "num": 8,
          "title": "8. Solving Ax = b: Row Reduced Form R",
          "complexity": 5,
          "time": 45,
          "abstract": "Dạng bậc thang rút gọn và điều kiện tồn tại nghiệm.",
          "contentHTML": "<h2>8. Solving Ax = b: Row Reduced Form R</h2><p>Dạng bậc thang rút gọn và điều kiện tồn tại nghiệm.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l9",
          "num": 9,
          "title": "9. Independence, Basis, and Dimension",
          "complexity": 7,
          "time": 55,
          "abstract": "Độc lập tuyến tính, cơ sở, và số chiều của không gian vector.",
          "contentHTML": "<h2>9. Independence, Basis, and Dimension</h2><p>Độc lập tuyến tính, cơ sở, và số chiều của không gian vector.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l10",
          "num": 10,
          "title": "10. The Four Fundamental Subspaces",
          "complexity": 8,
          "time": 60,
          "abstract": "Bốn không gian con cơ bản và mối quan hệ trực giao giữa chúng.",
          "contentHTML": "<h2>10. The Four Fundamental Subspaces</h2><p>Bốn không gian con cơ bản và mối quan hệ trực giao giữa chúng.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l11",
          "num": 11,
          "title": "11. Matrix Spaces; Rank 1; Small World Graphs",
          "complexity": 5,
          "time": 45,
          "abstract": "Không gian ma trận, ma trận hạng 1 và ứng dụng đồ thị.",
          "contentHTML": "<h2>11. Matrix Spaces; Rank 1; Small World Graphs</h2><p>Không gian ma trận, ma trận hạng 1 và ứng dụng đồ thị.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l12",
          "num": 12,
          "title": "12. Graphs, Networks, Incidence Matrices",
          "complexity": 6,
          "time": 50,
          "abstract": "Ma trận liên thuộc và ứng dụng trong lý thuyết đồ thị.",
          "contentHTML": "<h2>12. Graphs, Networks, Incidence Matrices</h2><p>Ma trận liên thuộc và ứng dụng trong lý thuyết đồ thị.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l13",
          "num": 13,
          "title": "13. Quiz 1 Review",
          "complexity": 7,
          "time": 60,
          "abstract": "Ôn tập kiến thức Unit 1 chuẩn bị cho bài kiểm tra số 1.",
          "contentHTML": "<h2>13. Quiz 1 Review</h2><p>Ôn tập kiến thức Unit 1 chuẩn bị cho bài kiểm tra số 1.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        }
      ]
    },
    {
      "id": "t2",
      "title": "Unit 2: Least Squares, Determinants and Eigenvalues",
      "description": "Orthogonality, projections, and the properties of determinants and eigenvalues.",
      "lessons": [
        {
          "id": "l14",
          "num": 14,
          "title": "14. Orthogonal Vectors and Subspaces",
          "complexity": 5,
          "time": 45,
          "abstract": "Tích vô hướng, trực giao và phần bù trực giao.",
          "contentHTML": "<h2>14. Orthogonal Vectors and Subspaces</h2><p>Tích vô hướng, trực giao và phần bù trực giao.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l15",
          "num": 15,
          "title": "15. Projections onto Subspaces",
          "complexity": 6,
          "time": 50,
          "abstract": "Hình chiếu trực giao lên không gian con và ma trận chiếu.",
          "contentHTML": "<h2>15. Projections onto Subspaces</h2><p>Hình chiếu trực giao lên không gian con và ma trận chiếu.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l16",
          "num": 16,
          "title": "16. Projection Matrices and Least Squares",
          "complexity": 8,
          "time": 60,
          "abstract": "Bài toán Bình phương Tối thiểu (Least Squares) và ứng dụng hồi quy.",
          "contentHTML": "<h2>16. Projection Matrices and Least Squares</h2><p>Bài toán Bình phương Tối thiểu (Least Squares) và ứng dụng hồi quy.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l17",
          "num": 17,
          "title": "17. Orthogonal Matrices and Gram-Schmidt",
          "complexity": 7,
          "time": 55,
          "abstract": "Quá trình trực giao hóa Gram-Schmidt và ma trận trực giao Q.",
          "contentHTML": "<h2>17. Orthogonal Matrices and Gram-Schmidt</h2><p>Quá trình trực giao hóa Gram-Schmidt và ma trận trực giao Q.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l18",
          "num": 18,
          "title": "18. Properties of Determinants",
          "complexity": 5,
          "time": 45,
          "abstract": "10 tính chất cơ bản của định thức.",
          "contentHTML": "<h2>18. Properties of Determinants</h2><p>10 tính chất cơ bản của định thức.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l19",
          "num": 19,
          "title": "19. Determinant Formulas and Cofactors",
          "complexity": 6,
          "time": 50,
          "abstract": "Công thức tính định thức bằng khai triển phần phụ đại số.",
          "contentHTML": "<h2>19. Determinant Formulas and Cofactors</h2><p>Công thức tính định thức bằng khai triển phần phụ đại số.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l20",
          "num": 20,
          "title": "20. Cramer's Rule, Inverse Matrix, and Volume",
          "complexity": 6,
          "time": 55,
          "abstract": "Quy tắc Cramer, công thức nghịch đảo qua phần phụ đại số, và thể tích.",
          "contentHTML": "<h2>20. Cramer's Rule, Inverse Matrix, and Volume</h2><p>Quy tắc Cramer, công thức nghịch đảo qua phần phụ đại số, và thể tích.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l21",
          "num": 21,
          "title": "21. Eigenvalues and Eigenvectors",
          "complexity": 8,
          "time": 60,
          "abstract": "Giá trị riêng, vector riêng và phương trình đặc trưng det(A-λI)=0.",
          "contentHTML": "<h2>21. Eigenvalues and Eigenvectors</h2><p>Giá trị riêng, vector riêng và phương trình đặc trưng det(A-λI)=0.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l22",
          "num": 22,
          "title": "22. Diagonalization and Powers of A",
          "complexity": 7,
          "time": 55,
          "abstract": "Chéo hóa ma trận A = SΛS⁻¹ và tính lũy thừa Aⁿ.",
          "contentHTML": "<h2>22. Diagonalization and Powers of A</h2><p>Chéo hóa ma trận A = SΛS⁻¹ và tính lũy thừa Aⁿ.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l23",
          "num": 23,
          "title": "23. Differential Equations and exp(At)",
          "complexity": 8,
          "time": 60,
          "abstract": "Hệ phương trình vi phân tuyến tính du/dt = Au và ma trận mũ.",
          "contentHTML": "<h2>23. Differential Equations and exp(At)</h2><p>Hệ phương trình vi phân tuyến tính du/dt = Au và ma trận mũ.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l24",
          "num": 24,
          "title": "24. Markov Matrices; Fourier Series",
          "complexity": 7,
          "time": 50,
          "abstract": "Ma trận Markov, trạng thái dừng và chuỗi Fourier.",
          "contentHTML": "<h2>24. Markov Matrices; Fourier Series</h2><p>Ma trận Markov, trạng thái dừng và chuỗi Fourier.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l32",
          "num": 32,
          "title": "32. Quiz 2 Review",
          "complexity": 8,
          "time": 60,
          "abstract": "Ôn tập toàn bộ kiến thức Unit 2.",
          "contentHTML": "<h2>32. Quiz 2 Review</h2><p>Ôn tập toàn bộ kiến thức Unit 2.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        }
      ]
    },
    {
      "id": "t3",
      "title": "Unit 3: Positive Definite Matrices and Applications",
      "description": "Symmetric matrices, SVD, and linear transformations.",
      "lessons": [
        {
          "id": "l25",
          "num": 25,
          "title": "25. Symmetric Matrices and Positive Definiteness",
          "complexity": 7,
          "time": 55,
          "abstract": "Ma trận đối xứng: giá trị riêng thực, vector riêng trực giao, xác định dương.",
          "contentHTML": "<h2>25. Symmetric Matrices and Positive Definiteness</h2><p>Ma trận đối xứng: giá trị riêng thực, vector riêng trực giao, xác định dương.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l26",
          "num": 26,
          "title": "26. Complex Matrices; Fast Fourier Transform",
          "complexity": 8,
          "time": 60,
          "abstract": "Ma trận phức, ma trận Hermitian và thuật toán FFT.",
          "contentHTML": "<h2>26. Complex Matrices; Fast Fourier Transform</h2><p>Ma trận phức, ma trận Hermitian và thuật toán FFT.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l27",
          "num": 27,
          "title": "27. Positive Definite Matrices and Minima",
          "complexity": 7,
          "time": 55,
          "abstract": "Kiểm tra xác định dương, liên hệ với cực tiểu hàm nhiều biến.",
          "contentHTML": "<h2>27. Positive Definite Matrices and Minima</h2><p>Kiểm tra xác định dương, liên hệ với cực tiểu hàm nhiều biến.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l28",
          "num": 28,
          "title": "28. Similar Matrices and Jordan Form",
          "complexity": 9,
          "time": 65,
          "abstract": "Ma trận đồng dạng và dạng chuẩn Jordan cho ma trận không chéo hóa được.",
          "contentHTML": "<h2>28. Similar Matrices and Jordan Form</h2><p>Ma trận đồng dạng và dạng chuẩn Jordan cho ma trận không chéo hóa được.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l29",
          "num": 29,
          "title": "29. Singular Value Decomposition",
          "complexity": 10,
          "time": 75,
          "abstract": "Phân rã giá trị suy biến A = UΣVᵀ — công cụ mạnh nhất của ĐSTT.",
          "contentHTML": "<h2>29. Singular Value Decomposition</h2><p>Phân rã giá trị suy biến A = UΣVᵀ — công cụ mạnh nhất của ĐSTT.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l30",
          "num": 30,
          "title": "30. Linear Transformations and Their Matrices",
          "complexity": 7,
          "time": 55,
          "abstract": "Phép biến đổi tuyến tính, biểu diễn ma trận trong các cơ sở khác nhau.",
          "contentHTML": "<h2>30. Linear Transformations and Their Matrices</h2><p>Phép biến đổi tuyến tính, biểu diễn ma trận trong các cơ sở khác nhau.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l31",
          "num": 31,
          "title": "31. Change of Basis; Image Compression",
          "complexity": 6,
          "time": 50,
          "abstract": "Đổi cơ sở, nén ảnh bằng SVD.",
          "contentHTML": "<h2>31. Change of Basis; Image Compression</h2><p>Đổi cơ sở, nén ảnh bằng SVD.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l33",
          "num": 33,
          "title": "33. Left and Right Inverses; Pseudoinverse",
          "complexity": 8,
          "time": 60,
          "abstract": "Nghịch đảo trái, phải và giả nghịch đảo Moore-Penrose A⁺.",
          "contentHTML": "<h2>33. Left and Right Inverses; Pseudoinverse</h2><p>Nghịch đảo trái, phải và giả nghịch đảo Moore-Penrose A⁺.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        },
        {
          "id": "l34",
          "num": 34,
          "title": "34. Final Course Review",
          "complexity": 8,
          "time": 90,
          "abstract": "Tổng ôn toàn khóa học.",
          "contentHTML": "<h2>34. Final Course Review</h2><p>Tổng ôn toàn khóa học.</p><p>Nội dung chi tiết sẽ được bổ sung khi có dữ liệu chính thức từ Backend.</p>"
        }
      ]
    }
  ],
  "graph": {
    "nodes": [
      {
        "id": "l1",
        "num": 1,
        "label": "1. The Geometry of Linear Equations",
        "group": "t1",
        "value": 3,
        "time": 45
      },
      {
        "id": "l2",
        "num": 2,
        "label": "2. Elimination with Matrices",
        "group": "t1",
        "value": 4,
        "time": 50
      },
      {
        "id": "l3",
        "num": 3,
        "label": "3. Multiplication and Inverse Matrices",
        "group": "t1",
        "value": 5,
        "time": 50
      },
      {
        "id": "l4",
        "num": 4,
        "label": "4. Factorization into A = LU",
        "group": "t1",
        "value": 6,
        "time": 55
      },
      {
        "id": "l5",
        "num": 5,
        "label": "5. Transposes, Permutations, Spaces R^n",
        "group": "t1",
        "value": 4,
        "time": 45
      },
      {
        "id": "l6",
        "num": 6,
        "label": "6. Column Space and Nullspace",
        "group": "t1",
        "value": 6,
        "time": 50
      },
      {
        "id": "l7",
        "num": 7,
        "label": "7. Solving Ax = 0: Pivot Variables, Special Solutions",
        "group": "t1",
        "value": 5,
        "time": 45
      },
      {
        "id": "l8",
        "num": 8,
        "label": "8. Solving Ax = b: Row Reduced Form R",
        "group": "t1",
        "value": 5,
        "time": 45
      },
      {
        "id": "l9",
        "num": 9,
        "label": "9. Independence, Basis, and Dimension",
        "group": "t1",
        "value": 7,
        "time": 55
      },
      {
        "id": "l10",
        "num": 10,
        "label": "10. The Four Fundamental Subspaces",
        "group": "t1",
        "value": 8,
        "time": 60
      },
      {
        "id": "l11",
        "num": 11,
        "label": "11. Matrix Spaces; Rank 1; Small World Graphs",
        "group": "t1",
        "value": 5,
        "time": 45
      },
      {
        "id": "l12",
        "num": 12,
        "label": "12. Graphs, Networks, Incidence Matrices",
        "group": "t1",
        "value": 6,
        "time": 50
      },
      {
        "id": "l13",
        "num": 13,
        "label": "13. Quiz 1 Review",
        "group": "t1",
        "value": 7,
        "time": 60
      },
      {
        "id": "l14",
        "num": 14,
        "label": "14. Orthogonal Vectors and Subspaces",
        "group": "t2",
        "value": 5,
        "time": 45
      },
      {
        "id": "l15",
        "num": 15,
        "label": "15. Projections onto Subspaces",
        "group": "t2",
        "value": 6,
        "time": 50
      },
      {
        "id": "l16",
        "num": 16,
        "label": "16. Projection Matrices and Least Squares",
        "group": "t2",
        "value": 8,
        "time": 60
      },
      {
        "id": "l17",
        "num": 17,
        "label": "17. Orthogonal Matrices and Gram-Schmidt",
        "group": "t2",
        "value": 7,
        "time": 55
      },
      {
        "id": "l18",
        "num": 18,
        "label": "18. Properties of Determinants",
        "group": "t2",
        "value": 5,
        "time": 45
      },
      {
        "id": "l19",
        "num": 19,
        "label": "19. Determinant Formulas and Cofactors",
        "group": "t2",
        "value": 6,
        "time": 50
      },
      {
        "id": "l20",
        "num": 20,
        "label": "20. Cramer's Rule, Inverse Matrix, and Volume",
        "group": "t2",
        "value": 6,
        "time": 55
      },
      {
        "id": "l21",
        "num": 21,
        "label": "21. Eigenvalues and Eigenvectors",
        "group": "t2",
        "value": 8,
        "time": 60
      },
      {
        "id": "l22",
        "num": 22,
        "label": "22. Diagonalization and Powers of A",
        "group": "t2",
        "value": 7,
        "time": 55
      },
      {
        "id": "l23",
        "num": 23,
        "label": "23. Differential Equations and exp(At)",
        "group": "t2",
        "value": 8,
        "time": 60
      },
      {
        "id": "l24",
        "num": 24,
        "label": "24. Markov Matrices; Fourier Series",
        "group": "t2",
        "value": 7,
        "time": 50
      },
      {
        "id": "l32",
        "num": 32,
        "label": "32. Quiz 2 Review",
        "group": "t2",
        "value": 8,
        "time": 60
      },
      {
        "id": "l25",
        "num": 25,
        "label": "25. Symmetric Matrices and Positive Definiteness",
        "group": "t3",
        "value": 7,
        "time": 55
      },
      {
        "id": "l26",
        "num": 26,
        "label": "26. Complex Matrices; Fast Fourier Transform",
        "group": "t3",
        "value": 8,
        "time": 60
      },
      {
        "id": "l27",
        "num": 27,
        "label": "27. Positive Definite Matrices and Minima",
        "group": "t3",
        "value": 7,
        "time": 55
      },
      {
        "id": "l28",
        "num": 28,
        "label": "28. Similar Matrices and Jordan Form",
        "group": "t3",
        "value": 9,
        "time": 65
      },
      {
        "id": "l29",
        "num": 29,
        "label": "29. Singular Value Decomposition",
        "group": "t3",
        "value": 10,
        "time": 75
      },
      {
        "id": "l30",
        "num": 30,
        "label": "30. Linear Transformations and Their Matrices",
        "group": "t3",
        "value": 7,
        "time": 55
      },
      {
        "id": "l31",
        "num": 31,
        "label": "31. Change of Basis; Image Compression",
        "group": "t3",
        "value": 6,
        "time": 50
      },
      {
        "id": "l33",
        "num": 33,
        "label": "33. Left and Right Inverses; Pseudoinverse",
        "group": "t3",
        "value": 8,
        "time": 60
      },
      {
        "id": "l34",
        "num": 34,
        "label": "34. Final Course Review",
        "group": "t3",
        "value": 8,
        "time": 90
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
        "from": "l3",
        "to": "l4",
        "arrows": "to"
      },
      {
        "from": "l3",
        "to": "l5",
        "arrows": "to"
      },
      {
        "from": "l5",
        "to": "l6",
        "arrows": "to"
      },
      {
        "from": "l4",
        "to": "l6",
        "arrows": "to"
      },
      {
        "from": "l6",
        "to": "l7",
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
        "from": "l6",
        "to": "l9",
        "arrows": "to"
      },
      {
        "from": "l9",
        "to": "l10",
        "arrows": "to"
      },
      {
        "from": "l10",
        "to": "l11",
        "arrows": "to"
      },
      {
        "from": "l10",
        "to": "l12",
        "arrows": "to"
      },
      {
        "from": "l10",
        "to": "l13",
        "arrows": "to"
      },
      {
        "from": "l10",
        "to": "l14",
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
        "from": "l16",
        "to": "l17",
        "arrows": "to"
      },
      {
        "from": "l2",
        "to": "l18",
        "arrows": "to"
      },
      {
        "from": "l18",
        "to": "l19",
        "arrows": "to"
      },
      {
        "from": "l19",
        "to": "l20",
        "arrows": "to"
      },
      {
        "from": "l19",
        "to": "l21",
        "arrows": "to"
      },
      {
        "from": "l21",
        "to": "l22",
        "arrows": "to"
      },
      {
        "from": "l22",
        "to": "l23",
        "arrows": "to"
      },
      {
        "from": "l22",
        "to": "l24",
        "arrows": "to"
      },
      {
        "from": "l17",
        "to": "l32",
        "arrows": "to"
      },
      {
        "from": "l24",
        "to": "l32",
        "arrows": "to"
      },
      {
        "from": "l21",
        "to": "l25",
        "arrows": "to"
      },
      {
        "from": "l14",
        "to": "l25",
        "arrows": "to"
      },
      {
        "from": "l25",
        "to": "l27",
        "arrows": "to"
      },
      {
        "from": "l25",
        "to": "l26",
        "arrows": "to"
      },
      {
        "from": "l22",
        "to": "l28",
        "arrows": "to"
      },
      {
        "from": "l25",
        "to": "l29",
        "arrows": "to"
      },
      {
        "from": "l16",
        "to": "l29",
        "arrows": "to"
      },
      {
        "from": "l9",
        "to": "l30",
        "arrows": "to"
      },
      {
        "from": "l30",
        "to": "l31",
        "arrows": "to"
      },
      {
        "from": "l29",
        "to": "l33",
        "arrows": "to"
      },
      {
        "from": "l27",
        "to": "l34",
        "arrows": "to"
      },
      {
        "from": "l31",
        "to": "l34",
        "arrows": "to"
      },
      {
        "from": "l33",
        "to": "l34",
        "arrows": "to"
      },
      {
        "from": "l26",
        "to": "l34",
        "arrows": "to"
      },
      {
        "from": "l28",
        "to": "l34",
        "arrows": "to"
      }
    ]
  }
};