/**
 * JourneyAutopilotEngine - Nori Ultimate Pedagogical Testbed
 * 
 * Synchronized with Vectoria Official Curriculum Data:
 * - Node 1 (l1): Khái niệm vector, phương, hướng và độ dài (Kiến thức chuẩn bị)
 * - Node 2 (l2): Phép cộng, trừ vector và nhân vector với một số (Kiến thức chuẩn bị)
 * - Node 3 (l3): Biểu diễn tọa độ vector trong không gian 2D và 3D (Kiến thức chuẩn bị)
 * - Node 4 (l10): Khái niệm ma trận và các phép toán ma trận (Ma trận & Định thức)
 * - Node 5 (l21): Cơ sở & Số chiều của không gian vector (Không gian Vector)
 * 
 * Features:
 * 1. HumanGhostCursor: Rock-solid dynamic tracking, viewport-clamped Bezier curves,
 *    Fitts's law easing, reading pauses, overshoot recoil, and click ripple.
 * 2. Full-Journey State Machine: Autonomously navigates Timeline Nodes (1 to 5),
 *    simulates student quiz solving according to distinct personas, updates BKT mastery,
 *    accumulates multi-turn telemetry into session storage, and drives Nori's typewriter speech
 *    with synchronized emotional progression.
 * 3. 1-Click Reset (Tabula Rasa): Restores Day 1 student state with clean history.
 * 4. 1-Click Bug Hunter: Automated audit of accumulated multi-turn JSON.
 * 
 * Strict Compliance: Zero Em-dash, Anti-Slop, Grounded Student Metaphors.
 */

(function(window) {
    'use strict';

    // =========================================================================
    // 1. DATA: 5-NODE LEARNING JOURNEY TIMELINE (OFFICIAL VECTORIA CURRICULUM)
    // =========================================================================
    const JOURNEY_NODES = [
        {
                "id": "l1",
                "num": 1,
                "title": "Khái niệm vector, phương, hướng và độ dài",
                "subtitle": "Chủ đề 1: Kiến thức chuẩn bị - Bài 1 (5 câu thật DB)",
                "conceptKey": "vector_basics",
                "expectedTimePerQ": 45,
                "questions": [
                        {
                                "id": "q_db_35",
                                "dbId": 35,
                                "text": "Kết quả của phép tính: $1 + 1 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "1",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_36",
                                "dbId": 36,
                                "text": "Kết quả của phép tính: $3 - 1 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "1",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_37",
                                "dbId": 37,
                                "text": "Kết quả của phép tính: $2 + 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_38",
                                "dbId": 38,
                                "text": "Kết quả của phép tính: $5 - 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "1",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "3",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_39",
                                "dbId": 39,
                                "text": "Kết quả của phép tính: $4 + 1 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "5",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        }
                ]
        },
        {
                "id": "l2",
                "num": 2,
                "title": "Phép toán vector & Quy tắc hình bình hành",
                "subtitle": "Chủ đề 1: Kiến thức chuẩn bị - Bài 2 (5 câu thật DB)",
                "conceptKey": "vector_ops",
                "expectedTimePerQ": 50,
                "questions": [
                        {
                                "id": "q_db_40",
                                "dbId": 40,
                                "text": "Kết quả của phép tính: $2 + 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "5",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_41",
                                "dbId": 41,
                                "text": "Kết quả của phép tính: $6 - 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_42",
                                "dbId": 42,
                                "text": "Kết quả của phép tính: $4 + 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "6",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_43",
                                "dbId": 43,
                                "text": "Kết quả của phép tính: $7 - 4 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_44",
                                "dbId": 44,
                                "text": "Kết quả của phép tính: $1 + 4 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "5",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        }
                ]
        },
        {
                "id": "l3",
                "num": 3,
                "title": "Biểu diễn tọa độ vector trong không gian 2D và 3D",
                "subtitle": "Chủ đề 1: Kiến thức chuẩn bị - Bài 3 (5 câu thật DB)",
                "conceptKey": "vector_coordinates",
                "expectedTimePerQ": 55,
                "questions": [
                        {
                                "id": "q_db_45",
                                "dbId": 45,
                                "text": "Kết quả của phép tính: $3 + 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "6",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_46",
                                "dbId": 46,
                                "text": "Kết quả của phép tính: $8 - 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "6",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_47",
                                "dbId": 47,
                                "text": "Kết quả của phép tính: $5 + 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "7",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "9",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_48",
                                "dbId": 48,
                                "text": "Kết quả của phép tính: $9 - 5 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        },
                        {
                                "id": "q_db_49",
                                "dbId": 49,
                                "text": "Kết quả của phép tính: $6 + 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "9",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "11",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ]
                        }
                ]
        },
        {
                "id": "final_exam",
                "num": 4,
                "title": "Bài thi Tổng hợp Lộ trình",
                "subtitle": "Tổng hợp 15 câu hỏi thực tế từ Database (5 l1 + 5 l2 + 5 l3)",
                "conceptKey": "final_comprehensive",
                "expectedTimePerQ": 50,
                "questions": [
                        {
                                "id": "q_final_1",
                                "dbId": 35,
                                "text": "Kết quả của phép tính: $1 + 1 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "1",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l1",
                                "originLabel": "Chặng 1: l1"
                        },
                        {
                                "id": "q_final_2",
                                "dbId": 36,
                                "text": "Kết quả của phép tính: $3 - 1 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "1",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l1",
                                "originLabel": "Chặng 1: l1"
                        },
                        {
                                "id": "q_final_3",
                                "dbId": 37,
                                "text": "Kết quả của phép tính: $2 + 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l1",
                                "originLabel": "Chặng 1: l1"
                        },
                        {
                                "id": "q_final_4",
                                "dbId": 38,
                                "text": "Kết quả của phép tính: $5 - 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "1",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "3",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l1",
                                "originLabel": "Chặng 1: l1"
                        },
                        {
                                "id": "q_final_5",
                                "dbId": 39,
                                "text": "Kết quả của phép tính: $4 + 1 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "5",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l1",
                                "originLabel": "Chặng 1: l1"
                        },
                        {
                                "id": "q_final_6",
                                "dbId": 40,
                                "text": "Kết quả của phép tính: $2 + 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "5",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l2",
                                "originLabel": "Chặng 2: l2"
                        },
                        {
                                "id": "q_final_7",
                                "dbId": 41,
                                "text": "Kết quả của phép tính: $6 - 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l2",
                                "originLabel": "Chặng 2: l2"
                        },
                        {
                                "id": "q_final_8",
                                "dbId": 42,
                                "text": "Kết quả của phép tính: $4 + 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "6",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l2",
                                "originLabel": "Chặng 2: l2"
                        },
                        {
                                "id": "q_final_9",
                                "dbId": 43,
                                "text": "Kết quả của phép tính: $7 - 4 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l2",
                                "originLabel": "Chặng 2: l2"
                        },
                        {
                                "id": "q_final_10",
                                "dbId": 44,
                                "text": "Kết quả của phép tính: $1 + 4 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "5",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l2",
                                "originLabel": "Chặng 2: l2"
                        },
                        {
                                "id": "q_final_11",
                                "dbId": 45,
                                "text": "Kết quả của phép tính: $3 + 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "6",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l3",
                                "originLabel": "Chặng 3: l3"
                        },
                        {
                                "id": "q_final_12",
                                "dbId": 46,
                                "text": "Kết quả của phép tính: $8 - 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "5",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "4",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "6",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l3",
                                "originLabel": "Chặng 3: l3"
                        },
                        {
                                "id": "q_final_13",
                                "dbId": 47,
                                "text": "Kết quả của phép tính: $5 + 2 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "7",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "C",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "D",
                                                "text": "9",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l3",
                                "originLabel": "Chặng 3: l3"
                        },
                        {
                                "id": "q_final_14",
                                "dbId": 48,
                                "text": "Kết quả của phép tính: $9 - 5 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "3",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "2",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "4",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "6",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l3",
                                "originLabel": "Chặng 3: l3"
                        },
                        {
                                "id": "q_final_15",
                                "dbId": 49,
                                "text": "Kết quả của phép tính: $6 + 3 = ?$",
                                "options": [
                                        {
                                                "key": "A",
                                                "text": "8",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "B",
                                                "text": "7",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        },
                                        {
                                                "key": "C",
                                                "text": "9",
                                                "isCorrect": true
                                        },
                                        {
                                                "key": "D",
                                                "text": "11",
                                                "isCorrect": false,
                                                "distractor": "ARITHMETIC_SLIP"
                                        }
                                ],
                                "lessonOrigin": "l3",
                                "originLabel": "Chặng 3: l3"
                        }
                ]
        }
    ];

    // =========================================================================
    // 2. JOURNEY PERSONA PROFILES
    // =========================================================================
    const PERSONA_PROFILES = {
        SPAM_RUSHER: {
            id: 'SPAM_RUSHER',
            name: 'Kẻ vội vàng (Spam Rusher)',
            tagline: 'Chọn bừa < 1.5s, không hề đọc đề bài',
            badge: 'Global Spam Guessing (EC-4A)',
            badgeColor: '#e5484d',
            nodeBehavior: (nodeIdx, qIdx) => ({
                readingDelayMs: 380 + Math.random() * 250,
                pickCorrect: false,
                switchCount: 0,
                hesitationOptions: []
            })
        },
        TAIL_FATIGUE: {
            id: 'TAIL_FATIGUE',
            name: 'Đuối sức cuối bài (Tail Fatigue)',
            tagline: 'Đầu bài đọc chuẩn 40s, câu cuối vội < 2s',
            badge: 'End Fatigue (EC-4B)',
            badgeColor: '#d97706',
            nodeBehavior: (nodeIdx, qIdx) => {
                if (qIdx < 2) {
                    return {
                        readingDelayMs: 1600 + Math.random() * 300,
                        pickCorrect: true,
                        switchCount: 0,
                        hesitationOptions: ['B', 'A']
                    };
                } else {
                    return {
                        readingDelayMs: 420 + Math.random() * 200,
                        pickCorrect: false,
                        switchCount: 0,
                        hesitationOptions: []
                    };
                }
            }
        },
        LUCKY_GUESSER: {
            id: 'LUCKY_GUESSER',
            name: 'Đoán mò siêu tốc (Lucky Guesser)',
            tagline: 'Bấm lẹ 1.2s mỗi câu mà 10/10 điểm tuyệt đối',
            badge: 'False Mastery (EC-7 / EC-1)',
            badgeColor: '#8e4ec6',
            nodeBehavior: (nodeIdx, qIdx) => ({
                readingDelayMs: 450 + Math.random() * 300,
                pickCorrect: true,
                switchCount: 0,
                hesitationOptions: []
            })
        },
        OVERTHINKER: {
            id: 'OVERTHINKER',
            name: 'Do dự phân vân (Overthinker)',
            tagline: 'Dành nhiều thời gian, đổi đáp án 3 lần',
            badge: 'Diligent Struggle (EC-3B)',
            badgeColor: '#3e63dd',
            nodeBehavior: (nodeIdx, qIdx) => ({
                readingDelayMs: 2200 + Math.random() * 500,
                pickCorrect: qIdx === 1,
                switchCount: 3,
                hesitationOptions: ['A', 'C', 'B']
            })
        },
        CARELESS_SLIP: {
            id: 'CARELESS_SLIP',
            name: 'Trượt vỏ chuối (Careless Slip)',
            tagline: 'Đi đúng đường toàn bộ, sai đúng 1 dấu số học',
            badge: 'Arithmetic Slip (EC-8)',
            badgeColor: '#0284c7',
            nodeBehavior: (nodeIdx, qIdx) => ({
                readingDelayMs: 1500 + Math.random() * 350,
                pickCorrect: qIdx !== 2,
                switchCount: qIdx === 2 ? 1 : 0,
                hesitationOptions: qIdx === 2 ? ['B'] : []
            })
        },
        AUTHENTIC_MASTER: {
            id: 'AUTHENTIC_MASTER',
            name: 'Làm chủ thực sự (Authentic Master)',
            tagline: 'Tư duy điềm tĩnh, chuẩn mực 10/10 điểm',
            badge: 'Impressed & Proud',
            badgeColor: '#30a46c',
            nodeBehavior: (nodeIdx, qIdx) => ({
                readingDelayMs: 1600 + Math.random() * 400,
                pickCorrect: true,
                switchCount: 0,
                hesitationOptions: ['B', 'A']
            })
        },
        FULL_EVOLUTION: {
            id: 'FULL_EVOLUTION',
            name: 'Tiến hóa Lộ trình (Full 5-Node Journey)',
            tagline: 'Khởi đầu bỡ ngỡ -> cố gắng -> hoàn thiện làm chủ',
            badge: 'Complete 5-Stage Evolution',
            badgeColor: '#0090ff',
            nodeBehavior: (nodeIdx, qIdx) => {
                if (nodeIdx === 0) {
                    return { readingDelayMs: 750, pickCorrect: qIdx === 0, switchCount: 1, hesitationOptions: ['B'] };
                }
                if (nodeIdx === 1) {
                    return { readingDelayMs: 2100, pickCorrect: qIdx !== 1, switchCount: 2, hesitationOptions: ['C', 'A'] };
                }
                if (nodeIdx === 2) {
                    return { readingDelayMs: 1500, pickCorrect: qIdx !== 2, switchCount: 0, hesitationOptions: ['A'] };
                }
                return { readingDelayMs: 1600, pickCorrect: true, switchCount: 0, hesitationOptions: ['B'] };
            }
        }
    };

    // =========================================================================
    // 3. ROCK-SOLID HUMAN GHOST CURSOR (NEVER FLIES AWAY)
    // =========================================================================
    class HumanGhostCursor {
        constructor() {
            this.x = window.innerWidth / 2;
            this.y = window.innerHeight / 2;
            this.cursorEl = null;
            this.rippleContainer = null;
            this.animFrameId = null;
            this.initDOM();
        }

        initDOM() {
            let cursor = document.getElementById('vectoria-human-ghost-cursor');
            if (!cursor) {
                cursor = document.createElement('div');
                cursor.id = 'vectoria-human-ghost-cursor';
                cursor.innerHTML = `
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
                        <!-- Mũi tên con trỏ chuẩn xác -->
                        <path d="M 4 4 L 4 25 L 10 19 L 15 30 L 19 28 L 14 17 L 22 17 Z" 
                              fill="#1c2024" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                        <!-- Đốm sáng định vị tâm click tại đầu nhọn (4, 4) -->
                        <circle cx="4" cy="4" r="2.8" fill="#0090ff"/>
                    </svg>
                    <!-- Vầng hào quang giúp mắt học viên dễ dõi theo -->
                    <div class="cursor-glow" style="position: absolute; top: -3px; left: -3px; width: 14px; height: 14px; border-radius: 50%; background: rgba(0, 144, 255, 0.3); pointer-events: none; filter: blur(2px);"></div>
                `;
                cursor.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 36px;
                    height: 36px;
                    pointer-events: none;
                    z-index: 10000000;
                    transform: translate(${this.x - 4}px, ${this.y - 4}px);
                    will-change: transform;
                    transition: none;
                    display: block;
                `;
                document.body.appendChild(cursor);
            }
            this.cursorEl = cursor;

            let pool = document.getElementById('vectoria-ghost-ripple-pool');
            if (!pool) {
                pool = document.createElement('div');
                pool.id = 'vectoria-ghost-ripple-pool';
                pool.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999999;';
                document.body.appendChild(pool);
            }
            this.rippleContainer = pool;
        }

        async moveTo(targetElOrCoords, speedMultiplier = 1, options = {}) {
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

            // 1. Nếu phần tử nằm ngoài màn hình, cuộn tức thì (instant) để tọa độ chuẩn xác ngay lập tức
            if (targetElOrCoords instanceof HTMLElement) {
                const initRect = targetElOrCoords.getBoundingClientRect();
                const isOutOfView = initRect.top < 70 || initRect.bottom > (window.innerHeight - 70);
                if (isOutOfView) {
                    targetElOrCoords.scrollIntoView({ behavior: 'auto', block: 'center' });
                    await new Promise(r => requestAnimationFrame(r));
                }
            }

            // Hàm trích xuất tọa độ mục tiêu động theo từng frame (chống lệch khi trang cuộn)
            const getTargetPoint = () => {
                if (targetElOrCoords instanceof HTMLElement) {
                    const r = targetElOrCoords.getBoundingClientRect();
                    return {
                        x: Math.max(15, Math.min(window.innerWidth - 30, r.left + r.width / 2)),
                        y: Math.max(15, Math.min(window.innerHeight - 30, r.top + r.height / 2))
                    };
                }
                return {
                    x: Math.max(15, Math.min(window.innerWidth - 30, targetElOrCoords.x || 0)),
                    y: Math.max(15, Math.min(window.innerHeight - 30, targetElOrCoords.y || 0))
                };
            };

            const startX = Math.max(15, Math.min(window.innerWidth - 30, this.x));
            const startY = Math.max(15, Math.min(window.innerHeight - 30, this.y));
            this.x = startX;
            this.y = startY;

            const initialDest = getTargetPoint();
            const dx = initialDest.x - startX;
            const dy = initialDest.y - startY;
            const distance = Math.hypot(dx, dy);

            if (distance < 6) {
                this.x = initialDest.x;
                this.y = initialDest.y;
                this.updateTransform();
                return;
            }

            // Thời gian di chuyển theo Định luật Fitts (350ms - 850ms)
            const baseDuration = Math.min(850, Math.max(340, 300 + Math.log2(1 + distance / 40) * 110));
            const duration = Math.max(100, baseDuration / (speedMultiplier || 1));

            // Bán kính cong kiểm soát chặt chẽ (tối đa 55px) chống văng ra ngoài mép màn hình
            const normalX = -dy / Math.max(1, distance);
            const normalY = dx / Math.max(1, distance);
            const arcDir = (options.arcDirection !== undefined) ? options.arcDirection : (Math.random() > 0.5 ? 1 : -1);
            const curvatureAmount = Math.min(55, distance * 0.16) * arcDir;

            const cp1X = startX + dx * 0.28 + normalX * curvatureAmount;
            const cp1Y = startY + dy * 0.28 + normalY * curvatureAmount;
            const cp2X = startX + dx * 0.72 + normalX * (curvatureAmount * 0.5);
            const cp2Y = startY + dy * 0.72 + normalY * (curvatureAmount * 0.5);

            const startTime = performance.now();

            return new Promise(resolve => {
                const step = (now) => {
                    const elapsed = now - startTime;
                    let progress = Math.min(1, elapsed / duration);

                    // Quintic ease-in-out cho chuyển động gia tốc/hãm phanh tự nhiên
                    const ease = progress < 0.5
                        ? 16 * progress * progress * progress * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 5) / 2;

                    const t = ease;
                    const u = 1 - t;
                    const tt = t * t;
                    const uu = u * u;
                    const uuu = uu * u;
                    const ttt = tt * t;

                    const curDest = getTargetPoint();

                    let curX = uuu * startX + 3 * uu * t * cp1X + 3 * u * tt * cp2X + ttt * curDest.x;
                    let curY = uuu * startY + 3 * uu * t * cp1Y + 3 * u * tt * cp2Y + ttt * curDest.y;

                    // Micro-tremor mô phỏng rung tay sinh học
                    if (progress > 0.1 && progress < 0.9) {
                        curX += (Math.random() - 0.5) * 0.25;
                        curY += (Math.random() - 0.5) * 0.25;
                    }

                    // KHÓA TỌA ĐỘ VÀO KHUNG NHÌN: Chuột tuyệt đối KHÔNG BAO GIỜ bay ra khỏi màn hình
                    this.x = Math.max(12, Math.min(window.innerWidth - 24, curX));
                    this.y = Math.max(12, Math.min(window.innerHeight - 24, curY));
                    this.updateTransform();

                    if (progress < 1) {
                        this.animFrameId = requestAnimationFrame(step);
                    } else {
                        this.x = curDest.x;
                        this.y = curDest.y;
                        this.updateTransform();
                        resolve();
                    }
                };

                this.animFrameId = requestAnimationFrame(step);
            });
        }

        async readingScan(element, scanDurationMs = 800, speedMultiplier = 1) {
            if (!element) return;
            const rect = element.getBoundingClientRect();
            const startScan = { x: rect.left + 24, y: rect.top + 16 };
            const endScan = { x: rect.right - 24, y: rect.top + Math.min(rect.height - 10, 32) };

            await this.moveTo(startScan, speedMultiplier, { arcDirection: 1 });
            await this.sleep(100 / speedMultiplier);
            await this.moveTo(endScan, speedMultiplier * 0.8, { arcDirection: -0.4 });
            await this.sleep(120 / speedMultiplier);
        }

        async click(targetEl, speedMultiplier = 1) {
            // Hiệu ứng ấn phím chuột
            if (this.cursorEl) {
                this.cursorEl.style.transform = `translate(${this.x - 4}px, ${this.y - 4}px) scale(0.85)`;
            }

            this.spawnRipple(this.x, this.y);
            await this.sleep(90 / speedMultiplier);

            if (this.cursorEl) {
                this.cursorEl.style.transform = `translate(${this.x - 4}px, ${this.y - 4}px) scale(1)`;
            }

            if (targetEl && typeof targetEl.click === 'function') {
                targetEl.click();
            }

            await this.sleep(70 / speedMultiplier);
        }

        spawnRipple(x, y) {
            if (!this.rippleContainer) return;
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                top: ${y}px;
                left: ${x}px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                border: 2px solid #0090ff;
                background: rgba(0, 144, 255, 0.25);
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.9;
                pointer-events: none;
                transition: transform 0.38s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.38s ease-out;
            `;
            this.rippleContainer.appendChild(ripple);

            requestAnimationFrame(() => {
                ripple.style.transform = 'translate(-50%, -50%) scale(5.5)';
                ripple.style.opacity = '0';
            });

            setTimeout(() => {
                if (ripple.parentElement) ripple.parentElement.removeChild(ripple);
            }, 420);
        }

        updateTransform() {
            if (this.cursorEl) {
                // Định vị đầu nhọn (4, 4) của mũi tên vào đúng tọa độ (x, y)
                this.cursorEl.style.transform = `translate(${this.x - 4}px, ${this.y - 4}px)`;
            }
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, Math.max(10, ms)));
        }

        resetTo(x, y) {
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            this.x = x || (window.innerWidth / 2);
            this.y = y || (window.innerHeight / 2);
            this.updateTransform();
        }
    }

    // =========================================================================
    // 4. BAYESIAN KNOWLEDGE TRACING (BKT) ENGINE
    // =========================================================================
    class SimpleBKTEngine {
        constructor() {
            this.pL0 = 0.15;
            this.pT = 0.20;
            this.pG = 0.25;
            this.pS = 0.10;
            this.skillMastery = {};
        }

        getMastery(conceptKey) {
            if (this.skillMastery[conceptKey] === undefined) {
                this.skillMastery[conceptKey] = this.pL0;
            }
            return this.skillMastery[conceptKey];
        }

        updateObservation(conceptKey, isCorrect) {
            const pL = this.getMastery(conceptKey);
            let pL_post = 0;

            if (isCorrect) {
                const num = pL * (1 - this.pS);
                const denom = num + (1 - pL) * this.pG;
                pL_post = num / Math.max(0.0001, denom);
            } else {
                const num = pL * this.pS;
                const denom = num + (1 - pL) * (1 - this.pG);
                pL_post = num / Math.max(0.0001, denom);
            }

            const pL_next = pL_post + (1 - pL_post) * this.pT;
            this.skillMastery[conceptKey] = Math.min(0.99, Math.max(0.02, pL_next));
            return {
                prior: pL,
                posterior: pL_next,
                isCorrect: isCorrect
            };
        }

        reset() {
            this.skillMastery = {};
        }
    }

    // =========================================================================
    // 5. JOURNEY AUTOPILOT STATE MACHINE
    // =========================================================================
    class JourneyAutopilotEngine {
        constructor(config = {}) {
            this.nodes = JOURNEY_NODES;
            this.cursor = new HumanGhostCursor();
            this.bkt = new SimpleBKTEngine();
            
            this.activeNodeIndex = 0;
            this.activeQuestionIndex = 0;
            this.activePersonaKey = 'SPAM_RUSHER';
            this.speedMultiplier = config.speedMultiplier || 1;
            
            this.isPlaying = false;
            this.isPaused = false;
            this.abortRequested = false;

            this.accumulatedSessions = [];
            this.nodeStates = this.nodes.map((n, idx) => ({
                id: n.id,
                title: n.title,
                conceptKey: n.conceptKey,
                isUnlocked: idx === 0,
                isCompleted: false,
                score: null,
                mastery: 0.15,
                bktHistory: []
            }));

            this.onStateChange = config.onStateChange || null;
            this.onNodeChange = config.onNodeChange || null;
            this.onQuestionChange = config.onQuestionChange || null;
            this.onMentorSpeech = config.onMentorSpeech || null;
            this.onAuditUpdate = config.onAuditUpdate || null;
        }

        setPersona(personaKey) {
            if (PERSONA_PROFILES[personaKey]) {
                this.activePersonaKey = personaKey;
                this.notifyState();
            }
        }

        setSpeed(multiplier) {
            this.speedMultiplier = Math.max(0.25, Math.min(3, multiplier));
            this.notifyState();
        }

        // 1-Click Reset (Tabula Rasa)
        resetAll() {
            this.abortRequested = true;
            this.isPlaying = false;
            this.isPaused = false;

            this.activeNodeIndex = 0;
            this.activeQuestionIndex = 0;
            this.accumulatedSessions = [];
            this.bkt.reset();

            this.nodeStates = this.nodes.map((n, idx) => ({
                id: n.id,
                title: n.title,
                conceptKey: n.conceptKey,
                isUnlocked: idx === 0,
                isCompleted: false,
                score: null,
                mastery: 0.15,
                bktHistory: []
            }));

            try {
                sessionStorage.removeItem('latest_mentor_session');
                sessionStorage.removeItem('vectoria_accumulated_journey');
            } catch (e) {}

            this.cursor.resetTo(window.innerWidth / 2, window.innerHeight / 2);

            this.notifyState();
            if (typeof this.onAuditUpdate === 'function') {
                this.onAuditUpdate(this.runBugHunterAudit());
            }
        }

        async playJourney() {
            if (this.isPlaying) return;
            this.isPlaying = true;
            this.isPaused = false;
            this.abortRequested = false;
            this.notifyState();

            try {
                while (this.activeNodeIndex < this.nodes.length && !this.abortRequested) {
                    while (this.isPaused && !this.abortRequested) {
                        await this.sleep(200);
                    }
                    if (this.abortRequested) break;

                    const currentNode = this.nodes[this.activeNodeIndex];
                    this.nodeStates[this.activeNodeIndex].isUnlocked = true;
                    if (this.onNodeChange) this.onNodeChange(currentNode, this.activeNodeIndex);

                    // 1. Click Timeline Node in UI
                    await this.executeTimelineNodeClick(this.activeNodeIndex);
                    if (this.abortRequested) break;

                    // 2. Solve Quiz Questions for this Node
                    const nodeResult = await this.executeNodeQuiz(currentNode, this.activeNodeIndex);
                    if (this.abortRequested) break;

                    // 3. Trigger Pedagogical Diagnosis & BKT Updates
                    const sessionData = this.generatePedagogicalSession(currentNode, nodeResult);
                    this.accumulatedSessions.push(sessionData);

                    try {
                        sessionStorage.setItem('latest_mentor_session', JSON.stringify(sessionData));
                        sessionStorage.setItem('vectoria_accumulated_journey', JSON.stringify(this.accumulatedSessions));
                    } catch (e) {}

                    this.nodeStates[this.activeNodeIndex].isCompleted = true;
                    this.nodeStates[this.activeNodeIndex].score = sessionData.score;
                    this.nodeStates[this.activeNodeIndex].mastery = this.bkt.getMastery(currentNode.conceptKey);

                    if (this.activeNodeIndex + 1 < this.nodes.length) {
                        this.nodeStates[this.activeNodeIndex + 1].isUnlocked = true;
                    }

                    // 4. Deliver Nori Typewriter Speech with Progressive Emotion
                    await this.deliverMentorSpeech(sessionData);
                    if (this.abortRequested) break;

                    // 5. Post-Node Reflection Pause
                    await this.sleep(2200 / this.speedMultiplier);

                    this.activeNodeIndex++;
                    this.notifyState();
                }
            } catch (err) {
                console.error('[JourneyAutopilotEngine] Error during journey:', err);
            } finally {
                this.isPlaying = false;
                this.notifyState();
                if (typeof this.onAuditUpdate === 'function') {
                    this.onAuditUpdate(this.runBugHunterAudit());
                }
            }
        }

        pauseJourney() {
            this.isPaused = true;
            this.notifyState();
        }

        resumeJourney() {
            this.isPaused = false;
            this.notifyState();
        }

        async executeTimelineNodeClick(nodeIdx) {
            const nodeBtn = document.getElementById(`timeline-node-card-${nodeIdx}`);
            if (nodeBtn) {
                await this.cursor.moveTo(nodeBtn, this.speedMultiplier);
                await this.sleep(200 / this.speedMultiplier);
                await this.cursor.click(nodeBtn, this.speedMultiplier);
                await this.sleep(250 / this.speedMultiplier);
            }
        }

        async executeNodeQuiz(node, nodeIdx) {
            const persona = PERSONA_PROFILES[this.activePersonaKey] || PERSONA_PROFILES.SPAM_RUSHER;
            const itemsSummary = [];

            for (let qIdx = 0; qIdx < node.questions.length; qIdx++) {
                if (this.abortRequested) break;
                const question = node.questions[qIdx];
                this.activeQuestionIndex = qIdx;
                if (this.onQuestionChange) this.onQuestionChange(question, qIdx);

                const questionTextEl = document.getElementById(`testbed-q-text`);
                const behavior = persona.nodeBehavior(nodeIdx, qIdx);

                if (questionTextEl && behavior.readingDelayMs > 800) {
                    await this.cursor.readingScan(questionTextEl, behavior.readingDelayMs, this.speedMultiplier);
                } else {
                    await this.sleep(Math.max(50, behavior.readingDelayMs / this.speedMultiplier));
                }

                if (behavior.hesitationOptions && behavior.hesitationOptions.length > 0) {
                    for (const optKey of behavior.hesitationOptions) {
                        const optEl = document.getElementById(`testbed-opt-${optKey}`);
                        if (optEl) {
                            await this.cursor.moveTo(optEl, this.speedMultiplier * 1.2);
                            await this.sleep(180 / this.speedMultiplier);
                        }
                    }
                }

                let chosenOpt = question.options.find(o => behavior.pickCorrect ? o.isCorrect : !o.isCorrect);
                if (!chosenOpt) chosenOpt = question.options[0];

                const chosenOptEl = document.getElementById(`testbed-opt-${chosenOpt.key}`);
                if (chosenOptEl) {
                    await this.cursor.moveTo(chosenOptEl, this.speedMultiplier);
                    await this.sleep(120 / this.speedMultiplier);
                    await this.cursor.click(chosenOptEl, this.speedMultiplier);
                }

                const isCorrect = !!chosenOpt.isCorrect;
                const bktUpdate = this.bkt.updateObservation(node.conceptKey, isCorrect);
                this.nodeStates[nodeIdx].bktHistory.push(bktUpdate);

                const timeSpent = Math.max(0.8, (behavior.readingDelayMs / 1000).toFixed(1));
                itemsSummary.push({
                    index: qIdx + 1,
                    is_correct: isCorrect,
                    time_spent_seconds: parseFloat(timeSpent),
                    tags: isCorrect ? ['Chính xác'] : [chosenOpt.distractor || 'Sai sót']
                });

                await this.sleep(250 / this.speedMultiplier);
            }

            const submitBtn = document.getElementById('testbed-submit-quiz-btn');
            if (submitBtn) {
                await this.cursor.moveTo(submitBtn, this.speedMultiplier);
                await this.sleep(200 / this.speedMultiplier);
                await this.cursor.click(submitBtn, this.speedMultiplier);
                await this.sleep(350 / this.speedMultiplier);
            }

            return {
                itemsSummary: itemsSummary
            };
        }

        generatePedagogicalSession(node, nodeResult) {
            const items = nodeResult.itemsSummary;
            const correctCount = items.filter(it => it.is_correct).length;
            const totalQuestions = items.length;
            const score = (correctCount / totalQuestions) * 10;
            const totalTime = items.reduce((acc, it) => acc + it.time_spent_seconds, 0);
            const avgTime = totalTime / totalQuestions;

            const detectedCases = [];
            const isAllFast = items.every(it => it.time_spent_seconds < 2.0);
            const isTailFast = items.length >= 3 && items[items.length - 1].time_spent_seconds < 2.0 && items[0].time_spent_seconds > 10.0;

            if (isAllFast && score >= 9.0) {
                detectedCases.push({
                    code: 'EC-7_FALSE_MASTERY',
                    title: 'Đoán mò siêu tốc đạt điểm cao',
                    reason: 'Thời gian thao tác dưới 2 giây/câu nhưng đạt điểm tuyệt đối.'
                });
            } else if (isAllFast) {
                detectedCases.push({
                    code: 'EC-4A_GLOBAL_SPAM_GUESSING',
                    title: 'Chọn vội toàn bài',
                    reason: 'Thời gian phản hồi mỗi câu dưới 2 giây, không đảm bảo việc đọc hiểu đề bài.'
                });
            } else if (isTailFast) {
                detectedCases.push({
                    code: 'EC-4B_END_OF_TEST_FATIGUE',
                    title: 'Đuối sức ở những câu cuối',
                    reason: 'Các câu đầu đọc cẩn trọng nhưng các câu cuối chọn vội.'
                });
            }

            let speechText = '';
            let avatarMood = 'thoughtful';
            let emotionProgression = ['thoughtful'];
            let summaryReason = '';
            let suggestedAction = '';

            const caseCodes = detectedCases.map(c => c.code);

            if (caseCodes.includes('EC-7_FALSE_MASTERY')) {
                speechText = `Bạn ơi, ú òa! Điểm ${score.toFixed(1)}/10 ở bài ${node.title} nhìn loáng mắt tưởng cao thủ phương nào ghé thăm! Cơ mà mỗi câu bạn bấm có hơn 1 giây làm tớ ngồi cạnh dụi mắt mấy lần luôn. Bạn có bí kíp tính nhẩm thần sầu nào thì bật mí cho tớ học lỏm với nha, hay là chọn đại mà trúng phóc vậy nè? Mấy bài sau cạm bẫy giăng như mạng nhện, lướt vội là dễ trượt vỏ chuối lắm á!`;
                avatarMood = 'puzzled';
                emotionProgression = ['shocked', 'wink', 'puzzled'];
                summaryReason = 'Tốc độ phản hồi cực nhanh đạt điểm tối đa, cần đối chiếu bí kíp tư duy.';
                suggestedAction = 'Bật mí bí kíp tư duy bên dưới để Nori đồng hành cùng bạn nha.';
            } else if (caseCodes.includes('EC-4A_GLOBAL_SPAM_GUESSING')) {
                speechText = `Bạn ơi, tớ thấy bạn chọn phương án ở tất cả các câu hỏi của bài ${node.title} nhanh như gió thoảng luôn, chưa đầy 2 giây một câu! Ủa nãy là bạn đọc đề hay đề đọc bạn vậy nè? Toán chứ đâu phải bốc thăm trúng thưởng đâu bạn ơi. Hít một hơi thật sâu, uống ngụm nước mát rồi tụi mình cùng đọc kỹ đề làm lại nhen, tớ ngồi đây đợi bạn mà!`;
                avatarMood = 'shocked';
                emotionProgression = ['shocked', 'wink', 'stern', 'empathetic'];
                summaryReason = 'Chọn phương án quá nhanh ở tất cả các câu hỏi.';
                suggestedAction = 'Thong thả uống ngụm nước, đọc kỹ đề rồi làm lại cùng Nori nhé.';
            } else if (caseCodes.includes('EC-4B_END_OF_TEST_FATIGUE')) {
                speechText = `Bạn ơi, mấy câu đầu bạn giải ngọt lịm như trà sữa full topping vậy, mà tự dưng đến những câu cuối tay bấm vèo vèo như pin điện thoại tụt còn 1% á! Chắc não bắt đầu kêu đòi nghỉ xả hơi rồi đúng hông nè? Thôi đứng dậy vươn vai, rửa mặt cho tỉnh táo rồi tụi mình chiến tiếp, đừng để mấy câu cuối làm rơi rớt uổng công sức nhen!`;
                avatarMood = 'stern';
                emotionProgression = ['puzzled', 'stern', 'empathetic'];
                summaryReason = 'Sự tập trung suy giảm ở những câu cuối bài kiểm tra.';
                suggestedAction = 'Nghỉ ngơi 3 phút nạp năng lượng rồi cùng Nori làm tiếp nào.';
            } else if (score >= 8.0) {
                speechText = `Bạn ơi, đỉnh của chóp luôn nha! Bạn làm bài ${node.title} nhẹ nhàng như ăn kẹo, điểm ${score.toFixed(1)}/10 sáng rực rỡ luôn nè! Từng bước phân tích đều chắc nịch, nhịp độ vừa vặn không chê vào đâu được. Phong độ đang lên cao chót vót, tụi mình thừa thắng xông lên bài tiếp theo luôn cho nóng hén!`;
                avatarMood = 'proud';
                emotionProgression = ['proud', 'wink', 'proud'];
                summaryReason = 'Nắm vững trọn vẹn kiến thức với nhịp độ tư duy chuẩn mực.';
                suggestedAction = 'Tiến thẳng vào bài học tiếp theo trên lộ trình nào.';
            } else if (score >= 5.0) {
                speechText = `Bạn ơi, nền tảng của bạn ở bài ${node.title} khá ổn áp rồi nè, chỉ là gặp mấy câu gài bẫy hơi lúng túng xíu thôi. Không sao hết á, ai mới học cũng phải vấp vài chỗ mới vỡ lẽ ra được. Tụi mình nghía lại phần lý thuyết một tí rồi làm vài câu tương tự là phản xạ bén ngót ngay thôi!`;
                avatarMood = 'thoughtful';
                emotionProgression = ['wink', 'thoughtful', 'empathetic'];
                summaryReason = 'Nắm chắc kiến thức nền tảng, cần phân tích kỹ hơn ở các câu hỏi nâng cao.';
                suggestedAction = `Làm thêm vài câu tự luyện của ${node.title} cùng Nori nha.`;
            } else {
                speechText = `Bạn ơi, đừng buồn nha, bài ${node.title} này công nhận hơi hóc búa thiệt, tớ nhìn đề lúc đầu cũng thấy hoa cả mắt á! Coi như lần này mình đi thám thính địa hình trước đi. Giờ nghỉ ngơi một tí, uống miếng nước rồi tớ với bạn cùng mổ xẻ lại từng dạng bài từ từ, không có gì phải xoắn hết nè!`;
                avatarMood = 'empathetic';
                emotionProgression = ['empathetic', 'thoughtful', 'empathetic'];
                summaryReason = 'Chưa nắm chắc kiến thức cơ sở, cần rà soát lại bài giảng.';
                suggestedAction = `Đọc lại lý thuyết và các ví dụ mẫu của ${node.title} rồi thử lại nha.`;
            }

            return {
                quiz_id: node.id,
                quiz_title: node.title,
                conceptKey: node.conceptKey,
                user_name: 'Khoa',
                score: score,
                correct_count: correctCount,
                total_questions: totalQuestions,
                passed: score >= 5.0,
                source: 'deterministic',
                llm_status: 'completed',
                tone_emotion: avatarMood.toUpperCase(),
                avatarMood: avatarMood,
                mentor_avatar_mood: avatarMood,
                mentor_speech: {
                    text: speechText,
                    avatar_mood: avatarMood,
                    emotion_progression: emotionProgression,
                    summary_reason: summaryReason,
                    suggested_action: suggestedAction
                },
                itemsSummary: items,
                telemetry: {
                    time_per_question_avg: avgTime,
                    total_time_seconds: totalTime,
                    switch_tab_count: 0,
                    rapid_guessing_detected: isAllFast || isTailFast
                },
                detected_cases: detectedCases,
                bkt_mastery: this.bkt.getMastery(node.conceptKey)
            };
        }

        async deliverMentorSpeech(sessionData) {
            const speech = sessionData.mentor_speech;
            const text = speech.text || '';
            const progression = speech.emotion_progression || [speech.avatar_mood];

            if (this.onMentorSpeech) {
                this.onMentorSpeech(sessionData, {
                    currentText: '',
                    currentMood: progression[0],
                    isComplete: false
                });
            }

            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            let accumulatedText = '';

            for (let i = 0; i < sentences.length; i++) {
                if (this.abortRequested) break;
                const sentence = sentences[i];
                const moodIdx = Math.min(i, progression.length - 1);
                const currentMood = progression[moodIdx];

                const words = sentence.trim().split(/\s+/);
                for (const word of words) {
                    if (this.abortRequested) break;
                    accumulatedText += (accumulatedText ? ' ' : '') + word;
                    if (this.onMentorSpeech) {
                        this.onMentorSpeech(sessionData, {
                            currentText: accumulatedText,
                            currentMood: currentMood,
                            isComplete: false
                        });
                    }
                    await this.sleep(40 / this.speedMultiplier);
                }
                await this.sleep(250 / this.speedMultiplier);
            }

            if (this.onMentorSpeech) {
                this.onMentorSpeech(sessionData, {
                    currentText: text,
                    currentMood: progression[progression.length - 1],
                    isComplete: true
                });
            }
        }

        runBugHunterAudit() {
            const issues = [];
            const forbiddenVars = ['l_z', 'theta', 'EC-1', 'flag', 'BKT', 'RTE', 'ngưỡng đọc hiểu', 'điều kiện biên'];
            const forbiddenCliches = ['nâng tầm', 'kỷ nguyên mới', 'thay đổi cuộc chơi', 'bộ não sắc sảo', 'êm ru', 'lên đỉnh'];

            if (this.accumulatedSessions.length === 0) {
                return {
                    status: 'IDLE',
                    totalSessions: 0,
                    issuesCount: 0,
                    details: 'Chưa có phiên kiểm thử nào được ghi nhận. Hãy bấm [▶ Bắt đầu Autopilot] để chạy kiểm thử.'
                };
            }

            this.accumulatedSessions.forEach((sess, sIdx) => {
                const speech = sess.mentor_speech?.text || '';
                const summary = sess.mentor_speech?.summary_reason || '';
                const action = sess.mentor_speech?.suggested_action || '';
                const combined = `${speech} ${summary} ${action}`;

                forbiddenVars.forEach(v => {
                    if (combined.includes(v)) {
                        issues.push({
                            sessionIndex: sIdx + 1,
                            quizId: sess.quiz_id,
                            type: 'LEAKED_INTERNAL_VAR',
                            severity: 'CRITICAL',
                            message: `Lộ biến nội bộ "${v}" trong lời thoại hoặc ghi chú sư phạm.`
                        });
                    }
                });

                forbiddenCliches.forEach(c => {
                    if (combined.toLowerCase().includes(c)) {
                        issues.push({
                            sessionIndex: sIdx + 1,
                            quizId: sess.quiz_id,
                            type: 'FORBIDDEN_CLICHE',
                            severity: 'HIGH',
                            message: `Sử dụng từ sáo rỗng A.I Slop "${c}".`
                        });
                    }
                });

                if (combined.includes('\u2014') || combined.includes('--')) {
                    issues.push({
                        sessionIndex: sIdx + 1,
                        quizId: sess.quiz_id,
                        type: 'EMDASH_VIOLATION',
                        severity: 'MEDIUM',
                        message: 'Phát hiện dấu gạch ngang dài (em-dash) hoặc gạch nối kép trong văn bản.'
                    });
                }

                if (sess.score === null || sess.score === undefined || isNaN(sess.score)) {
                    issues.push({
                        sessionIndex: sIdx + 1,
                        quizId: sess.quiz_id,
                        type: 'SCHEMA_INVALID_SCORE',
                        severity: 'HIGH',
                        message: 'Trường điểm số (score) bị null, undefined hoặc NaN.'
                    });
                }

                if (!sess.mentor_speech?.avatar_mood) {
                    issues.push({
                        sessionIndex: sIdx + 1,
                        quizId: sess.quiz_id,
                        type: 'MISSING_AVATAR_MOOD',
                        severity: 'MEDIUM',
                        message: 'Thiếu avatar_mood trong mentor_speech.'
                    });
                }
            });

            return {
                status: issues.length === 0 ? 'PASSED' : 'FAILED',
                totalSessions: this.accumulatedSessions.length,
                issuesCount: issues.length,
                issues: issues,
                details: issues.length === 0
                    ? `Hoàn hảo! Toàn bộ ${this.accumulatedSessions.length} chặng kiểm thử đều sạch 100% bug ẩn, không rò rỉ biến kỹ thuật, không vi phạm em-dash và không dùng từ sáo rỗng.`
                    : `Phát hiện ${issues.length} vấn đề cần lưu ý trong dữ liệu phiên tích lũy.`
            };
        }

        notifyState() {
            if (typeof this.onStateChange === 'function') {
                this.onStateChange({
                    isPlaying: this.isPlaying,
                    isPaused: this.isPaused,
                    activeNodeIndex: this.activeNodeIndex,
                    activePersonaKey: this.activePersonaKey,
                    speedMultiplier: this.speedMultiplier,
                    accumulatedSessions: this.accumulatedSessions,
                    nodeStates: this.nodeStates
                });
            }
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, Math.max(10, ms)));
        }
    }

    window.JourneyAutopilotEngine = JourneyAutopilotEngine;
    window.JOURNEY_NODES = JOURNEY_NODES;
    window.PERSONA_PROFILES = PERSONA_PROFILES;

})(window);
