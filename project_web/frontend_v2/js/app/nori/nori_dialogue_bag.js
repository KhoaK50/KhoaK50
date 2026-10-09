/**
 * Nori Dialogue Shuffle Bag Engine
 * Vectoria Multiple-Choice Pedagogical Voice
 * 
 * Non-repeating Shuffle Bag algorithm for instant (0ms), zero-quota,
 * 100% Multiple-Choice aligned responses with no repetitive dialogue.
 */
(function(global) {
    'use strict';

    const STORAGE_KEY = 'vectoria_nori_dialogue_bag';

    // 100% Multiple-Choice aligned dialogue bank (Zero essay terms)
    const DIALOGUE_BANK = {
        'EC-4A_GLOBAL_SPAM_GUESSING': [
            {
                text: "Ủa bạn ơi, nãy là bạn đọc đề hay đề đọc bạn vậy nè? Bốn phương án lựa chọn người ta soạn công phu vậy mà bạn lướt qua chưa đầy hai giây là bốc thăm trúng thưởng rồi! Thong thả uống ngụm nước rồi đọc kỹ từng đáp án làm lại cùng Nori nha.",
                mood: 'shocked',
                progression: ['shocked', 'puzzled', 'empathetic']
            },
            {
                text: "Khoan khoan dừng khoảng chừng là hai giây nè! Bạn lướt qua toàn bộ bài như một cơn lốc xoáy vậy á. Bấm chọn chớp nhoáng thế này dễ dính trúng phương án mồi lắm. Giờ tụi mình đọc chậm rãi từng câu rồi chốt lại cho thật chuẩn nhen!",
                mood: 'puzzled',
                progression: ['shocked', 'wink', 'empathetic']
            },
            {
                text: "Hú hồn luôn á bạn ơi! Vừa mở bài ra mà bạn bấm chọn đáp án liên thanh như gõ phím chơi game hành động vậy nè. Đề trắc nghiệm nhiều bẫy ngầm lắm, chậm lại một nhịp đọc hết 4 phương án rồi mình làm lại đàng hoàng nhé!",
                mood: 'shocked',
                progression: ['shocked', 'stern', 'empathetic']
            }
        ],
        'EC-4B_END_OF_TEST_FATIGUE': [
            {
                text: "Mấy câu đầu bạn chọn chắc tay và dứt khoát ghê luôn, cơ mà đến mấy câu cuối hình như pin tụt còn một phần trăm nên bấm vội cho xong bài đúng hông nè? Đứng dậy vươn vai uống ngụm nước rồi quay lại giải quyết dứt điểm cùng tớ nha!",
                mood: 'stern',
                progression: ['thoughtful', 'puzzled', 'empathetic']
            },
            {
                text: "Khởi đầu bài giải ngọt lịm như trà sữa full topping luôn, mà khúc đuôi tự dưng bạn tăng tốc bất ngờ, mấy câu cuối lướt qua vội vã uổng ghê á. Chắc bắt đầu mỏi mắt rồi ha? Nghỉ ba phút xả hơi rồi tụi mình phục thù nhé!",
                mood: 'empathetic',
                progression: ['puzzled', 'stern', 'empathetic']
            },
            {
                text: "Đoạn đầu phong độ ngời ngời luôn nè, cơ mà càng về cuối bài thì tốc độ bấm càng nhanh bất thường giống như não đang phát tín hiệu cầu cứu vậy á. Đừng để mấy câu cuối làm rơi rớt điểm uổng công sức, hít thở sâu rồi làm lại cùng tớ nào!",
                mood: 'thoughtful',
                progression: ['wink', 'thoughtful', 'empathetic']
            }
        ],
        'EC-3B_DILIGENT_STRUGGLE': [
            {
                text: "Tớ thấy bạn phân vân, đổi qua đổi lại giữa hai phương án mấy bận luôn, nhìn thương ghê á! Đứng trước hai lựa chọn 50/50 rất dễ làm mình nghi ngờ chính mình. Lần tới cứ bám chắc vào định nghĩa gốc là tự tin chốt ngay nha!",
                mood: 'empathetic',
                progression: ['thoughtful', 'puzzled', 'empathetic']
            },
            {
                text: "Bạn làm bài cẩn thận ghê luôn, cân nhắc tới lui từng phương án một cách nghiêm túc nè. Tính cẩn trọng này là điểm cộng siêu bự, chỉ là đôi khi nghĩ nhiều quá lại làm mình rối tinh. Cứ tin tưởng vào lập luận ban đầu của mình hơn một xíu nha!",
                mood: 'thoughtful',
                progression: ['wink', 'thoughtful', 'empathetic']
            },
            {
                text: "Nhìn bạn đắn đo chọn đi chọn lại giữa các phương án làm tớ cũng nín thở theo luôn á! Càng đắn đo thì các đáp án càng giống nhau, lần sau bạn cứ bám vào định nghĩa cốt lõi của bài học là tự tin bấm ngay, bạn làm được mà!",
                mood: 'empathetic',
                progression: ['puzzled', 'wink', 'empathetic']
            }
        ],
        'EC-8_CARELESS_SLIP': [
            {
                text: "Trời ơi tiếc hùi hụi luôn á bạn ơi! Kiến thức bài này bạn nắm chắc như lòng bàn tay rồi, chỉ tiếc là tác giả gài một phương án mồi đối xứng dấu mà mình lướt qua bấm nhầm mất tiêu! Lần sau dành ra năm giây rà soát lại các đáp án bẫy là điểm mười nằm gọn trong tay nha!",
                mood: 'empathetic',
                progression: ['puzzled', 'stern', 'empathetic']
            },
            {
                text: "Tớ ngồi cạnh xem mà tiếc đứt ruột luôn nè! Toàn bài bạn chọn đáp án siêu chuẩn và dứt khoát, chỉ có đúng một câu bị dính phải phương án bẫy mà người ra đề gài vào. Khắc phục được bẫy dấu này là bạn vô đối luôn, chuẩn bị rinh điểm mười bài sau nhé!",
                mood: 'thoughtful',
                progression: ['shocked', 'puzzled', 'empathetic']
            },
            {
                text: "Xém chút nữa là ẵm trọn điểm tuyệt đối rồi á, tiếc quá chừng luôn! Người ra đề trắc nghiệm tinh quái lắm, luôn chuẩn bị sẵn một phương án sai chỉ khác đúng một dấu trừ để thử thách độ tinh mắt của tụi mình. Cố lên, lần sau quét sạch bẫy nha!",
                mood: 'empathetic',
                progression: ['puzzled', 'wink', 'empathetic']
            }
        ],
        'EC-2_PROCEDURAL_TRAP': [
            {
                text: "Mấy câu hỏi tính số cụ thể bạn chọn đáp án chuẩn xác và dứt khoát ghê luôn, tớ vỗ tay rào rào nè! Cơ mà hễ đụng tới câu hỏi bản chất lý thuyết định lý là các phương án lựa chọn làm mình hơi khựng lại xíu ha. Dành thêm chút thời gian nghía lại ý nghĩa hình học là tự tin cân đẹp mọi bài liền à!",
                mood: 'thoughtful',
                progression: ['wink', 'thoughtful', 'empathetic']
            },
            {
                text: "Kỹ năng xử lý các câu hỏi số liệu của bạn mượt mà đỉnh cao luôn á, chốt đáp án nhanh như chớp! Nhưng khi gặp các câu hỏi trắc nghiệm xoay quanh bản chất phép biến đổi thì mình lại hơi đắn đo một chút. Tụi mình cùng ngẫm lại định nghĩa gốc một xíu cùng Nori nhé!",
                mood: 'thoughtful',
                progression: ['thoughtful', 'puzzled', 'empathetic']
            }
        ],
        'EC-1_LUCKY_GUESS': [
            {
                text: "Ú òa! Điểm số sáng rực rỡ luôn, mà sao mấy câu phân hóa hóc búa bạn chốt đáp án trong một nốt nhạc nhanh như cơn gió vậy ta? Thần sầu dữ vậy nè! Tụi mình cùng kiểm chứng lại độ chắc tay ở bài đánh giá tổng kết sắp tới nha!",
                mood: 'puzzled',
                progression: ['shocked', 'wink', 'proud']
            },
            {
                text: "Hú hồn chim én luôn! Bài đạt điểm tuyệt đối mà bạn chốt phương án cái rụp làm tớ ngồi cạnh chưa kịp chớp mắt luôn á. Trực giác nhạy bén thì cừ thật, nhưng các bài sau bẫy giăng nhiều lắm, nhớ kiểm chứng độ chắc tay ở bài tới nhé!",
                mood: 'shocked',
                progression: ['shocked', 'puzzled', 'wink']
            }
        ],
        'HIGH_SCORE': [
            {
                text: "Đỉnh của chóp luôn nha bạn ơi! Điểm số cao chót vót sáng rực rỡ luôn nè! Từng câu hỏi bạn đọc đề kỹ càng và chốt đáp án cực kỳ dứt khoát luôn. Phong độ đang lên cao, tụi mình thừa thắng xông lên bài tiếp theo luôn cho nóng hén!",
                mood: 'proud',
                progression: ['proud', 'wink', 'proud']
            },
            {
                text: "Xuất sắc xuất sắc! Bài làm đẹp như một bức tranh vậy á! Mọi cạm bẫy của người ra đề trắc nghiệm đều bị bạn hóa giải ngọt lịm luôn nè. Cứ phong độ này thì bài kiểm tra tổng kết chỉ là chuyện nhỏ đối với bạn thôi!",
                mood: 'proud',
                progression: ['proud', 'joy_insight', 'proud']
            }
        ],
        'REPEAT_PROGRESS': [
            {
                text: "Xịn đét luôn bạn ơi! Kiên trì cày cuốc và tiến bộ rõ rệt luôn nè, nhìn điểm số nâng cấp làm tớ vui lây luôn á! Bạn không hề nản chí mà rút kinh nghiệm từ các phương án bẫy cực kỳ nhanh, phong độ nâng cấp rõ rệt luôn!",
                mood: 'proud',
                progression: ['proud', 'wink', 'proud']
            }
        ],
        'STANDARD_FAIL': [
            {
                text: "Không sao cả đâu bạn ơi, bài toán này có mấy phương án gài bẫy lắt léo lắm. Hít một hơi thật sâu, nghía lại lý thuyết một tẹo rồi tụi mình cùng làm lại nhé, tớ luôn đồng hành cùng bạn mà!",
                mood: 'empathetic',
                progression: ['thoughtful', 'empathetic']
            },
            {
                text: "Vấp ngã ở bài trắc nghiệm là chuyện bình thường như cơm bữa thôi nè. Quan trọng là mình nhận diện được các phương án mồi của người ra đề. Thư giãn một nhịp rồi thử lại cùng Nori nhé!",
                mood: 'empathetic',
                progression: ['puzzled', 'empathetic']
            }
        ]
    };

    class NoriDialogueBag {
        constructor() {
            this._usedKeys = this._loadUsedKeys();
        }

        _loadUsedKeys() {
            try {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        }

        _saveUsedKeys() {
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this._usedKeys));
            } catch (e) {}
        }

        getDialogue(caseKey) {
            let pool = DIALOGUE_BANK[caseKey];
            if (!pool || pool.length === 0) {
                pool = DIALOGUE_BANK['STANDARD_FAIL'];
                caseKey = 'STANDARD_FAIL';
            }

            if (!this._usedKeys[caseKey]) {
                this._usedKeys[caseKey] = [];
            }

            const used = this._usedKeys[caseKey];
            const availableIndices = [];
            for (let i = 0; i < pool.length; i++) {
                if (!used.includes(i)) {
                    availableIndices.push(i);
                }
            }

            let chosenIndex;
            if (availableIndices.length === 0) {
                // Shuffle bag exhausted, reset for this key
                this._usedKeys[caseKey] = [];
                chosenIndex = Math.floor(Math.random() * pool.length);
                this._usedKeys[caseKey].push(chosenIndex);
            } else {
                chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                this._usedKeys[caseKey].push(chosenIndex);
            }

            this._saveUsedKeys();
            return pool[chosenIndex];
        }

        resetBag() {
            this._usedKeys = {};
            try {
                sessionStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
        }
    }

    global.NoriDialogueBag = new NoriDialogueBag();
})(typeof window !== 'undefined' ? window : this);
