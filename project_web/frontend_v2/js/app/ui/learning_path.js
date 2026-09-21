let _realLessonsMap = {};
let _realCourseDataPromise = null;

function fetchRealCourseMetadata() {
    if (Object.keys(_realLessonsMap).length > 0) {
        return Promise.resolve(_realLessonsMap);
    }
    if (_realCourseDataPromise) {
        return _realCourseDataPromise;
    }
    const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
    _realCourseDataPromise = fetch(`${API}/api/course/all?lang=vi`)
        .then(res => res.json())
        .then(data => {
            if (data && data.success && Array.isArray(data.results)) {
                data.results.forEach(row => {
                    const mapped = {
                        title: row.lesson_title,
                        sectionTitle: row.section_title,
                        topicTitle: row.topic_title,
                        topicId: row.topic_id,
                        sectionId: row.section_id,
                        lessonNum: row.lesson_num
                    };
                    _realLessonsMap['l' + row.lesson_num] = mapped;
                    _realLessonsMap['lesson_' + row.lesson_num] = mapped;
                    _realLessonsMap[String(row.lesson_num)] = mapped;
                    if (row.topic_id) {
                        _realLessonsMap[row.topic_id + '_l' + row.lesson_num] = mapped;
                        _realLessonsMap[row.topic_id + '_' + row.lesson_num] = mapped;
                    }
                });
                window._realLessonsMap = _realLessonsMap;
            }
            return _realLessonsMap;
        })
        .catch(err => {
            console.warn("Could not load real course metadata:", err);
            return _realLessonsMap;
        });
    return _realCourseDataPromise;
}
window.fetchRealCourseMetadata = fetchRealCourseMetadata;

function initLearningPathModule() {
    if (!document.getElementById('vertical-timeline-container') && !document.getElementById('lp-empty-state')) {
        return;
    }
    if (window.location && (window.location.hash === '#learning-path' || window.location.hash === '#tab-learning-path')) {
        if (typeof window.switchTab === 'function') {
            window.switchTab('learning-path', 'Lộ trình Học tập');
        } else if (typeof switchTab === 'function') {
            switchTab('learning-path', 'Lộ trình Học tập');
        }
    }
    fetchRealCourseMetadata().finally(() => {
        fetchAndRenderPaths();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLearningPathModule);
} else {
    initLearningPathModule();
}

function getLessonData(id) {
    if (!id) return { title: "Bài học", sectionTitle: "Kiến thức chuẩn bị", topicTitle: "Đại số tuyến tính", topicId: "t1" };
    const cleanId = String(id).trim();
    if (_realLessonsMap[cleanId]) {
        return _realLessonsMap[cleanId];
    }
    const numMatch = cleanId.match(/\d+/);
    if (numMatch) {
        const num = numMatch[0];
        if (_realLessonsMap['l' + num]) return _realLessonsMap['l' + num];
        if (_realLessonsMap[num]) return _realLessonsMap[num];
    }
    if (typeof MOCK_LIBRARY_DATA !== 'undefined' && MOCK_LIBRARY_DATA.topics) {
        let queryId = cleanId.startsWith('lesson_') ? cleanId.replace('lesson_', 'l') : cleanId;
        for (let topic of MOCK_LIBRARY_DATA.topics) {
            for (let sec of topic.sections) {
                for (let less of sec.lessons) {
                    if (less.id === queryId) return { title: less.title, sectionTitle: sec.title, topicTitle: topic.title, topicId: topic.id };
                }
            }
        }
    }
    return { title: "Bài học " + cleanId, sectionTitle: "Không rõ", topicTitle: "Không rõ", topicId: "t1" };
}

function getAuthToken() {
    if (window.AuthGuard && window.AuthGuard.getToken) {
        return window.AuthGuard.getToken();
    }
    return sessionStorage.getItem('user_token') || localStorage.getItem('user_token');
}

function getUserId() {
    var token = getAuthToken();
    if (token) {
        if (window.AuthGuard && window.AuthGuard._decodeJWT) {
            var p = window.AuthGuard._decodeJWT(token);
            if (p && p.user_id) return p.user_id;
        }
        try {
            var parts = token.split('.');
            if (parts.length === 3) {
                var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                var dec = JSON.parse(atob(payload));
                if (dec && dec.user_id) return dec.user_id;
            }
        } catch(e) {}
    }
    return localStorage.getItem('user_id') || sessionStorage.getItem('user_id') || null;
}

// ==========================================
// VECTORIA MATH PERSONA & TIMELINE ENGINE
// ==========================================

function getLatestMentorSession() {
    try {
        const raw = sessionStorage.getItem('latest_mentor_session');
        if (!raw) return null;
        const data = JSON.parse(raw);
        const speechObj = data.mentor_speech || {};
        const speechText = speechObj.text || data.mentor_feedback || speechObj.mentor_speech || data.message || '';
        if (!speechText) return null;
        
        const quizSummary = data.quiz_summary || {};
        const telemetry = data.telemetry || {};
        const itemsSummary = data.items_summary || [];

        return {
            quizId: data.quiz_id || '',
            quizTitle: data.quiz_title || 'Bài kiểm tra',
            userName: data.user_name || '',
            score: quizSummary.total_score !== undefined ? quizSummary.total_score : (data.score !== undefined ? data.score : (data.total_score !== undefined ? data.total_score : null)),
            correctCount: quizSummary.correct_count !== undefined ? quizSummary.correct_count : (data.correct_count || 0),
            totalQuestions: quizSummary.total_questions !== undefined ? quizSummary.total_questions : (data.total_questions || 5),
            passed: quizSummary.passed !== undefined ? quizSummary.passed : data.passed,
            speechText: speechText,
            emotionState: speechObj.emotion_state || data.tone_emotion || 'ANALYTICAL_NEUTRAL',
            avatarMood: speechObj.avatar_mood || data.mentor_avatar_mood || 'thoughtful',
            emotionProgression: speechObj.emotion_progression || data.mentor_speech?.emotion_progression || data.emotion_progression || [speechObj.avatar_mood || 'thoughtful'],
            summaryReason: speechObj.summary_reason || data.core_gap || data.summary_reason || '',
            suggestedAction: speechObj.suggested_action || data.actionable_direction || data.suggested_action || '',
            pacingAlert: data.pacing_alert || '',
            llmStatus: data.llm_status || (data.source === 'deterministic' ? 'pending' : 'completed'),
            telemetry: telemetry,
            itemsSummary: itemsSummary,
            timestamp: data.timestamp || Date.now()
        };
    } catch (e) {
        console.error("Error reading mentor session:", e);
        return null;
    }
}

let _mentorPollTimer = null;
let _typewriterTimer = null;
let _currentFullSpeech = '';

window.dismissMentorDialogue = function() {
    stopMentorTypewriter();
    if (_mentorPollTimer) {
        clearInterval(_mentorPollTimer);
        _mentorPollTimer = null;
    }
    sessionStorage.removeItem('latest_mentor_session');
    const card = document.getElementById('timeline-mentor-card');
    if (card) {
        card.style.transition = 'opacity 0.2s ease, max-height 0.2s ease';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 200);
    }
};

function getMoodColorAndLabel(mood) {
    let col = 'var(--primary-base, #3e63dd)';
    let bg = 'rgba(62, 99, 221, 0.08)';
    let label = 'Cùng suy ngẫm';

    const moodStr = String(mood || 'thoughtful').trim().toLowerCase();
    let base = moodStr;
    let lvl = 2;
    if (moodStr.includes('_')) {
        const parts = moodStr.split('_');
        base = parts[0];
        lvl = parseInt(parts[1], 10) || 2;
    } else if (moodStr === 'rage') {
        base = 'stern';
        lvl = 3;
    } else if (moodStr === 'annoyed') {
        base = 'stern';
        lvl = 2;
    } else if (moodStr === 'ecstatic') {
        base = 'proud';
        lvl = 2;
    } else if (moodStr === 'celebratory_proud') {
        base = 'proud';
        lvl = 3;
    }

    if (base === 'shocked') {
        col = 'var(--danger-base, #e5484d)';
        bg = 'rgba(229, 72, 77, 0.08)';
        label = lvl >= 3 ? 'Bất ngờ' : (lvl === 1 ? 'Tiến độ nhanh' : 'Bất ngờ');
    } else if (base === 'wink') {
        col = '#8b5cf6';
        bg = 'rgba(139, 92, 246, 0.08)';
        label = lvl >= 3 ? 'Khích lệ' : (lvl === 1 ? 'Khích lệ' : 'Tích cực');
    } else if (base === 'puzzled') {
        col = '#d97706';
        bg = 'rgba(217, 119, 6, 0.08)';
        label = lvl >= 3 ? 'Cần xem lại' : (lvl === 1 ? 'Lưu ý' : 'Cần xem lại');
    } else if (base === 'stern') {
        col = 'var(--danger-base, #e5484d)';
        bg = 'rgba(229, 72, 77, 0.08)';
        label = lvl >= 3 ? 'Cảnh báo' : (lvl === 1 ? 'Lưu ý' : 'Cần lưu ý');
    } else if (base === 'proud') {
        col = 'var(--success-base, #30a46c)';
        bg = 'rgba(48, 164, 108, 0.08)';
        label = lvl >= 3 ? 'Xuất sắc' : (lvl === 1 ? 'Đạt' : 'Rất tốt');
    } else if (base === 'relieved') {
        col = '#0284c7';
        bg = 'rgba(2, 132, 199, 0.08)';
        label = lvl >= 3 ? 'Hoàn thành' : (lvl === 1 ? 'Ổn định' : 'Hoàn thành');
    } else if (base === 'empathetic') {
        col = 'var(--primary-base, #3e63dd)';
        bg = 'rgba(62, 99, 221, 0.08)';
        label = lvl >= 3 ? 'Hỗ trợ' : (lvl === 1 ? 'Gợi ý' : 'Hỗ trợ');
    } else {
        // thoughtful
        col = 'var(--primary-base, #3e63dd)';
        bg = 'rgba(62, 99, 221, 0.08)';
        label = lvl >= 3 ? 'Đang phân tích' : (lvl === 1 ? 'Lưu ý' : 'Đang phân tích');
    }
    return { col, bg, label };
}


function ensureNoriV6Styles() {
    if (document.getElementById('nori-v6-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'nori-v6-styles';
    styleEl.textContent = `/* === NORI v6 LIVING IDLE & MICRO-ANIMATIONS (TLOU2 ARCHITECTURE) === */

/* 1. Base Living Breathing Loop */
@keyframes noriBreathe {
    0%, 100% { transform: translateY(0px) scale(1, 1); }
    50% { transform: translateY(-1.5px) scale(1.02, 0.98); }
}

/* 2. Secondary Body Physics Actions */
@keyframes noriJoyBounce {
    0% { transform: translateY(0) scale(1, 1); }
    15% { transform: translateY(3px) scale(1.08, 0.92); }
    35% { transform: translateY(-18px) scale(0.92, 1.12); }
    55% { transform: translateY(0) scale(1.05, 0.95); }
    70% { transform: translateY(-8px) scale(0.96, 1.05); }
    85% { transform: translateY(0) scale(1.02, 0.98); }
    100% { transform: translateY(0) scale(1, 1); }
}

@keyframes noriRageRumble {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    10% { transform: translate(-2px, -1px) rotate(-1.5deg); }
    25% { transform: translate(2px, 1px) rotate(1.5deg); }
    40% { transform: translate(-2px, 1px) rotate(-1deg); }
    55% { transform: translate(2px, -1px) rotate(1deg); }
    70% { transform: translate(-1.5px, 0.5px) rotate(-0.8deg); }
    85% { transform: translate(1.5px, -0.5px) rotate(0.8deg); }
}

@keyframes noriMeltDown {
    0% { transform: scale(0.92, 1.14) translateY(-8px); }
    30% { transform: scale(1.08, 0.94) translateY(3px); }
    55% { transform: scale(0.98, 1.02) translateY(-1px); }
    75% { transform: scale(1.03, 0.97) translateY(1px); }
    100% { transform: scale(1, 1) translateY(0); }
}

@keyframes noriMochiBreathe {
    0%, 100% { transform: translateY(0px) scale(1, 1); }
    50% { transform: translateY(1.2px) scale(1.03, 0.97); }
}

@keyframes noriSpringRebound {
    0% { transform: scale(1, 1) translateY(0); }
    35% { transform: scale(0.9, 1.18) translateY(-12px); }
    65% { transform: scale(1.06, 0.96) translateY(3px); }
    85% { transform: scale(0.98, 1.02) translateY(-1px); }
    100% { transform: scale(1, 1) translateY(0); }
}

#nori-actor.actor-breathe {
    animation: noriBreathe 3.8s infinite ease-in-out;
    transform-origin: 50px 70px;
}
#nori-actor.actor-peekaboo {
    animation: noriPeekabooCheer 1.8s infinite ease-in-out;
    transform-origin: 50px 80px;
}
@keyframes noriPeekabooCheer {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-8px, 2px) rotate(-6deg) scale(0.96, 1.04); }
    55% { transform: translate(10px, -6px) rotate(8deg) scale(1.06, 0.95); }
    75% { transform: translate(6px, -3px) rotate(6deg) scale(1.02, 0.98); }
}
#nori-actor.actor-joy {
    animation: noriJoyBounce 0.95s cubic-bezier(0.28, 0.84, 0.42, 1);
    transform-origin: 50px 90px;
}
#nori-actor.actor-rumble {
    animation: noriRageRumble 0.35s infinite linear;
    transform-origin: 50px 60px;
}
#nori-actor.actor-melt {
    animation: noriPeacefulBreathe 3.6s infinite ease-in-out;
    transform-origin: 50px 75px;
}

@keyframes noriPeacefulBreathe {
    0%, 100% { transform: translateY(0px) scale(1, 1); }
    50% { transform: translateY(1.5px) scale(1.02, 0.98); }
}

@keyframes noriSteamPuffKey {
    0%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }
    50% { transform: translateY(-4px) scale(1.15); opacity: 0.9; }
}
.nori-steam-puff-left, .nori-steam-puff-right {
    animation: noriSteamPuffKey 0.9s infinite ease-in-out;
}
#nori-actor.actor-rebound {
    animation: noriSpringRebound 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    transform-origin: 50px 85px;
}

/* 3. Micro Saccades & Blinks (Organic Eyes) */
@keyframes eyeBlink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.08); }
}
@keyframes eyeDoubleBlink {
    0%, 82%, 92%, 100% { transform: scaleY(1); }
    86% { transform: scaleY(0.08); }
    96% { transform: scaleY(0.08); }
}
.companion-eyes.eye-blink {
    animation: eyeBlink 0.28s ease-in-out;
    transform-origin: 50px 48px;
}
.companion-eyes.eye-double-blink {
    animation: eyeDoubleBlink 0.48s ease-in-out;
    transform-origin: 50px 48px;
}
.companion-eyes.eye-saccade-left {
    transform: translate(-1.8px, 0.3px) !important;
    transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1);
}
.companion-eyes.eye-saccade-down {
    transform: translate(0px, 1.8px) !important;
    transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}
.companion-eyes.eye-saccade-center {
    transform: translate(0px, 0px) !important;
    transition: transform 0.22s cubic-bezier(0.25, 1, 0.5, 1);
}

/* 4. Ear Twitches (Rodent Reflexes) */
@keyframes earTwitchLeftKey {
    0%, 100% { transform: rotate(-10deg); }
    30% { transform: rotate(-24deg) scale(1.06); }
    60% { transform: rotate(-6deg); }
    80% { transform: rotate(-16deg); }
}
@keyframes earTwitchRightKey {
    0%, 100% { transform: rotate(10deg); }
    30% { transform: rotate(24deg) scale(1.06); }
    60% { transform: rotate(6deg); }
    80% { transform: rotate(16deg); }
}
.companion-ear-left.ear-twitch {
    animation: earTwitchLeftKey 0.35s ease-out;
    transform-origin: 25px 23px;
}
.companion-ear-right.ear-twitch {
    animation: earTwitchRightKey 0.35s ease-out;
    transform-origin: 75px 23px;
}

/* 5. TLOU2 Living Idle Fidgets (Post-Dialogue Waiting Behaviors) */
/* Fidget 1: Grooming (Xoa má & Gãi mũi hạt tiêu) */
@keyframes noriFidgetGroomingKey {
    0%, 100% { transform: translate(0, 0); }
    22% { transform: translate(3px, -8px) rotate(-14deg); }
    40% { transform: translate(1.5px, -6px) rotate(-8deg); }
    60% { transform: translate(3.5px, -8px) rotate(-14deg); }
    80% { transform: translate(1px, -3px) rotate(-4deg); }
}
.companion-paws.fidget-grooming {
    animation: noriFidgetGroomingKey 1.3s cubic-bezier(0.34, 1.2, 0.64, 1);
    transform-origin: 50px 65px;
}

/* Fidget 2: Curious Peer (Nghiêng đầu ngóng bài làm) */
@keyframes noriFidgetPeerKey {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    20%, 80% { transform: translate(1.5px, 2px) rotate(6deg); }
}
#nori-actor.fidget-peer {
    animation: noriFidgetPeerKey 1.7s cubic-bezier(0.34, 1.3, 0.64, 1);
    transform-origin: 50px 75px;
}

/* Fidget 3: Patient Paw Tap (Hai tay chập nhẹ vào nhau ngóng đợi) */
@keyframes noriFidgetPawTapKey {
    0%, 100% { transform: scale(1, 1); }
    25%, 75% { transform: scale(1.16, 0.9); }
    50% { transform: scale(0.94, 1.06); }
}
.companion-paws.fidget-pawtap {
    animation: noriFidgetPawTapKey 1.1s ease-in-out;
    transform-origin: 50px 65px;
}

/* Fidget 4: Patient Sigh & Relax (Thở dài êm ái & Thả lỏng vai) */
@keyframes noriFidgetSighKey {
    0%, 100% { transform: translateY(0) scale(1, 1); }
    30% { transform: translateY(-2px) scale(1.03, 0.97); }
    65% { transform: translateY(2px) scale(0.97, 1.02); }
}
#nori-actor.fidget-sigh {
    animation: noriFidgetSighKey 1.9s cubic-bezier(0.37, 0, 0.63, 1);
    transform-origin: 50px 70px;
}

/* Fidget 5: Weight Shift & Body Sway (Đổi trọng tâm chân & Lắc lư nhẹ) */
@keyframes noriFidgetSwayKey {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    35% { transform: translate(-2px, 0.6px) rotate(-2deg); }
    70% { transform: translate(2px, 0.6px) rotate(2deg); }
}
#nori-actor.fidget-sway {
    animation: noriFidgetSwayKey 1.8s ease-in-out;
    transform-origin: 50px 85px;
}

/* 6. Distinctive State Micro-Animations */
@keyframes spiralSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.nori-micro-spiral-left {
    animation: spiralSpin 3.2s linear infinite;
    transform-origin: 39px 49px;
}
.nori-micro-spiral-right {
    animation: spiralSpin 3.2s linear infinite;
    transform-origin: 61px 49px;
}

@keyframes mouthTremble {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-0.9px); }
    75% { transform: translateX(0.9px); }
}
.nori-micro-tremble {
    animation: mouthTremble 0.22s infinite ease-in-out;
    transform-origin: 50px 58px;
}

@keyframes veinThrob {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.22); }
}
.nori-micro-vein {
    animation: veinThrob 0.42s infinite cubic-bezier(0.36, 0, 0.66, -0.56);
    transform-origin: 68px 30px;
}

@keyframes starTwinkle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.32) rotate(24deg); }
}
.nori-micro-star-left {
    animation: starTwinkle 1.4s infinite ease-in-out;
    transform-origin: 39px 48px;
}
.nori-micro-star-right {
    animation: starTwinkle 1.4s infinite ease-in-out 0.25s;
    transform-origin: 61px 48px;
}

@keyframes fistPumpCheer {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3.6px); }
}
.nori-micro-fistpump {
    animation: fistPumpCheer 0.75s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes questionFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px) rotate(4deg); }
}
.nori-micro-float {
    animation: questionFloat 2.0s infinite ease-in-out;
    transform-origin: 78px 24px;
}

@keyframes pawScratchChin {
    0%, 100% { transform: translate(0, 0); }
    30% { transform: translate(1px, -1.8px); }
    70% { transform: translate(-0.8px, -1px); }
}
.nori-micro-scratch {
    animation: pawScratchChin 0.9s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes fingerTapThought {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-1.8px); }
}
.nori-micro-fingertap {
    animation: fingerTapThought 0.7s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes sweatSlide {
    0% { transform: translateY(-2px); opacity: 0; }
    20% { opacity: 0.85; }
    80% { opacity: 0.85; }
    100% { transform: translateY(6px); opacity: 0; }
}
.nori-micro-sweat {
    animation: sweatSlide 1.8s infinite ease-in;
    transform-origin: 75px 38px;
}

@keyframes proudNod {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40% { transform: translateY(2px) rotate(1.5deg); }
}
.nori-micro-nod {
    animation: proudNod 1.8s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes chestPuff {
    0%, 100% { transform: scale(1, 1); }
    50% { transform: scale(1.04, 1.02); }
}
.nori-micro-chestpuff {
    animation: chestPuff 2.2s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes startlePop {
    0%, 100% { transform: translateY(0); }
    30% { transform: translateY(-3.5px) scale(0.96, 1.04); }
}
.nori-micro-startle {
    animation: startlePop 1.6s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes recoilJolt {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(0, 2px) scale(1.03, 0.96); }
    50% { transform: translate(0, -2px) scale(0.97, 1.03); }
}
.nori-micro-recoil {
    animation: recoilJolt 1.5s infinite ease-in-out;
    transform-origin: 50px 60px;
}

@keyframes darkShadeFlicker {
    0%, 100% { opacity: 0.65; }
    50% { opacity: 0.95; }
}
.nori-micro-darkshade {
    animation: darkShadeFlicker 0.8s infinite ease-in-out;
}

@keyframes gentleComfortTilt {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(3.2deg); }
}
.nori-micro-comforthover {
    animation: gentleComfortTilt 2.8s infinite ease-in-out;
    transform-origin: 50px 70px;
}

@keyframes comfortPat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
}
.nori-micro-comfortpat {
    animation: comfortPat 1.2s infinite ease-in-out;
    transform-origin: 50px 65px;
}

@keyframes tearShimmer {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.35); opacity: 1; }
}
.nori-micro-tear-left {
    animation: tearShimmer 1.5s infinite ease-in-out;
    transform-origin: 43px 52px;
}
.nori-micro-tear-right {
    animation: tearShimmer 1.5s infinite ease-in-out 0.4s;
    transform-origin: 57px 52px;
}

@keyframes shoulderDrop {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(1.4px); }
}
.nori-micro-shoulder {
    animation: shoulderDrop 2.6s infinite ease-in-out;
    transform-origin: 50px 70px;
}

@keyframes pawWaveCheer {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-14deg); }
    75% { transform: rotate(14deg); }
}
.nori-micro-wave {
    animation: pawWaveCheer 0.85s infinite ease-in-out;
    transform-origin: 74px 48px;
}

@keyframes winkStarPulse {
    0%, 100% { transform: scale(0.8); opacity: 0.6; }
    50% { transform: scale(1.35); opacity: 1; }
}
.nori-micro-winkstar {
    animation: winkStarPulse 1.1s infinite ease-in-out;
    transform-origin: 39px 44px;
}

@keyframes cheerBob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px) scale(1.02, 0.98); }
}
.nori-micro-bob {
    animation: cheerBob 0.8s infinite ease-in-out;
    transform-origin: 50px 70px;
}

@keyframes mathWaveBar {
    0%, 100% { transform: scaleY(0.4); }
    50% { transform: scaleY(1.3); }
}

@media (prefers-reduced-motion: reduce) {
    #nori-actor, .companion-eyes, .companion-ear-left, .companion-ear-right, .companion-paws,
    .nori-micro-spiral-left, .nori-micro-spiral-right, .nori-micro-vein, .nori-micro-star-left,
    .nori-micro-star-right, .nori-micro-fistpump, .nori-micro-float, .nori-micro-scratch,
    .nori-micro-fingertap, .nori-micro-sweat, .nori-micro-nod, .nori-micro-chestpuff,
    .nori-micro-startle, .nori-micro-recoil, .nori-micro-darkshade, .nori-micro-comforthover,
    .nori-micro-comfortpat, .nori-micro-tear-left, .nori-micro-tear-right, .nori-micro-shoulder,
    .nori-micro-wave, .nori-micro-winkstar, .nori-micro-bob, .nori-micro-tremble {
        animation: none !important;
        transition: none !important;
    }
}`;
    document.head.appendChild(styleEl);
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureNoriV6Styles);
    } else {
        ensureNoriV6Styles();
    }
}

// ============================================================================
// NORI LIVING IDLE ENGINE v8 (TLOU2 IDLE WITH CASCADING EMOTIONAL DECAY)
// ============================================================================
class NoriLivingIdleEngine {
    constructor(mountSelector = '#hero-avatar-mount', onStatusChange = null, onDecayRequest = null) {
        this.mountSelector = mountSelector;
        this.onStatusChange = onStatusChange;
        this.onDecayRequest = onDecayRequest;
        this.isTalking = false;
        this.currentMood = 'neutral_2';
        this.currentFidget = null;
        this.saccadeTimer = null;
        this.earTimer = null;
        this.fidgetTimer = null;
        this.decayTimers = [];
        this.countdownTimer = null;
        this.secondsUntilFidget = 6;
        this.isRunning = false;

        this.fidgetRegistry = [
            { id: 'grooming', name: 'Xoa má & Gãi mũi hạt tiêu', duration: 1300, target: 'paws' },
            { id: 'peer', name: 'Nghiêng đầu ngóng bài làm', duration: 1700, target: 'actor' },
            { id: 'pawtap', name: 'Hai tay vỗ nhẹ ngóng đợi', duration: 1100, target: 'paws' },
            { id: 'sigh', name: 'Thở dài êm ái & Thư giãn vai', duration: 1900, target: 'actor' },
            { id: 'sway', name: 'Đổi trọng tâm chân & Lắc lư', duration: 1800, target: 'actor' }
        ];
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.scheduleNextSaccade();
        this.scheduleNextEarTwitch();
        this.startFidgetCountdown();
        this.updateStatus('Đang thở sinh học tự nhiên (Neutral Baseline)');
    }

    stop() {
        this.isRunning = false;
        if (this.saccadeTimer) clearTimeout(this.saccadeTimer);
        if (this.earTimer) clearTimeout(this.earTimer);
        if (this.fidgetTimer) clearTimeout(this.fidgetTimer);
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.clearDecayTimers();
        this.clearActiveFidgets();
    }

    clearDecayTimers() {
        if (Array.isArray(this.decayTimers)) {
            this.decayTimers.forEach(t => clearTimeout(t));
        }
        this.decayTimers = [];
    }

    setTalking(talking, mood = '') {
        this.isTalking = !!talking;
        if (mood) this.currentMood = mood;

        if (this.isTalking) {
            this.clearDecayTimers();
            this.clearActiveFidgets();
            this.updateStatus('Đang hội thoại cùng học viên');
        } else {
            // Speech ended: Trigger Cascading Emotional Decay step-down!
            this.triggerCascadingDecay();
        }
    }

    // CASCADING EMOTIONAL DECAY: Level 3 -> Level 2 -> Level 1 -> Neutral
    triggerCascadingDecay() {
        this.clearDecayTimers();
        
        const moodStr = String(this.currentMood || 'neutral_2').trim().toLowerCase();
        let baseMood = 'neutral';
        let intensity = 2;

        if (moodStr.includes('_')) {
            const parts = moodStr.split('_');
            baseMood = parts[0];
            intensity = parseInt(parts[1], 10) || 2;
        } else if (moodStr === 'rage') {
            baseMood = 'stern';
            intensity = 3;
        } else if (moodStr === 'neutral') {
            baseMood = 'neutral';
            intensity = 2;
        } else {
            baseMood = moodStr;
            intensity = 2;
        }

        // If already neutral, just reset fidget countdown
        if (baseMood === 'neutral') {
            this.secondsUntilFidget = Math.floor(Math.random() * 3) + 5;
            this.updateStatus('Dứt lời thoại, sẵn sàng lắng nghe (Neutral)');
            return;
        }

        // Special case: Deep Peaceful Relief (relieved_3) -> Relieved 2 -> Neutral
        if (baseMood === 'relieved' && intensity >= 3) {
            this.updateStatus('Giữ trạng thái thư thái ngủ say...');
            const t1 = setTimeout(() => {
                if (this.isTalking) return;
                this.applyDecayStep('relieved_2', 'Thở phào nhẹ nhõm bước 2 (Cấp 2)');
                const t2 = setTimeout(() => {
                    if (this.isTalking) return;
                    this.applyDecayStep('neutral_2', 'Cơ mặt dãn về Neutral tự nhiên');
                    this.secondsUntilFidget = Math.floor(Math.random() * 3) + 5;
                }, 800);
                this.decayTimers.push(t2);
            }, 1200);
            this.decayTimers.push(t1);
            return;
        }

        // General Cascading Step-down:
        if (intensity === 3) {
            // Level 3: Hold peak 1.2s -> Step down to Level 2 (0.8s) -> Level 1 (0.6s) -> Neutral
            this.updateStatus(`Giữ cảm xúc đỉnh điểm Cấp 3 (${baseMood}_3)...`);
            const t1 = setTimeout(() => {
                if (this.isTalking) return;
                this.applyDecayStep(`${baseMood}_2`, `Hạ nhiệt cảm xúc bước 1 (Cấp 2)`);
                
                const t2 = setTimeout(() => {
                    if (this.isTalking) return;
                    this.applyDecayStep(`${baseMood}_1`, `Lắng đọng cảm xúc bước 2 (Cấp 1)`);

                    const t3 = setTimeout(() => {
                        if (this.isTalking) return;
                        this.applyDecayStep('neutral_2', 'Cơ mặt dãn về Neutral tự nhiên');
                        this.secondsUntilFidget = Math.floor(Math.random() * 3) + 5;
                    }, 650);
                    this.decayTimers.push(t3);
                }, 850);
                this.decayTimers.push(t2);
            }, 1200);
            this.decayTimers.push(t1);
        } else if (intensity === 2) {
            // Level 2: Hold 1.2s -> Step down to Level 1 (0.7s) -> Neutral
            this.updateStatus(`Giữ cảm xúc Cấp 2 (${baseMood}_2)...`);
            const t1 = setTimeout(() => {
                if (this.isTalking) return;
                this.applyDecayStep(`${baseMood}_1`, `Hạ nhiệt cảm xúc bước 1 (Cấp 1)`);

                const t2 = setTimeout(() => {
                    if (this.isTalking) return;
                    this.applyDecayStep('neutral_2', 'Cơ mặt dãn về Neutral tự nhiên');
                    this.secondsUntilFidget = Math.floor(Math.random() * 3) + 5;
                }, 750);
                this.decayTimers.push(t2);
            }, 1200);
            this.decayTimers.push(t1);
        } else {
            // Level 1: Hold 1.2s -> Neutral
            this.updateStatus(`Giữ cảm xúc Cấp 1 (${baseMood}_1)...`);
            const t1 = setTimeout(() => {
                if (this.isTalking) return;
                this.applyDecayStep('neutral_2', 'Cơ mặt dãn về Neutral tự nhiên');
                this.secondsUntilFidget = Math.floor(Math.random() * 3) + 5;
            }, 1200);
            this.decayTimers.push(t1);
        }
    }

    applyDecayStep(moodKey, statusText) {
        this.currentMood = moodKey;
        if (typeof this.onDecayRequest === 'function') {
            this.onDecayRequest(moodKey);
        }
        this.updateStatus(statusText);
    }

    updateStatus(statusText) {
        if (typeof this.onStatusChange === 'function') {
            this.onStatusChange({
                status: statusText,
                currentFidget: this.currentFidget,
                secondsUntilFidget: this.secondsUntilFidget,
                isTalking: this.isTalking,
                currentMood: this.currentMood
            });
        }
    }

    getActor() {
        const mount = document.querySelector(this.mountSelector);
        if (!mount) return null;
        return mount.querySelector('#nori-actor');
    }

    getEyes() {
        const mount = document.querySelector(this.mountSelector);
        if (!mount) return null;
        return mount.querySelector('.companion-eyes');
    }

    getLeftEar() {
        const mount = document.querySelector(this.mountSelector);
        if (!mount) return null;
        return mount.querySelector('.companion-ear-left');
    }

    getRightEar() {
        const mount = document.querySelector(this.mountSelector);
        if (!mount) return null;
        return mount.querySelector('.companion-ear-right');
    }

    getPaws() {
        const mount = document.querySelector(this.mountSelector);
        if (!mount) return null;
        return mount.querySelector('.companion-paws');
    }

    scheduleNextSaccade() {
        if (!this.isRunning) return;
        const delay = Math.floor(Math.random() * 1800) + 2400;
        this.saccadeTimer = setTimeout(() => {
            if (!this.isTalking) {
                this.performRandomEyeAction();
            }
            this.scheduleNextSaccade();
        }, delay);
    }

    performRandomEyeAction() {
        const eyes = this.getEyes();
        if (!eyes) return;

        const rand = Math.random();
        if (rand < 0.35) {
            const isDouble = Math.random() < 0.35;
            eyes.classList.add(isDouble ? 'eye-double-blink' : 'eye-blink');
            setTimeout(() => {
                eyes.classList.remove('eye-blink', 'eye-double-blink');
            }, isDouble ? 500 : 300);
        } else if (rand < 0.65) {
            eyes.classList.remove('eye-saccade-center', 'eye-saccade-down');
            eyes.classList.add('eye-saccade-left');
            this.updateStatus('Đảo mắt quan sát không gian');
            setTimeout(() => {
                eyes.classList.remove('eye-saccade-left');
                eyes.classList.add('eye-saccade-center');
                this.updateStatus('Mắt quay về nhìn học viên');
            }, 900);
        } else {
            eyes.classList.remove('eye-saccade-center', 'eye-saccade-left');
            eyes.classList.add('eye-saccade-down');
            this.updateStatus('Mắt nhìn xuống bài tập của bạn');
            setTimeout(() => {
                eyes.classList.remove('eye-saccade-down');
                eyes.classList.add('eye-saccade-center');
                this.updateStatus('Mắt ngước nhìn học viên');
            }, 1100);
        }
    }

    scheduleNextEarTwitch() {
        if (!this.isRunning) return;
        const delay = Math.floor(Math.random() * 2500) + 3800;
        this.earTimer = setTimeout(() => {
            if (!this.isTalking) {
                this.performEarTwitch();
            }
            this.scheduleNextEarTwitch();
        }, delay);
    }

    performEarTwitch() {
        const leftEar = this.getLeftEar();
        const rightEar = this.getRightEar();
        if (!leftEar && !rightEar) return;

        const pickLeft = Math.random() < 0.5;
        const ear = pickLeft ? (leftEar || rightEar) : (rightEar || leftEar);
        if (ear) {
            ear.classList.add('ear-twitch');
            this.updateStatus(pickLeft ? 'Giật tai trái lắng nghe' : 'Giật tai phải lắng nghe');
            setTimeout(() => {
                ear.classList.remove('ear-twitch');
            }, 380);
        }
    }

    startFidgetCountdown() {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = setInterval(() => {
            if (!this.isRunning) return;
            if (this.isTalking || this.currentFidget) {
                this.updateStatus(this.isTalking ? 'Đang hội thoại cùng học viên' : `Đang thực hiện: ${this.currentFidget.name}`);
                return;
            }

            if (!String(this.currentMood).startsWith('neutral')) {
                return;
            }

            this.secondsUntilFidget--;
            if (this.secondsUntilFidget <= 0) {
                this.triggerRandomFidget();
                this.secondsUntilFidget = Math.floor(Math.random() * 3) + 6;
            } else {
                this.updateStatus(`Living Idle (Động tác thừa sau ${this.secondsUntilFidget}s)`);
            }
        }, 1000);
    }

    triggerRandomFidget() {
        const randIdx = Math.floor(Math.random() * this.fidgetRegistry.length);
        const fidget = this.fidgetRegistry[randIdx];
        this.executeFidget(fidget.id);
    }

    executeFidget(fidgetId) {
        if (this.isTalking) return;
        const fidget = this.fidgetRegistry.find(f => f.id === fidgetId);
        if (!fidget) return;

        this.clearActiveFidgets();
        this.currentFidget = fidget;

        let targetEl = null;
        let className = `fidget-${fidget.id}`;

        if (fidget.target === 'paws') {
            targetEl = this.getPaws();
        } else {
            targetEl = this.getActor();
        }

        if (targetEl) {
            targetEl.classList.add(className);
            this.updateStatus(`Động tác thừa: ${fidget.name}`);

            this.fidgetTimer = setTimeout(() => {
                if (targetEl) targetEl.classList.remove(className);
                this.currentFidget = null;
                this.updateStatus('Đang thở sinh học tự nhiên (Neutral Baseline)');
            }, fidget.duration);
        }
    }

    clearActiveFidgets() {
        this.currentFidget = null;
        if (this.fidgetTimer) {
            clearTimeout(this.fidgetTimer);
            this.fidgetTimer = null;
        }
        const actor = this.getActor();
        if (actor) {
            actor.classList.remove('fidget-peer', 'fidget-sigh', 'fidget-sway');
        }
        const paws = this.getPaws();
        if (paws) {
            paws.classList.remove('fidget-grooming', 'fidget-pawtap');
        }
    }
}
window.NoriLivingIdleEngine = NoriLivingIdleEngine;

function renderMentorAvatarHTML(mood = 'neutral_2', isTalking = false, accentColor = '') {
    const moodMeta = getMoodColorAndLabel(mood);
    const col = accentColor || moodMeta.col;
    const uid = 'v' + Math.random().toString(36).substring(2, 7);

    const displayWave = isTalking ? 'flex' : 'none';

    // Parse base mood and intensity level (1, 2, 3)
    const moodStr = String(mood || 'neutral_2').trim().toLowerCase();
    let baseMood = 'neutral';
    let intensity = 2;

    if (moodStr.includes('_')) {
        const parts = moodStr.split('_');
        baseMood = parts[0];
        intensity = parseInt(parts[1], 10) || 2;
    } else if (moodStr === 'neutral') {
        baseMood = 'neutral';
        intensity = 2;
    } else if (moodStr === 'rage') {
        baseMood = 'stern';
        intensity = 3;
    } else if (moodStr === 'annoyed') {
        baseMood = 'stern';
        intensity = 2;
    } else if (moodStr === 'ecstatic') {
        baseMood = 'proud';
        intensity = 2;
    } else if (moodStr === 'celebratory_proud') {
        baseMood = 'proud';
        intensity = 3;
    } else if (['neutral', 'stern', 'puzzled', 'thoughtful', 'proud', 'shocked', 'empathetic', 'relieved', 'wink'].includes(moodStr)) {
        baseMood = moodStr;
        intensity = 2;
    }
    intensity = Math.max(1, Math.min(3, intensity));

    // Dynamic color shifts
    let cBody = '#f59e0b';
    let cShade = '#d97706';
    let cTummy = '#fefae0';
    let cInner = '#fecdd3';
    let cStroke = '#78350f';
    let cEye = '#292524';
    let cBlush = 'rgba(244, 63, 94, 0.42)';
    let cMouthBg = '#451a03';
    let cTongue = '#fb7185';

    const isRageL3 = (baseMood === 'stern' && intensity >= 3);

    if (isRageL3) {
        cBody = '#fb7185';
        cShade = '#f43f5e';
        cTummy = '#fff1f2';
        cInner = '#fecdd3';
        cStroke = '#881337';
        cEye = '#4c0519';
        cBlush = 'rgba(239, 68, 68, 0.7)';
        cMouthBg = '#4c0519';
    }

    let headRot = 0;
    let headTy = 0;
    let leftEarRot = 0;
    let rightEarRot = 0;
    let actorAnimClass = 'actor-breathe';

    // Stern 3 uses gentle breathing instead of violent earthquake rumble
    if (baseMood === 'stern' && intensity >= 3) {
        actorAnimClass = 'actor-breathe';
    } else if (baseMood === 'proud' && intensity >= 3) {
        actorAnimClass = 'actor-joy';
    } else if (baseMood === 'wink' && intensity >= 3) {
        actorAnimClass = 'actor-peekaboo';
    } else if (baseMood === 'relieved' && intensity >= 3) {
        actorAnimClass = 'actor-breathe';
    }

    let browsMarkup = '';
    let eyesMarkup = '';
    let mouthMarkup = '';
    let cheeksMarkup = `
        <ellipse cx="25" cy="56" rx="5.5" ry="3.2" fill="${cBlush}"/>
        <path d="M 23 54 L 21 58 M 26 54 L 24 58 M 29 54 L 27 58" stroke="#f43f5e" stroke-width="0.75" stroke-linecap="round" opacity="0.6"/>
        <ellipse cx="75" cy="56" rx="5.5" ry="3.2" fill="${cBlush}"/>
        <path d="M 73 54 L 71 58 M 76 54 L 74 58 M 79 54 L 77 58" stroke="#f43f5e" stroke-width="0.75" stroke-linecap="round" opacity="0.6"/>
    `;
    let pawsMarkup = '';
    let overlayMarkup = '';

    const headPath = `
        M 50 19
        C 72 19, 85 30, 85 47
        C 85 62, 79 74, 69 79
        C 59 84, 41 84, 31 79
        C 21 74, 15 62, 15 47
        C 15 30, 28 19, 50 19 Z
    `;
    const bellyPath = `
        M 50 43
        C 63 43, 73 51, 73 63
        C 73 74, 63 79, 50 79
        C 37 79, 27 74, 27 63
        C 27 51, 37 43, 50 43 Z
    `;

    // 0. NEUTRAL (Lắng nghe & Đồng hành Chân thành)
    if (baseMood === 'neutral') {
        if (intensity === 1) {
            browsMarkup = `
                <path d="M 34 41 Q 39 39 45 41.5" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                <path d="M 55 41.5 Q 61 39 66 41" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.0" ry="5.5" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.0" ry="5.5" fill="${cEye}"/>
                <circle cx="39.5" cy="47.2" r="1.6" fill="#ffffff"/>
                <circle cx="63.5" cy="47.2" r="1.6" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.48s" repeatCount="indefinite"
                            values="
                                M 46 60 Q 50 59 54 60 Q 54 63 50 63.2 Q 46 63 46 60 Z;
                                M 45 59 Q 50 58 55 59 Q 55 64.5 50 64.8 Q 45 64.5 45 59 Z;
                                M 46 60 Q 50 59 54 60 Q 54 63 50 63.2 Q 46 63 46 60 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="63" rx="2.0" ry="1.0" fill="${cTongue}"/>
                </g>
            ` : `<path d="M 46 60 Q 50 61.2 54 60" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
        } else if (intensity === 2) {
            browsMarkup = `
                <path d="M 34 40 Q 39 37.5 45 40.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
                <path d="M 55 40.5 Q 61 37.5 66 40" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.2" ry="5.8" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.2" ry="5.8" fill="${cEye}"/>
                <circle cx="39.5" cy="46.8" r="1.8" fill="#ffffff"/>
                <circle cx="63.5" cy="46.8" r="1.8" fill="#ffffff"/>
                <circle cx="36.8" cy="51.2" r="0.8" fill="#ffffff" opacity="0.85"/>
                <circle cx="60.8" cy="51.2" r="0.8" fill="#ffffff" opacity="0.85"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.45s" repeatCount="indefinite"
                            values="
                                M 46 59 Q 50 58 54 59 Q 54 63.2 50 63.5 Q 46 63.2 46 59 Z;
                                M 44.5 58 Q 50 57 55.5 58 Q 55.5 65 50 65.5 Q 44.5 65 44.5 58 Z;
                                M 46 59 Q 50 58 54 59 Q 54 63.2 50 63.5 Q 46 63.2 46 59 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="63.5" rx="2.4" ry="1.2" fill="${cTongue}"/>
                </g>
            ` : `<path d="M 45.5 59.5 Q 50 61.5 54.5 59.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>`;
        } else {
            browsMarkup = `
                <path d="M 34 39.5 Q 39 36.5 45 39.5" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 39.5 Q 61 36.5 66 39.5" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.4" ry="6.0" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.4" ry="6.0" fill="${cEye}"/>
                <circle cx="39.8" cy="46.5" r="2.0" fill="#ffffff"/>
                <circle cx="63.8" cy="46.5" r="2.0" fill="#ffffff"/>
                <circle cx="36.6" cy="51.2" r="0.9" fill="#ffffff" opacity="0.9"/>
                <circle cx="60.6" cy="51.2" r="0.9" fill="#ffffff" opacity="0.9"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.44s" repeatCount="indefinite"
                            values="
                                M 45 59 Q 50 58 55 59 Q 55 64 50 64.5 Q 45 64 45 59 Z;
                                M 44 58 Q 50 57 56 58 Q 56 66 50 66.5 Q 44 66 44 58 Z;
                                M 45 59 Q 50 58 55 59 Q 55 64 50 64.5 Q 45 64 45 59 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="64" rx="2.5" ry="1.3" fill="${cTongue}"/>
                </g>
            ` : `<path d="M 45 59.5 Q 47.5 61.8 50 60.5 Q 52.5 61.8 55 59.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>`;
        }
    }
    // 1. STERN (Nghiêm nghị, chấn chỉnh)
    else if (baseMood === 'stern') {
        if (intensity === 1) {
            browsMarkup = `
                <path d="M 32 40 L 45 44" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M 68 40 L 55 44" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="4.8" ry="5.5" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="4.8" ry="5.5" fill="${cEye}"/>
                <circle cx="39.5" cy="47" r="1.6" fill="#ffffff"/>
                <circle cx="63.5" cy="47" r="1.6" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.38s" repeatCount="indefinite"
                            values="
                                M 45 60.5 Q 50 59.5 55 60.5 Q 55 62.5 50 62.5 Q 45 62.5 45 60.5 Z;
                                M 44 60.5 Q 50 59 56 60.5 Q 56 64 50 64 Q 44 64 44 60.5 Z;
                                M 45 60.5 Q 50 59.5 55 60.5 Q 55 62.5 50 62.5 Q 45 62.5 45 60.5 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path d="M 45 60.5 L 55 60.5" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round"/>`;
        } else if (intensity === 2) {
            // Level 2: Chống nạnh bĩu môi (Bỏ cánh tay que, chỉ đặt 2 đốm tròn bên hông chuẩn Chibi)
            headRot = -4;
            leftEarRot = -6;
            rightEarRot = 6;
            browsMarkup = `
                <path d="M 31 39 L 45 44" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M 69 39 L 55 44" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <ellipse cx="37" cy="49" rx="4.5" ry="5.2" fill="${cEye}"/>
                <ellipse cx="61" cy="49" rx="4.5" ry="5.2" fill="${cEye}"/>
                <circle cx="35.5" cy="48" r="1.4" fill="#ffffff"/>
                <circle cx="59.5" cy="48" r="1.4" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <!-- Hai ban tay bup mang dat 2 ben hong (khong ve que tay gay) -->
                <ellipse cx="23" cy="65" rx="4.8" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="77" cy="65" rx="4.8" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.36s" repeatCount="indefinite"
                            values="
                                M 44.5 61 Q 50 58.5 55.5 61 Q 55 64.5 50 65 Q 45 64.5 44.5 61 Z;
                                M 44 60.5 Q 50 58 56 60.5 Q 55 66.5 50 67 Q 45 66.5 44 60.5 Z;
                                M 44.5 61 Q 50 58.5 55.5 61 Q 55 64.5 50 65 Q 45 64.5 44.5 61 Z
                            "
                        />
                    </path>
                    <path d="M 46 60 Q 50 58.8 54 60 L 53.5 61.8 Q 50 60.8 46.5 61.8 Z" fill="#ffffff"/>
                </g>
            ` : `<path d="M 44.5 61.5 Q 50 58.5 55.5 61.5" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
        } else {
            // Level 3: Con gian hon doi tre con Manga (Pout Akimbo, mat liếc hờn dỗi, bĩu môi, KHONG RUNG LAC, KHONG BI BIEN DANG)
            headRot = 5;
            leftEarRot = -4;
            rightEarRot = 8;
            browsMarkup = `
                <path d="M 31 39 L 45 44" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M 69 40 L 55 44" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <!-- Mat to tron voi mi tren phang hon doi, con nguoi liếc xéo sang ben ('hứ!') -->
                <path d="M 31 46 L 45 46 Q 45 54 38 54 Q 31 54 31 46 Z" fill="${cEye}"/>
                <circle cx="35" cy="48.5" r="1.8" fill="#ffffff"/>
                <circle cx="33" cy="51" r="0.9" fill="#ffffff" opacity="0.85"/>

                <path d="M 67 46 L 53 46 Q 53 54 60 54 Q 67 54 67 46 Z" fill="${cEye}"/>
                <circle cx="57" cy="48.5" r="1.8" fill="#ffffff"/>
                <circle cx="55" cy="51" r="0.9" fill="#ffffff" opacity="0.85"/>
            `;
            cheeksMarkup = `
                <!-- Ma phong ung hong nhe o 2 ben ria mat -->
                <ellipse cx="22" cy="56" rx="6.5" ry="4.0" fill="${cBlush}"/>
                <path d="M 19 54 L 17 58 M 22 54 L 20 58 M 25 54 L 23 58" stroke="#e11d48" stroke-width="0.85" stroke-linecap="round" opacity="0.7"/>
                <ellipse cx="78" cy="56" rx="6.5" ry="4.0" fill="${cBlush}"/>
                <path d="M 75 54 L 73 58 M 78 54 L 76 58 M 81 54 L 79 58" stroke="#e11d48" stroke-width="0.85" stroke-linecap="round" opacity="0.7"/>
            `;
            overlayMarkup = '';
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.36s" repeatCount="indefinite"
                            values="
                                M 46 61 Q 50 58.5 54 61 Q 54 64 50 64.5 Q 46 64 46 61 Z;
                                M 45 60.5 Q 50 58 55 60.5 Q 55 65.5 50 66 Q 45 65.5 45 60.5 Z;
                                M 46 61 Q 50 58.5 54 61 Q 54 64 50 64.5 Q 46 64 46 61 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="63.8" rx="2.0" ry="1.0" fill="${cTongue}"/>
                </g>
            ` : `
                <!-- Môi bĩu chu dỗi hình chữ He (へ字口 / むーっ), khong co rang nanh, khong run lac -->
                <g class="companion-mouth">
                    <path d="M 45 61.5 Q 50 58 55 61.5" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
                    <path d="M 47 62.5 Q 50 64 53 62.5" stroke="${cStroke}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.5"/>
                </g>
            `;
            pawsMarkup = `
                <!-- Hai ban tay bup mang chong nanh o 2 ben hong (KHONG VE CUC TRON TREN MAT) -->
                <ellipse cx="23" cy="65" rx="5.2" ry="4.0" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="77" cy="65" rx="5.2" ry="4.0" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
        }
    }
    // 2. PUZZLED (Khó hiểu & Bối rối Manga)
    else if (baseMood === 'puzzled') {
        if (intensity === 1) {
            headRot = 6;
            browsMarkup = `
                <path d="M 33 40 Q 38 37 44 41" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 43 Q 61 40 67 39" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.4" ry="5.8" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.0" ry="5.4" fill="${cEye}"/>
                <circle cx="40" cy="47" r="1.8" fill="#ffffff"/>
                <circle cx="63" cy="47" r="1.5" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            overlayMarkup = `
                <text class="nori-micro-float" x="75" y="27" font-size="16" font-weight="bold" fill="#0284c7" font-family="sans-serif">?</text>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <ellipse cx="50" cy="60" rx="2.5" ry="3.2" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2">
                        <animate attributeName="ry" dur="0.45s" repeatCount="indefinite" values="2.0; 3.6; 2.0"/>
                    </ellipse>
                </g>
            ` : `<path d="M 46.5 60.5 Q 50 59 53.5 60.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>`;
        } else if (intensity === 2) {
            headRot = 9;
            leftEarRot = 8;
            browsMarkup = `
                <path d="M 32 39 Q 38 35 44 40" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                <path d="M 55 44 Q 61 39 68 40" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="48" rx="5.5" ry="6.0" fill="${cEye}"/>
                <ellipse cx="62" cy="48" rx="4.8" ry="5.2" fill="${cEye}"/>
                <circle cx="39" cy="46" r="1.8" fill="#ffffff"/>
                <circle cx="63" cy="46" r="1.5" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-scratch">
                    <ellipse cx="34" cy="63" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                    <ellipse cx="60" cy="57" rx="4.5" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                </g>
            `;
            overlayMarkup = `
                <text class="nori-micro-float" x="74" y="27" font-size="15" font-weight="bold" fill="#0284c7" font-family="sans-serif">??</text>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.42s" repeatCount="indefinite"
                            values="
                                M 45 61 Q 48 60 51 59 Q 55 58.5 55 61 Q 51 63 45 61 Z;
                                M 44.5 60.5 Q 48 59 51.5 58 Q 55.5 57.5 55.5 63 Q 51 65 44.5 60.5 Z;
                                M 45 61 Q 48 60 51 59 Q 55 58.5 55 61 Q 51 63 45 61 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path d="M 45 61.5 Q 48 61.5 50.5 59.5 Q 53 58.5 55.5 59" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
        } else {
            headRot = -8;
            leftEarRot = -8;
            rightEarRot = 8;
            browsMarkup = `
                <path d="M 31 38 Q 38 43 45 39" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
                <path d="M 55 39 Q 62 43 69 38" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="39" cy="49" rx="8.5" ry="9.0" fill="#ffffff" stroke="${cStroke}" stroke-width="1.6"/>
                <ellipse cx="61" cy="49" rx="8.5" ry="9.0" fill="#ffffff" stroke="${cStroke}" stroke-width="1.6"/>
                <path class="nori-micro-spiral-left" d="M 39 49 m 0,-5 a 5,5 0 0,1 5,5 a 4,4 0 0,1 -4,4 a 3,3 0 0,1 -3,-3 a 2,2 0 0,1 2,-2 a 1,1 0 0,1 1,1" fill="none" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round"/>
                <path class="nori-micro-spiral-right" d="M 61 49 m 0,-5 a 5,5 0 0,1 5,5 a 4,4 0 0,1 -4,4 a 3,3 0 0,1 -3,-3 a 2,2 0 0,1 2,-2 a 1,1 0 0,1 1,1" fill="none" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth nori-micro-tremble">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.22s" repeatCount="indefinite"
                            values="
                                M 44 59 Q 47 56.5 50 59 Q 53 61.5 56 59 Q 50 63 44 59 Z;
                                M 44 58 Q 47 61.5 50 58 Q 53 56 56 58 Q 50 65 44 58 Z;
                                M 44 59 Q 47 56.5 50 59 Q 53 61.5 56 59 Q 50 63 44 59 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path class="nori-micro-tremble" d="M 44 59 Q 47 56.5 50 59 Q 53 61.5 56 59" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
            pawsMarkup = `
                <ellipse cx="26" cy="54" rx="4.8" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="74" cy="54" rx="4.8" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
            overlayMarkup = `
                <text class="nori-micro-float" x="72" y="27" font-size="16" font-weight="bold" fill="#0284c7" font-family="sans-serif">?!</text>
                <path class="nori-micro-sweat" d="M 76 34 C 77 37, 79 39, 79 41 C 79 43, 77 45, 75 45 C 73 45, 71 43, 71 41 C 71 39, 74 37, 76 34 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8"/>
            `;
        }
    }
    // 3. THOUGHTFUL (Cân nhắc & Suy tư)
    else if (baseMood === 'thoughtful') {
        if (intensity === 1) {
            browsMarkup = `
                <path d="M 33 41 Q 38 39 44 41" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 56 41 Q 62 39 67 41" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.2" ry="5.8" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.2" ry="5.8" fill="${cEye}"/>
                <circle cx="39.5" cy="47" r="1.7" fill="#ffffff"/>
                <circle cx="63.5" cy="47" r="1.7" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <circle cx="50" cy="60" r="2.8" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2">
                        <animate attributeName="r" dur="0.5s" repeatCount="indefinite" values="1.8; 3.2; 1.8"/>
                    </circle>
                </g>
            ` : `<path d="M 47 60.5 L 53 60.5" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round"/>`;
        } else if (intensity === 2) {
            browsMarkup = `
                <path d="M 32 40 Q 38 37 44 41" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                <path d="M 56 41 Q 62 37 68 40" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="48" rx="5.0" ry="5.6" fill="${cEye}"/>
                <ellipse cx="62" cy="48" rx="5.0" ry="5.6" fill="${cEye}"/>
                <circle cx="39" cy="45.5" r="1.7" fill="#ffffff"/>
                <circle cx="63" cy="45.5" r="1.7" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-fingertap">
                    <ellipse cx="35" cy="63" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                    <ellipse cx="58" cy="58" rx="4.5" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <ellipse cx="48" cy="60" rx="2.8" ry="1.8" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2">
                        <animate attributeName="ry" dur="0.48s" repeatCount="indefinite" values="1.4; 2.8; 1.4"/>
                    </ellipse>
                </g>
            ` : `<circle cx="48" cy="60" r="2.2" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2"/>`;
        } else {
            browsMarkup = `
                <path d="M 32 43 L 44 39" stroke="${cStroke}" stroke-width="3.0" stroke-linecap="round"/>
                <path d="M 68 43 L 56 39" stroke="${cStroke}" stroke-width="3.0" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <path d="M 33 49 L 43 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round"/>
                <path d="M 57 49 L 67 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.38s" repeatCount="indefinite"
                            values="
                                M 46 60 L 54 60 L 53.5 62.5 L 46.5 62.5 Z;
                                M 45.5 59.5 L 54.5 59.5 L 54 63.8 L 46 63.8 Z;
                                M 46 60 L 54 60 L 53.5 62.5 L 46.5 62.5 Z
                            "
                        />
                    </path>
                </g>
            ` : `<line x1="46" y1="60" x2="54" y2="60" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round"/>`;
            pawsMarkup = `
                <ellipse cx="27" cy="51" rx="4.8" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="73" cy="51" rx="4.8" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
            overlayMarkup = `
                <path class="nori-micro-sweat" d="M 76 34 C 77 37, 79 39, 79 41 C 79 43, 77 45, 75 45 C 73 45, 71 43, 71 41 C 71 39, 74 37, 76 34 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8"/>
            `;
        }
    }
    // 4. PROUD (Tự hào Manga - Cute Fang & Organic Smile Arcs!)
    else if (baseMood === 'proud') {
        if (intensity === 1) {
            browsMarkup = `
                <path d="M 33 39 Q 39 36 45 39" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 39 Q 61 36 67 39" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.5" ry="6.2" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.5" ry="6.2" fill="${cEye}"/>
                <circle cx="40" cy="47" r="2.0" fill="#ffffff"/>
                <circle cx="64" cy="47" r="2.0" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-nod">
                    <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                    <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.48s" repeatCount="indefinite"
                            values="
                                M 45 59 Q 50 58.5 55 59 Q 55 64 50 64.5 Q 45 64 45 59 Z;
                                M 44 58 Q 50 57.5 56 58 Q 56 66 50 66.5 Q 44 66 44 58 Z;
                                M 45 59 Q 50 58.5 55 59 Q 55 64 50 64.5 Q 45 64 45 59 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="64" rx="2.2" ry="1.2" fill="${cTongue}"/>
                </g>
            ` : `<path d="M 45 59 Q 50 63 55 59" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>`;
        } else if (intensity === 2) {
            headTy = -2;
            browsMarkup = `
                <path d="M 32 38 Q 39 34 46 38" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                <path d="M 54 38 Q 61 34 68 38" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <path d="M 33 49 Q 39 43 45 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
                <path d="M 55 49 Q 61 43 67 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-chestpuff">
                    <ellipse cx="28" cy="62" rx="4.8" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                    <ellipse cx="72" cy="62" rx="4.8" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.44s" repeatCount="indefinite"
                            values="
                                M 44 58 Q 50 57 56 58 Q 56 65 50 65.5 Q 44 65 44 58 Z;
                                M 43 57 Q 50 56 57 57 Q 57 67.5 50 68 Q 43 67.5 43 57 Z;
                                M 44 58 Q 50 57 56 58 Q 56 65 50 65.5 Q 44 65 44 58 Z
                            "
                        />
                    </path>
                    <polygon points="53.5,57.5 55,61.2 56.5,57.5" fill="#ffffff"/>
                    <ellipse cx="50" cy="65" rx="2.8" ry="1.4" fill="${cTongue}"/>
                </g>
            ` : `
                <g class="companion-mouth">
                    <path d="M 44 58 Q 50 65 56 58" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                    <polygon points="53,58.8 54.5,61.8 56,58.5" fill="#ffffff" stroke="${cStroke}" stroke-width="0.8" stroke-linejoin="round"/>
                </g>
            `;
        } else {
            // Level 3: Celebratory Champion (2 qua dom tron gio cao ben ma, bo que gay)
            headTy = -3;
            browsMarkup = `
                <path d="M 32 38 Q 39 33 46 38" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
                <path d="M 54 38 Q 61 33 68 38" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <!-- Left Sparkling Eye -->
                <ellipse cx="38" cy="49" rx="6.0" ry="6.8" fill="#1c1917" stroke="${cStroke}" stroke-width="1.2"/>
                <path class="nori-micro-star-left" d="M 38 43 Q 38 49 33 49 Q 38 49 38 55 Q 38 49 43 49 Q 38 49 38 43 Z" fill="#eab308"/>
                <circle cx="38" cy="49" r="1.3" fill="#ffffff"/>
                <circle cx="36" cy="46.5" r="0.8" fill="#ffffff" opacity="0.85"/>

                <!-- Right Sparkling Eye -->
                <ellipse cx="62" cy="49" rx="6.0" ry="6.8" fill="#1c1917" stroke="${cStroke}" stroke-width="1.2"/>
                <path class="nori-micro-star-right" d="M 62 43 Q 62 49 57 49 Q 62 49 62 55 Q 62 49 67 49 Q 62 49 62 43 Z" fill="#eab308"/>
                <circle cx="62" cy="49" r="1.3" fill="#ffffff"/>
                <circle cx="60" cy="46.5" r="0.8" fill="#ffffff" opacity="0.85"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-fistpump">
                    <ellipse cx="25" cy="46" rx="4.8" ry="4.0" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                    <ellipse cx="75" cy="46" rx="4.8" ry="4.0" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.4" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.4s" repeatCount="indefinite"
                            values="
                                M 42 57 Q 50 56 58 57 Q 58 66 50 66.5 Q 42 66 42 57 Z;
                                M 41 56 Q 50 55 59 56 Q 59 69 50 69.5 Q 41 69 41 56 Z;
                                M 42 57 Q 50 56 58 57 Q 58 66 50 66.5 Q 42 66 42 57 Z
                            "
                        />
                    </path>
                    <polygon points="55,56 56.8,60.5 58.5,56" fill="#ffffff"/>
                    <ellipse cx="50" cy="66" rx="3.2" ry="1.6" fill="${cTongue}"/>
                </g>
            ` : `
                <g class="companion-mouth">
                    <path d="M 42 57 Q 50 56 58 57 Q 58 67 50 67.5 Q 42 67 42 57 Z" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.4" stroke-linejoin="round"/>
                    <polygon points="54.5,56.8 56.2,60.8 57.8,56.8" fill="#ffffff"/>
                    <path d="M 45 64 Q 50 61.5 55 64 Q 53 67 50 67 Q 47 67 45 64 Z" fill="${cTongue}"/>
                    <circle cx="41" cy="57" r="0.8" fill="${cStroke}"/>
                    <circle cx="59" cy="57" r="0.8" fill="${cStroke}"/>
                </g>
            `;
            overlayMarkup = `
                <path class="nori-micro-float" d="M 20 32 L 21 35 L 24 36 L 21 37 L 20 40 L 19 37 L 16 36 L 19 35 Z" fill="#eab308" opacity="0.85"/>
                <path class="nori-micro-float" d="M 80 32 L 81 35 L 84 36 L 81 37 L 80 40 L 79 37 L 76 36 L 79 35 Z" fill="#eab308" opacity="0.85"/>
            `;
        }
    }
    // 5. SHOCKED (Kinh ngạc Manga - Jaw Drop & Dread Lines)
    else if (baseMood === 'shocked') {
        if (intensity === 1) {
            browsMarkup = `
                <path d="M 33 37 Q 39 34 44 38" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 56 38 Q 61 34 67 37" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="48" rx="6.5" ry="7.2" fill="#ffffff" stroke="${cStroke}" stroke-width="1.4"/>
                <ellipse cx="62" cy="48" rx="6.5" ry="7.2" fill="#ffffff" stroke="${cStroke}" stroke-width="1.4"/>
                <ellipse cx="38" cy="48" rx="3.2" ry="3.5" fill="${cEye}"/>
                <ellipse cx="62" cy="48" rx="3.2" ry="3.5" fill="${cEye}"/>
                <circle cx="39" cy="46.5" r="1.2" fill="#ffffff"/>
                <circle cx="63" cy="46.5" r="1.2" fill="#ffffff"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-startle">
                    <ellipse cx="36" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                    <ellipse cx="64" cy="62" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <ellipse cx="50" cy="61" rx="3.2" ry="4.2" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3">
                        <animate attributeName="ry" dur="0.4s" repeatCount="indefinite" values="3.2; 5.2; 3.2"/>
                    </ellipse>
                </g>
            ` : `<ellipse cx="50" cy="61" rx="3.0" ry="4.0" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3"/>`;
        } else if (intensity === 2) {
            browsMarkup = `
                <path d="M 32 35 Q 39 32 45 37" stroke="${cStroke}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                <path d="M 55 37 Q 61 32 68 35" stroke="${cStroke}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="48" rx="7.2" ry="8.0" fill="#ffffff" stroke="${cStroke}" stroke-width="1.5"/>
                <ellipse cx="62" cy="48" rx="7.2" ry="8.0" fill="#ffffff" stroke="${cStroke}" stroke-width="1.5"/>
                <circle cx="38" cy="48" r="2.0" fill="${cEye}"/>
                <circle cx="62" cy="48" r="2.0" fill="${cEye}"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-recoil">
                    <ellipse cx="30" cy="60" rx="4.6" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                    <ellipse cx="70" cy="60" rx="4.6" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                </g>
            `;
            overlayMarkup = `
                <path class="nori-micro-sweat" d="M 74 34 C 75 36, 77 38, 77 40 C 77 42, 75 43, 74 43 C 73 43, 71 42, 71 40 C 71 38, 73 36, 74 34 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <ellipse cx="50" cy="63" rx="3.8" ry="5.8" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.4">
                        <animate attributeName="ry" dur="0.35s" repeatCount="indefinite" values="4.2; 6.8; 4.2"/>
                    </ellipse>
                </g>
            ` : `<ellipse cx="50" cy="63" rx="3.6" ry="5.6" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.4"/>`;
        } else {
            browsMarkup = `
                <path d="M 31 34 L 45 38" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M 69 34 L 55 38" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="48" rx="8.0" ry="9.0" fill="#ffffff" stroke="${cStroke}" stroke-width="1.6"/>
                <ellipse cx="62" cy="48" rx="8.0" ry="9.0" fill="#ffffff" stroke="${cStroke}" stroke-width="1.6"/>
                <circle cx="38" cy="48" r="1.4" fill="${cEye}"/>
                <circle cx="62" cy="48" r="1.4" fill="${cEye}"/>
            `;
            overlayMarkup = `
                <g class="nori-micro-darkshade">
                    <line x1="33" y1="28" x2="33" y2="40" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                    <line x1="39" y1="26" x2="39" y2="42" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                    <line x1="45" y1="25" x2="45" y2="41" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                    <line x1="51" y1="25" x2="51" y2="41" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                    <line x1="57" y1="26" x2="57" y2="42" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                    <line x1="63" y1="28" x2="63" y2="40" stroke="#3b82f6" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth nori-micro-tremble">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.5" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.28s" repeatCount="indefinite"
                            values="
                                M 44 58 Q 50 56.5 56 58 L 55 70 Q 50 72 45 70 Z;
                                M 44 58 Q 50 56.5 56 58 L 55 74 Q 50 76 45 74 Z;
                                M 44 58 Q 50 56.5 56 58 L 55 70 Q 50 72 45 70 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path class="nori-micro-tremble" d="M 44 58 Q 50 56.5 56 58 L 55 72 Q 50 74 45 72 Z" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.5" stroke-linejoin="round"/>`;
            pawsMarkup = `
                <ellipse cx="28" cy="62" rx="4.8" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="72" cy="62" rx="4.8" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
        }
    }
    // 6. EMPATHETIC (Đồng cảm & Thấu hiểu Manga - Cung mày 八 và Giọt lệ pha lê)
    else if (baseMood === 'empathetic') {
        if (intensity === 1) {
            headRot = 2;
            browsMarkup = `
                <path d="M 32 45 Q 39 40 45 42" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 42 Q 61 40 68 45" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.5" ry="6.2" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.5" ry="6.2" fill="${cEye}"/>
                <circle cx="39.5" cy="46.8" r="2.0" fill="#ffffff"/>
                <circle cx="63.5" cy="46.8" r="2.0" fill="#ffffff"/>
                <circle cx="37" cy="51.2" r="0.9" fill="#ffffff" opacity="0.8"/>
                <circle cx="61" cy="51.2" r="0.9" fill="#ffffff" opacity="0.8"/>
            `;
            pawsMarkup = `
                <ellipse cx="38" cy="63" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="62" cy="63" rx="4.5" ry="3.5" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.52s" repeatCount="indefinite"
                            values="
                                M 46 60 Q 50 59.5 54 60 Q 54 62.8 50 63 Q 46 62.8 46 60 Z;
                                M 45.5 59.5 Q 50 59 54.5 59.5 Q 54.5 64 50 64.2 Q 45.5 64 45.5 59.5 Z;
                                M 46 60 Q 50 59.5 54 60 Q 54 62.8 50 63 Q 46 62.8 46 60 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path d="M 46 60 Q 50 61 54 60" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>`;
        } else if (intensity === 2) {
            // Level 2: Hai tay vo ve (2 qua dom tron to chum truoc nguc, khong co canh tay que)
            browsMarkup = `
                <path d="M 31 45 Q 39 38 46 41" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                <path d="M 54 41 Q 61 38 69 45" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="5.8" ry="6.5" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.8" ry="6.5" fill="${cEye}"/>
                <circle cx="39.2" cy="46.5" r="2.2" fill="#ffffff"/>
                <circle cx="63.2" cy="46.5" r="2.2" fill="#ffffff"/>
                <circle cx="36.8" cy="51" r="1.0" fill="#ffffff" opacity="0.85"/>
                <circle cx="60.8" cy="51" r="1.0" fill="#ffffff" opacity="0.85"/>
            `;
            pawsMarkup = `
                <g class="nori-micro-comfortpat">
                    <ellipse cx="44" cy="63" rx="4.6" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                    <ellipse cx="56" cy="63" rx="4.6" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.48s" repeatCount="indefinite"
                            values="
                                M 46 60 Q 50 59.5 54 60 Q 54 63.5 50 63.8 Q 46 63.5 46 60 Z;
                                M 45 59.5 Q 50 59 55 59.5 Q 55 64.8 50 65 Q 45 64.8 45 59.5 Z;
                                M 46 60 Q 50 59.5 54 60 Q 54 63.5 50 63.8 Q 46 63.5 46 60 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path d="M 46 60 Q 50 61.5 54 60" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
        } else {
            // Level 3: Xuc dong rơm rớm (Nuoc mat long lanh, 2 dom tron om nguc, khong co canh tay que)
            browsMarkup = `
                <path d="M 30 46 Q 39 37 47 41" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
                <path d="M 53 41 Q 61 37 70 46" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <ellipse cx="38" cy="49" rx="6.2" ry="7.0" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="6.2" ry="7.0" fill="${cEye}"/>
                <circle cx="39" cy="46" r="2.4" fill="#ffffff"/>
                <circle cx="63" cy="46" r="2.4" fill="#ffffff"/>
                <!-- Watery Lower Rim Reflection -->
                <path d="M 33 51 Q 38 55 43 51 Q 43 54 38 55 Q 33 54 33 51 Z" fill="#38bdf8" opacity="0.75"/>
                <path d="M 57 51 Q 62 55 67 51 Q 67 54 62 55 Q 57 54 57 51 Z" fill="#38bdf8" opacity="0.75"/>
                <!-- Glistening Crystal Teardrop welling up at outer corner -->
                <path class="nori-micro-tear-left" d="M 33 51 C 32 53, 31 55, 33 57 C 35 57, 35 54, 33 51 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.7"/>
                <path class="nori-micro-tear-right" d="M 67 51 C 66 53, 65 55, 67 57 C 69 57, 69 54, 67 51 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.7"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth nori-micro-tremble">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.32s" repeatCount="indefinite"
                            values="
                                M 45 61 Q 50 59.8 55 61 Q 54.5 64 50 64.2 Q 45.5 64 45 61 Z;
                                M 44.5 60.5 Q 50 59.2 55.5 60.5 Q 55 65.5 50 65.8 Q 45 65.5 44.5 60.5 Z;
                                M 45 61 Q 50 59.8 55 61 Q 54.5 64 50 64.2 Q 45.5 64 45 61 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path class="nori-micro-tremble" d="M 45 61 Q 50 59.8 55 61" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
            pawsMarkup = `
                <g class="nori-micro-clasped">
                    <ellipse cx="43" cy="63.5" rx="4.6" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                    <ellipse cx="57" cy="63.5" rx="4.6" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                </g>
            `;
        }
    }
    // 7. RELIEVED (Nhẹ nhõm & Thở phào trút bỏ gánh nặng - TỈNH TÁO 100%, KHÔNG CỤC U Ở MẶT, KHÔNG LỆCH TỌA ĐỘ)
    else if (baseMood === 'relieved') {
        if (intensity === 1) {
            // Level 1: Thở phào nhẹ nhõm, vai hạ thấp, mắt êm dịu
            headTy = 2;
            browsMarkup = `
                <path d="M 33 41 Q 39 37 45 40" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
                <path d="M 55 40 Q 61 37 67 41" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <!-- Mắt mở dịu dàng, mí mắt hơi rủ nhẹ thư thái -->
                <ellipse cx="38" cy="49" rx="5.0" ry="4.8" fill="${cEye}"/>
                <ellipse cx="62" cy="49" rx="5.0" ry="4.8" fill="${cEye}"/>
                <circle cx="39.5" cy="48" r="1.6" fill="#ffffff"/>
                <circle cx="63.5" cy="48" r="1.6" fill="#ffffff"/>
                <path d="M 32 46 Q 38 45 44 47" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                <path d="M 56 47 Q 62 45 68 46" stroke="${cStroke}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <!-- Hai tay búp măng đặt thư thái bên sườn dưới (không đặt trên mặt) -->
                <ellipse cx="23" cy="66" rx="4.8" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="77" cy="66" rx="4.8" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.52s" repeatCount="indefinite"
                            values="
                                M 46 60.5 Q 50 59.5 54 60.5 Q 54 63.5 50 63.5 Q 46 63.5 46 60.5 Z;
                                M 45 60 Q 50 58.8 55 60 Q 55 65 50 65 Q 45 65 45 60 Z;
                                M 46 60.5 Q 50 59.5 54 60.5 Q 54 63.5 50 63.5 Q 46 63.5 46 60.5 Z
                            "
                        />
                    </path>
                </g>
            ` : `<path d="M 45 61 Q 50 63.2 55 61" stroke="${cStroke}" stroke-width="2.0" stroke-linecap="round" fill="none"/>`;
        } else if (intensity === 2) {
            // Level 2: Thở phào 'Hú hồn, may quá!' - Giọt mồ hôi vẽ cố định tại thái dương (KHÔNG BỊ LỆCH TỌA ĐỘ)
            headTy = 2;
            leftEarRot = 6;
            rightEarRot = -6;
            browsMarkup = `
                <path d="M 33 40 Q 39 36 45 40" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 40 Q 61 36 67 40" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <!-- Mắt cười cong thở phào thư giãn -->
                <path d="M 33 50 Q 39 55 45 50" stroke="${cStroke}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                <path d="M 55 50 Q 61 55 67 50" stroke="${cStroke}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            `;
            pawsMarkup = `
                <!-- Tay đặt ở ngực kem dưới cy=72 (KHÔNG ĐẶT NGAY DƯỚI MIỆNG LÀM THÀNH CỤC U) -->
                <ellipse cx="42" cy="73" rx="4.8" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="76" cy="66" rx="4.6" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            overlayMarkup = `
                <!-- Giọt mồ hôi thở phào Anime vẽ cố định tại thái dương phải x=76 y=36, có hiệu ứng chớp mờ dần bằng animate thuần SVG -->
                <g>
                    <path d="M 76 34 C 78 37, 80 39, 80 41 C 80 43.5, 78 45.5, 75.5 45.5 C 73 45.5, 71 43.5, 71 41 C 71 39, 74 37, 76 34 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8">
                        <animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values="0.9; 0.3; 0.9" keyTimes="0; 0.5; 1"/>
                    </path>
                </g>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.48s" repeatCount="indefinite"
                            values="
                                M 46 60 Q 50 59 54 60 Q 54 63.8 50 64 Q 46 63.8 46 60 Z;
                                M 45 59.5 Q 50 58.2 55 59.5 Q 55 65.5 50 66 Q 45 65.5 45 59.5 Z;
                                M 46 60 Q 50 59 54 60 Q 54 63.8 50 64 Q 46 63.8 46 60 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="63.5" rx="2.0" ry="1.0" fill="${cTongue}"/>
                </g>
            ` : `
                <!-- Miệng thở phào nhẹ nhõm 'phùuu' -->
                <path d="M 45 61 Q 50 59.5 55 61" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 47 62 Q 50 63.8 53 62" stroke="${cStroke}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.6"/>
            `;
        } else {
            // Level 3: Vỡ òa an tâm & Mãn nguyện sâu sắc - HAI TAY ĐẶT TRÊN BỤNG KEM THẢNH THƠI (KHÔNG CỤC U Ở MẶT)
            browsMarkup = `
                <path d="M 33 40 Q 39 36 45 40" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 40 Q 61 36 67 40" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
            eyesMarkup = `
                <!-- Đôi mắt cười hình trăng khuyết tràn ngập niềm an tâm và ấm áp -->
                <path d="M 32 49 Q 38 44 44 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
                <path d="M 56 49 Q 62 44 68 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
                <path d="M 34 51 Q 38 47 42 51" stroke="${cStroke}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.6"/>
                <path d="M 58 51 Q 62 47 66 51" stroke="${cStroke}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.6"/>
            `;
            cheeksMarkup = `
                <ellipse cx="23" cy="55" rx="6.8" ry="4.0" fill="${cBlush}"/>
                <path d="M 20 53 L 18 57 M 23 53 L 21 57 M 26 53 L 24 57" stroke="#f43f5e" stroke-width="0.8" stroke-linecap="round" opacity="0.65"/>
                <ellipse cx="77" cy="55" rx="6.8" ry="4.0" fill="${cBlush}"/>
                <path d="M 74 53 L 72 57 M 77 53 L 75 57 M 80 53 L 78 57" stroke="#f43f5e" stroke-width="0.8" stroke-linecap="round" opacity="0.65"/>
            `;
            pawsMarkup = `
                <!-- Hai bàn tay búp măng đặt thảnh thơi trên bụng kem dưới cy=74 (HOÀN TOÀN GIẢI PHÓNG KHUÔN MẶT) -->
                <ellipse cx="37" cy="74" rx="5.0" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="63" cy="74" rx="5.0" ry="3.8" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
            overlayMarkup = '';
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.45s" repeatCount="indefinite"
                            values="
                                M 45 60 Q 50 58.5 55 60 Q 55 64.5 50 65 Q 45 64.5 45 60 Z;
                                M 44.5 59.5 Q 50 58 55.5 59.5 Q 55.5 66 50 66.5 Q 44.5 66 44.5 59.5 Z;
                                M 45 60 Q 50 58.5 55 60 Q 55 64.5 50 65 Q 45 64.5 45 60 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="64" rx="2.2" ry="1.1" fill="${cTongue}"/>
                </g>
            ` : `
                <!-- Nụ cười mỉm hạnh phúc, mãn nguyện sâu sắc (không ngủ, không Zzz) -->
                <g class="companion-mouth">
                    <path d="M 44.5 60.5 Q 50 64 55.5 60.5" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                </g>
            `;
        }
    }
    
    // 8. WINK (Dí dỏm & Tinh nghịch - BẮT BUỘC NHÁY 1 MẮT, ĐẦU NGHIÊNG, ĐỘNG TÁC Ú ÒA CỔ VŨ)
    else if (baseMood === 'wink') {
        if (intensity === 1) {
            // Level 1: Nháy 1 mắt tinh nghịch (mắt trái nháy, mắt phải mở to tròn lóng lánh)
            headRot = 6;
            browsMarkup = `
                <path d="M 33 39 Q 39 36 45 39" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                <path d="M 55 38 L 67 38" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <!-- Mắt trái nháy cong tít lém lỉnh -->
                <path d="M 32 49 Q 39 43 46 49" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" fill="none"/>
                <!-- Mắt phải mở to tròn long lanh nhìn thẳng vào học viên -->
                <ellipse cx="62" cy="49" rx="5.8" ry="6.4" fill="${cEye}"/>
                <circle cx="64" cy="47" r="2.2" fill="#ffffff"/>
                <circle cx="60.5" cy="51.5" r="1.0" fill="#ffffff" opacity="0.85"/>
            `;
            pawsMarkup = `
                <ellipse cx="23" cy="66" rx="4.8" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <ellipse cx="77" cy="66" rx="4.8" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.2" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.45s" repeatCount="indefinite"
                            values="
                                M 46 59.5 Q 51 58.5 55.5 60 Q 55 64 50.5 64.5 Q 46 64 46 59.5 Z;
                                M 45 58.5 Q 51 57.5 56.5 59 Q 56 66 50.5 66.5 Q 45 66 45 58.5 Z;
                                M 46 59.5 Q 51 58.5 55.5 60 Q 55 64 50.5 64.5 Q 46 64 46 59.5 Z
                            "
                        />
                    </path>
                    <ellipse cx="51" cy="63.8" rx="2.2" ry="1.1" fill="${cTongue}"/>
                </g>
            ` : `
                <!-- Khóe môi cười nhếch lém lỉnh lệch sang phải -->
                <path d="M 45 60.5 Q 49 63 55.5 59.5" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
            `;
        } else if (intensity === 2) {
            // Level 2: Vẫy tay cổ vũ tinh quái, ngôi sao nhấp nháy ở khóe mắt
            headRot = 8;
            leftEarRot = -4;
            browsMarkup = `
                <path d="M 33 38 Q 39 34 45 38" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
                <path d="M 55 37 L 68 37" stroke="${cStroke}" stroke-width="2.4" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <!-- Mắt trái nháy cong tít lém lỉnh -->
                <path d="M 32 48 Q 39 42 46 48" stroke="${cStroke}" stroke-width="3.0" stroke-linecap="round" fill="none"/>
                <!-- Mắt phải mở to tròn long lanh có đốm sao nhỏ -->
                <ellipse cx="62" cy="48" rx="6.0" ry="6.6" fill="${cEye}"/>
                <circle cx="64" cy="45.5" r="2.4" fill="#ffffff"/>
                <circle cx="60" cy="51" r="1.1" fill="#ffffff" opacity="0.85"/>
            `;
            pawsMarkup = `
                <ellipse cx="23" cy="66" rx="4.8" ry="3.6" fill="${cBody}" stroke="${cStroke}" stroke-width="1.2"/>
                <g class="nori-micro-wave">
                    <!-- Bàn tay phải giơ lên vẫy chào cổ vũ náo nhiệt ở bên ngoài sườn má -->
                    <ellipse cx="78" cy="48" rx="5.2" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                </g>
            `;
            overlayMarkup = `
                <!-- Ngôi sao nhỏ lấp lánh ở khóe mắt nháy vẽ trực tiếp tọa độ tuyệt đối -->
                <path d="M 38 42 L 39.5 44.5 L 42 45 L 39.5 45.5 L 38 48 L 36.5 45.5 L 34 45 L 36.5 44.5 Z" fill="#eab308">
                    <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="1; 0.4; 1"/>
                </path>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.42s" repeatCount="indefinite"
                            values="
                                M 45 58.5 Q 50 57.5 55.5 58.5 Q 55.5 65 50 65.5 Q 45 65 45 58.5 Z;
                                M 44 57.5 Q 50 56.5 56.5 57.5 Q 56.5 67 50 67.5 Q 44 67 44 57.5 Z;
                                M 45 58.5 Q 50 57.5 55.5 58.5 Q 55.5 65 50 65.5 Q 45 65 45 58.5 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="64" rx="2.4" ry="1.2" fill="${cTongue}"/>
                </g>
            ` : `
                <!-- Nụ cười thè lưỡi trêu đùa tinh nghịch (cheeky blep) -->
                <g class="companion-mouth">
                    <path d="M 45 59.5 Q 49 63 55 60" stroke="${cStroke}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
                    <path d="M 49 61.5 C 49 64.2, 53 64.2, 53 61.5 Z" fill="${cTongue}" stroke="${cStroke}" stroke-width="0.8"/>
                </g>
            `;
        } else {
            // Level 3: ĐỘNG TÁC Ú ÒA NÁO NHIỆT (PEEKABOO CHEER) - NẢY NGƯỜI SANG BÊN, MẮT SAO, 2 TAY VẪY CAO
            headRot = 9;
            headTy = -3;
            leftEarRot = -8;
            rightEarRot = 8;
            browsMarkup = `
                <path d="M 33 37 Q 39 33 45 37" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
                <path d="M 55 36 L 68 36" stroke="${cStroke}" stroke-width="2.6" stroke-linecap="round"/>
            `;
            eyesMarkup = `
                <!-- Mắt trái nháy cong chữ V ngộ nghĩnh (Anime Wink) -->
                <path d="M 32 48 L 38 52 L 44 47" stroke="${cStroke}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <!-- Mắt phải mở to rực rỡ với đồng tử ngôi sao cổ vũ -->
                <ellipse cx="62" cy="48" rx="6.2" ry="6.8" fill="${cEye}"/>
                <circle cx="64" cy="45.5" r="2.4" fill="#ffffff"/>
                <path d="M 62 45 L 63 47.5 L 65.5 48.5 L 63 49.5 L 62 52 L 61 49.5 L 58.5 48.5 L 61 47.5 Z" fill="#fbbf24"/>
            `;
            pawsMarkup = `
                <!-- Hai bàn tay búp măng giơ cao cổ vũ hai bên sườn má (Ú òa!) -->
                <ellipse cx="21" cy="46" rx="5.2" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
                <ellipse cx="79" cy="46" rx="5.2" ry="4.2" fill="${cBody}" stroke="${cStroke}" stroke-width="1.3"/>
            `;
            overlayMarkup = `
                <!-- Ngôi sao pop năng lượng ở đỉnh đầu -->
                <path d="M 28 30 L 29.5 32.5 L 32 33 L 29.5 33.5 L 28 36 L 26.5 33.5 L 24 33 L 26.5 32.5 Z" fill="#eab308"/>
            `;
            mouthMarkup = isTalking ? `
                <g class="companion-mouth">
                    <path fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.4" stroke-linejoin="round">
                        <animate attributeName="d" dur="0.38s" repeatCount="indefinite"
                            values="
                                M 44 58 Q 50 56.5 56 58 Q 56 66 50 66.5 Q 44 66 44 58 Z;
                                M 43 57 Q 50 55.5 57 57 Q 57 68 50 68.5 Q 43 68 43 57 Z;
                                M 44 58 Q 50 56.5 56 58 Q 56 66 50 66.5 Q 44 66 44 58 Z
                            "
                        />
                    </path>
                    <ellipse cx="50" cy="64.5" rx="2.8" ry="1.4" fill="${cTongue}"/>
                </g>
            ` : `
                <!-- Cười há toang miệng Ú òa vui sướng -->
                <g class="companion-mouth">
                    <path d="M 44.5 58.5 Q 50 57 55.5 58.5 Q 55.5 66 50 66.5 Q 44.5 66 44.5 58.5 Z" fill="${cMouthBg}" stroke="${cStroke}" stroke-width="1.3" stroke-linejoin="round"/>
                    <ellipse cx="50" cy="64.2" rx="2.5" ry="1.2" fill="${cTongue}"/>
                </g>
            `;
        }
    }

    

    return `
    <div class="vectoria-companion-avatar" style="display:inline-flex; flex-direction:column; align-items:center; position:relative;">
        <svg width="88" height="88" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible;">
            <defs>
                <radialGradient id="${uid}-body" cx="45%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="${cBody}"/>
                    <stop offset="100%" stop-color="${cShade}"/>
                </radialGradient>
                <radialGradient id="${uid}-shadow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(30, 20, 15, 0.25)"/>
                    <stop offset="100%" stop-color="rgba(30, 20, 15, 0)"/>
                </radialGradient>
            </defs>

            <!-- Ground Shadow -->
            <ellipse cx="50" cy="92" rx="26" ry="4" fill="url(#${uid}-shadow)"/>

            <!-- Living Body: Animation targets ONLY nori-actor, NEVER the container box! -->
            <g id="nori-actor" class="companion-floating-body ${actorAnimClass}" style="transform: translate(0px, ${headTy}px) rotate(${headRot}deg); transform-origin: 50px 55px; transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);">
                
                <!-- Ears with dedicated classes for organic ear twitches -->
                <g class="companion-ear-left" style="transform: rotate(${-10 + leftEarRot}deg); transform-origin: 25px 23px; transition: transform 0.3s ease;">
                    <ellipse cx="25" cy="22" rx="10.5" ry="9.5" fill="url(#${uid}-body)" stroke="${cStroke}" stroke-width="1.6"/>
                    <ellipse cx="25.5" cy="22.5" rx="6.2" ry="5.4" fill="${cInner}"/>
                </g>
                <g class="companion-ear-right" style="transform: rotate(${10 + rightEarRot}deg); transform-origin: 75px 23px; transition: transform 0.3s ease;">
                    <ellipse cx="75" cy="22" rx="10.5" ry="9.5" fill="url(#${uid}-body)" stroke="${cStroke}" stroke-width="1.6"/>
                    <ellipse cx="74.5" cy="22.5" rx="6.2" ry="5.4" fill="${cInner}"/>
                </g>

                <ellipse cx="35" cy="85" rx="7.5" ry="4.5" fill="${cShade}" stroke="${cStroke}" stroke-width="1.4"/>
                <ellipse cx="65" cy="85" rx="7.5" ry="4.5" fill="${cShade}" stroke="${cStroke}" stroke-width="1.4"/>

                <path d="${headPath}" fill="url(#${uid}-body)" stroke="${cStroke}" stroke-width="1.6"/>
                <path d="${bellyPath}" fill="${cTummy}" opacity="0.95"/>

                ${cheeksMarkup}

                <g class="companion-eyebrows">${browsMarkup}</g>
                <g class="companion-eyes">${eyesMarkup}</g>

                <ellipse cx="50" cy="54" rx="1.5" ry="1.1" fill="${cEye}" opacity="0.65"/>

                ${mouthMarkup}
                <g class="companion-paws">${pawsMarkup}</g>
                <g class="companion-overlay">${overlayMarkup}</g>
            </g>
        </svg>
        <div id="vectoria-avatar-voice-waves" style="display: ${displayWave}; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); background: var(--bg-card); border: 1px solid #d97706; border-radius: 0px; padding: 2px 7px; gap: 3px; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            <span style="display: block; width: 2.5px; height: 4px; background: #d97706; border-radius: 1px; animation: mathWaveBar 0.5s infinite ease-in-out;"></span>
            <span style="display: block; width: 2.5px; height: 10px; background: #d97706; border-radius: 1px; animation: mathWaveBar 0.4s infinite ease-in-out 0.1s;"></span>
            <span style="display: block; width: 2.5px; height: 6px; background: #d97706; border-radius: 1px; animation: mathWaveBar 0.6s infinite ease-in-out 0.2s;"></span>
        </div>
    </div>
    `.trim();
}
const renderMentorAvatarSVG = renderMentorAvatarHTML;

function renderMentorCardHTML(session) {
    if (!session) return '';
    
    const moodMeta = getMoodColorAndLabel(session.avatarMood);
    let moodColor = moodMeta.col;
    let moodBg = moodMeta.bg;

    const svgAvatar = renderMentorAvatarHTML(session.avatarMood, false, moodColor);
    const scoreText = session.score !== null ? `${Number(session.score).toFixed(1)}/10 điểm` : '';
    
    // Telemetry & Pacing Gauge
    const telemetry = session.telemetry || {};
    const avgTime = Number(telemetry.time_per_question_avg || 0);
    const totalTimeSec = Number(telemetry.total_time_seconds || 0);
    const switchCount = Number(telemetry.switch_tab_count || 0);
    const rapidDetected = !!telemetry.rapid_guessing_detected;
    
    let gaugePercent = Math.min(100, Math.max(8, Math.round((avgTime / 45.0) * 100)));
    let gaugeColor = 'var(--primary-base, #3e63dd)';
    let gaugeBadge = 'Nhịp độ tiêu chuẩn';
    let pacingDetailText = `Thời gian phản hồi trung bình: ${avgTime > 0 ? avgTime.toFixed(1) + 's / câu' : 'Đang cập nhật'}`;
    
    if (rapidDetected || (avgTime > 0 && avgTime < 15)) {
        gaugeColor = 'var(--danger-base, #e5484d)';
        gaugeBadge = 'Cảnh báo thao tác quá nhanh';
        pacingDetailText = `Trung bình ${avgTime.toFixed(1)}s / câu (thấp hơn nhiều ngưỡng đọc hiểu 45.0s)`;
    } else if (avgTime >= 15 && avgTime < 35) {
        gaugeColor = '#d97706';
        gaugeBadge = 'Tốc độ phản xạ nhanh';
        pacingDetailText = `Trung bình ${avgTime.toFixed(1)}s / câu (nhanh hơn mức trung bình)`;
    } else if (avgTime >= 35 && avgTime <= 80) {
        gaugeColor = 'var(--success-base, #30a46c)';
        gaugeBadge = 'Nhịp độ tư duy tối ưu';
        pacingDetailText = `Trung bình ${avgTime.toFixed(1)}s / câu (đạt chuẩn phân tích)`;
    } else if (avgTime > 80) {
        gaugeColor = 'var(--primary-base, #3e63dd)';
        gaugeBadge = 'Cân nhắc thận trọng';
        pacingDetailText = `Trung bình ${avgTime.toFixed(1)}s / câu (đào sâu chi tiết)`;
    }
    
    const items = session.itemsSummary || [];
    const maxTime = Math.max(60, ...items.map(it => Number(it.time_spent_seconds !== undefined ? it.time_spent_seconds : (it.time_spent || 0))));
    const thresholdPercent = Math.min(95, Math.max(5, Math.round((45.0 / maxTime) * 100)));

    let evidenceChartBarsHtml = '';
    if (items.length === 0) {
        evidenceChartBarsHtml = `<div style="font-size: 12px; color: var(--text-muted); padding: 8px 0; font-family: var(--font-ui);">Chưa có dữ liệu thời gian chi tiết từng câu cho phiên này.</div>`;
    } else {
        evidenceChartBarsHtml = items.map((item, idx) => {
            const qIndex = item.index || (idx + 1);
            const isCorrect = !!item.is_correct;
            const rawTime = item.time_spent_seconds !== undefined ? item.time_spent_seconds : (item.time_spent !== undefined ? item.time_spent : 0);
            const timeVal = Number(rawTime);
            const barWidthPct = Math.min(100, Math.max(3, Math.round((timeVal / maxTime) * 100)));
            const barColor = isCorrect ? 'var(--success-base, #30a46c)' : 'var(--danger-base, #e5484d)';
            const icon = isCorrect ? '✓' : '✕';
            const tagStr = (item.tags && item.tags.length > 0) ? item.tags[0] : (item.tag || (isCorrect ? 'Chính xác' : 'Bẫy phương án'));
            
            return `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-family: var(--font-ui);">
                    <div style="width: 58px; flex-shrink: 0; font-weight: 700; color: ${barColor}; display: flex; align-items: center; gap: 4px;">
                        <span>${icon}</span> Câu ${qIndex}
                    </div>
                    <div style="flex: 1; height: 16px; background: var(--bg-base); border: 1px solid var(--border-strong); position: relative; overflow: hidden;">
                        <div style="height: 100%; width: ${barWidthPct}%; background: ${barColor}; opacity: 0.85; transition: width 0.3s ease;"></div>
                        <div style="position: absolute; left: ${thresholdPercent}%; top: 0; bottom: 0; width: 1.5px; background: var(--text-muted); opacity: 0.65;" title="Ngưỡng chuẩn đọc hiểu: 45.0s"></div>
                    </div>
                    <div style="width: 44px; text-align: right; font-weight: 600; color: var(--text-main); font-size: 11px;">
                        ${timeVal.toFixed(1)}s
                    </div>
                    <div style="width: 100px; font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${tagStr}">
                        ${tagStr}
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <style>
            .mentor-speech-bubble {
                position: relative;
                background: #ffffff;
                border: 1px solid var(--border-strong, #cbd5e1);
                padding: 16px 20px;
                border-radius: 0px;
                margin-bottom: 12px;
            }
            :root.dark .mentor-speech-bubble,
            :root.dark-theme .mentor-speech-bubble,
            body.dark-theme .mentor-speech-bubble,
            body.dark .mentor-speech-bubble {
                background: #212328;
                border-color: #51585f;
            }
            .mentor-speech-bubble-arrow {
                position: absolute;
                left: -7px;
                top: 20px;
                width: 12px;
                height: 12px;
                background: #ffffff;
                border-left: 1px solid var(--border-strong, #cbd5e1);
                border-bottom: 1px solid var(--border-strong, #cbd5e1);
                transform: rotate(45deg);
            }
            :root.dark .mentor-speech-bubble-arrow,
            :root.dark-theme .mentor-speech-bubble-arrow,
            body.dark-theme .mentor-speech-bubble-arrow,
            body.dark .mentor-speech-bubble-arrow {
                background: #212328;
                border-left-color: #51585f;
                border-bottom-color: #51585f;
            }
            .mentor-insight-box {
                padding: 10px 14px;
                background: #f8f9fb;
                border: 1px solid var(--border-strong, #cbd5e1);
                border-radius: 0px;
                font-family: var(--font-ui);
                font-size: 12.5px;
                line-height: 1.55;
                margin-bottom: 8px;
            }
            :root.dark .mentor-insight-box,
            :root.dark-theme .mentor-insight-box,
            body.dark-theme .mentor-insight-box,
            body.dark .mentor-insight-box {
                background: #1d1f23;
                border-color: #3b3e44;
            }
        </style>
        <div id="timeline-mentor-card" style="margin-bottom: 24px; border: 1px solid var(--border-strong); background: var(--bg-card); padding: 20px 24px; border-radius: 0px; position: relative; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-strong); padding-bottom: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 700; font-size: 14.5px; font-family: var(--font-ui); color: var(--text-main); letter-spacing: 0.2px;">
                        Nori · Bạn đồng hành
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="btn-mentor-sim-trigger" onclick="window.VectoriaPersonaSimulator && window.VectoriaPersonaSimulator.openPanel()" style="display: none; background: transparent; border: 1px solid var(--border-strong); padding: 4px 10px; font-size: 11.5px; cursor: pointer; color: var(--text-muted); font-family: var(--font-ui); align-items: center; gap: 5px;">
                        <i class="ph ph-robot"></i> Mô phỏng Persona
                    </button>
                    <button onclick="dismissMentorDialogue()" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1;" title="Đóng">✕</button>
                </div>
            </div>

            <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
                <div style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div id="mentor-avatar-container" style="width: 88px; height: 88px; display: flex; align-items: center; justify-content: center;">
                        ${svgAvatar}
                    </div>
                    ${scoreText ? `<span style="font-size: 12px; font-weight: 700; color: ${moodColor}; font-family: var(--font-ui);">${scoreText}</span>` : ''}
                </div>

                <div style="flex: 1; min-width: 280px;">
                    <!-- 2-in-1 Mode Switch Bar (Clean icon-only buttons) -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-strong); padding-bottom: 8px;">
                        <div style="display: inline-flex; gap: 2px; background: var(--bg-hover, var(--slate-3)); padding: 2px; border: 1px solid var(--border-strong);">
                            <button id="btn-tab-mentor-speech" onclick="switchMentorCardView('speech')" title="Nhận xét" style="background: var(--bg-card); border: 1px solid var(--border-strong); padding: 6px 14px; font-size: 16px; color: var(--text-main); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
                                <i class="ph ph-chat-teardrop-text"></i>
                            </button>
                            <button id="btn-tab-mentor-evidence" onclick="switchMentorCardView('evidence')" title="Thời gian" style="background: transparent; border: 1px solid transparent; padding: 6px 14px; font-size: 16px; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
                                <i class="ph ph-chart-bar"></i>
                            </button>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button id="btn-skip-typewriter" onclick="skipMentorTypewriter()" style="display: none; background: transparent; border: 1px solid var(--border-strong); font-size: 11px; padding: 2px 8px; cursor: pointer; color: var(--text-muted); font-family: var(--font-ui);">
                                Hiện hết
                            </button>
                        </div>
                    </div>

                    <!-- VIEW 1: Speech Bubble View (High Contrast in both Light & Dark themes) -->
                    <div id="mentor-view-speech-container" style="display: block;">
                        <div class="mentor-speech-bubble">
                            <div class="mentor-speech-bubble-arrow"></div>
                            
                            <div id="mentor-bubble-text" style="font-family: var(--font-ui); font-size: 14px; line-height: 1.75; color: var(--text-main); text-align: justify;">
                                ${session.speechText}
                            </div>

                            ${(session.avatarMood === 'puzzled' || session.emotionState === 'PUZZLED_SPEED') ? `
                            <div id="mentor-clarification-box" style="margin-top: 14px; border: 1px solid #d97706; background: rgba(217, 119, 6, 0.04); padding: 12px 16px;">
                                <div style="font-size: 12px; font-weight: 700; color: #d97706; margin-bottom: 8px; font-family: var(--font-ui); display: flex; align-items: center; gap: 6px;">
                                    <i class="ph ph-chat-circle-dots"></i> Bạn đã giải bài bằng cách nào?
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                    <button onclick="submitStudentClarification('MENTAL_CALCULATION')" style="background: var(--bg-card); border: 1px solid var(--border-strong); padding: 5px 12px; font-size: 12px; cursor: pointer; color: var(--text-main); font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 5px;">
                                        <i class="ph ph-lightning"></i> Tính nhẩm nhanh
                                    </button>
                                    <button onclick="submitStudentClarification('FAMILIAR_QUESTION')" style="background: var(--bg-card); border: 1px solid var(--border-strong); padding: 5px 12px; font-size: 12px; cursor: pointer; color: var(--text-main); font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 5px;">
                                        <i class="ph ph-brain"></i> Đã nhớ dạng
                                    </button>
                                    <button onclick="submitStudentClarification('INTUITION_LUCK')" style="background: var(--bg-card); border: 1px solid var(--border-strong); padding: 5px 12px; font-size: 12px; cursor: pointer; color: var(--text-main); font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 5px;">
                                        <i class="ph ph-shuffle"></i> Đoán trực giác
                                    </button>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        ${session.summaryReason ? `
                        <div class="mentor-insight-box" style="border-left: 3px solid ${moodColor};">
                            <span style="font-weight: 700; color: ${moodColor};">Nhận xét:</span> <span style="color: var(--text-main);">${session.summaryReason}</span>
                        </div>
                        ` : ''}

                        ${session.suggestedAction ? `
                        <div class="mentor-insight-box" style="border-left: 3px solid var(--border-strong);">
                            <span style="font-weight: 700; color: var(--text-main);">Gợi ý:</span> <span style="color: var(--text-muted);">${session.suggestedAction}</span>
                        </div>
                        ` : ''}
                    </div>

                    <!-- VIEW 2: Evidence & Telemetry View -->
                    <div id="mentor-view-evidence-container" style="display: none;">
                        <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 12px 14px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                                <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-main); font-family: var(--font-ui);">
                                    Thời gian làm bài từng câu
                                </span>
                                <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted); font-family: var(--font-ui);">
                                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; background: var(--success-base, #30a46c); display: inline-block;"></span> Đúng</span>
                                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; background: var(--danger-base, #e5484d); display: inline-block;"></span> Bẫy / Sai</span>
                                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 2px; height: 10px; background: var(--text-muted); display: inline-block;"></span> Chuẩn 45.0s</span>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                                ${evidenceChartBarsHtml}
                            </div>
                        </div>

                        <!-- Pacing Metric Gauge -->
                        <div style="border: 1px solid var(--border-strong); background: var(--bg-hover, var(--slate-3)); padding: 10px 14px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 11.5px;">
                                <span style="font-weight: 700; color: var(--text-main); font-family: var(--font-ui);">Thước đo Nhịp độ Tiếp nhận Đề bài (Pacing Benchmark)</span>
                                <span style="font-weight: 600; color: ${gaugeColor}; font-family: var(--font-ui);">${gaugeBadge}</span>
                            </div>
                            <div style="height: 6px; width: 100%; background: var(--border-strong, #e5e5e5); position: relative; margin-bottom: 6px;">
                                <div style="height: 100%; width: ${gaugePercent}%; background: ${gaugeColor}; transition: width 0.3s ease;"></div>
                                <div style="position: absolute; left: ${thresholdPercent}%; top: -3px; width: 2px; height: 12px; background: var(--text-muted); opacity: 0.8;" title="Ngưỡng chuẩn đọc hiểu (45.0s / câu)"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); font-family: var(--font-ui);">
                                <span>${pacingDetailText}</span>
                                <span>Ngưỡng chuẩn: 45.0s / câu</span>
                            </div>
                        </div>

                        <!-- Quantitative Metrics Row -->
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 5px 10px; font-size: 11.5px; font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 5px;">
                                <i class="ph ph-clock" style="color: var(--primary-base);"></i>
                                <span>Tổng thời gian: <strong>${totalTimeSec.toFixed(1)}s</strong></span>
                            </div>
                            <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 5px 10px; font-size: 11.5px; font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 5px;">
                                <i class="ph ph-shuffle" style="color: #d97706;"></i>
                                <span>Đổi tab: <strong>${switchCount} lần</strong></span>
                            </div>
                            ${rapidDetected ? `
                            <div style="border: 1px solid var(--danger-base, #e5484d); background: rgba(229, 72, 77, 0.06); padding: 5px 10px; font-size: 11.5px; font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 5px; color: var(--danger-base, #e5484d);">
                                <i class="ph ph-warning-circle"></i>
                                <span>Cảnh báo thao tác siêu tốc</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; border-top: 1px solid var(--border-strong); padding-top: 12px;">
                <button onclick="dismissMentorDialogue()" style="border-radius: 0px; padding: 5px 16px; font-family: var(--font-ui); font-size: 13px; background: transparent; border: 1px solid var(--border-strong); color: var(--text-main); cursor: pointer;">
                    Đã ghi nhận
                </button>
            </div>
        </div>
    `;
}
window.getLatestMentorSession = getLatestMentorSession;
window.renderMentorCardHTML = renderMentorCardHTML;
window.renderMentorAvatarHTML = renderMentorAvatarHTML;

window.switchMentorCardView = function(viewName) {
    const speechView = document.getElementById('mentor-view-speech-container');
    const evidenceView = document.getElementById('mentor-view-evidence-container');
    const btnSpeech = document.getElementById('btn-tab-mentor-speech');
    const btnEvidence = document.getElementById('btn-tab-mentor-evidence');

    if (!speechView || !evidenceView) return;

    if (viewName === 'evidence') {
        speechView.style.display = 'none';
        evidenceView.style.display = 'block';

        if (btnSpeech) {
            btnSpeech.style.background = 'transparent';
            btnSpeech.style.borderColor = 'transparent';
            btnSpeech.style.color = 'var(--text-muted)';
            btnSpeech.style.fontWeight = '600';
        }
        if (btnEvidence) {
            btnEvidence.style.background = 'var(--bg-card)';
            btnEvidence.style.borderColor = 'var(--border-strong)';
            btnEvidence.style.color = 'var(--text-main)';
            btnEvidence.style.fontWeight = '700';
        }
    } else {
        speechView.style.display = 'block';
        evidenceView.style.display = 'none';

        if (btnSpeech) {
            btnSpeech.style.background = 'var(--bg-card)';
            btnSpeech.style.borderColor = 'var(--border-strong)';
            btnSpeech.style.color = 'var(--text-main)';
            btnSpeech.style.fontWeight = '700';
        }
        if (btnEvidence) {
            btnEvidence.style.background = 'transparent';
            btnEvidence.style.borderColor = 'transparent';
            btnEvidence.style.color = 'var(--text-muted)';
            btnEvidence.style.fontWeight = '600';
        }
    }
};

window.submitStudentClarification = function(claimType) {
    const box = document.getElementById('mentor-clarification-box');
    const bubbleText = document.getElementById('mentor-bubble-text');
    if (box) {
        box.innerHTML = `
            <div style="font-size: 12px; color: var(--success-base, #30a46c); font-weight: 600; display: flex; align-items: center; gap: 6px; font-family: var(--font-ui);">
                <i class="ph ph-check-circle" style="font-size: 14px;"></i>
                Đã ghi nhận phản hồi của bạn.
            </div>
        `;
    }
    if (bubbleText) {
        bubbleText.innerHTML += `<br><br><span style="color: var(--text-muted); font-size: 13px; font-style: italic;">[Đã ghi nhận phương pháp làm bài.]</span>`;
    }
    try {
        const raw = sessionStorage.getItem('latest_mentor_session');
        if (raw) {
            const data = JSON.parse(raw);
            data.student_claim = claimType;
            sessionStorage.setItem('latest_mentor_session', JSON.stringify(data));
        }
    } catch(e) {}
};

function getUserFullName() {
    var userStr = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
    if (userStr) {
        try {
            var u = JSON.parse(userStr);
            if (u.full_name) return u.full_name;
            if (u.username) return u.username;
        } catch(e) {}
    }
    var token = getAuthToken();
    if (token) {
        try {
            var parts = token.split('.');
            if (parts.length === 3) {
                var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                var dec = JSON.parse(atob(payload));
                if (dec && (dec.full_name || dec.name || dec.sub || dec.username)) {
                    return dec.full_name || dec.name || dec.sub || dec.username;
                }
            }
        } catch(e) {}
    }
    return localStorage.getItem('user_name') || 'Người học Vectoria';
}

function renderAcademicHonorsShowcase(pathObj) {
    if (!pathObj) return '';
    const pathNodes = Array.isArray(pathObj.path_nodes) ? pathObj.path_nodes : [];
    const startNode = pathNodes.length > 0 ? pathNodes[0] : (pathObj.start_node_id || 'l1');
    const endNode = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : (pathObj.target_node_id || 'l3');
    const startData = getLessonData(startNode);
    const endData = getLessonData(endNode);
    const pathTitle = `${startData.title} ➔ ${endData.title}`;
    const studentName = getUserFullName();
    const dateStr = new Date().toLocaleDateString('vi-VN');

    const companionAvatar = renderMentorAvatarHTML('proud_3', false, '#30a46c');

    return `
        <div id="academic-honors-banner" style="margin-bottom: 24px; border: 1px solid var(--success-base, #30a46c); background: var(--bg-card); padding: 20px 24px; border-radius: 0px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid rgba(48, 164, 108, 0.2); padding-bottom: 12px;">
                <div>
                    <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--success-base, #30a46c); background: rgba(48, 164, 108, 0.08); border: 1px solid var(--success-base, #30a46c); padding: 2px 8px; margin-bottom: 6px;">
                        <i class="ph ph-check-circle" style="font-size: 13px;"></i> Hoàn thành lộ trình
                    </div>
                    <h2 style="margin: 0 0 4px 0; font-family: var(--font-ui); font-size: 1.25rem; font-weight: 700; color: var(--text-main);">
                        Đã hoàn thành toàn bộ bài học
                    </h2>
                    <p style="margin: 0; color: var(--text-muted); font-size: 13px; font-family: var(--font-ui); line-height: 1.5;">
                        Lộ trình: <strong>${pathTitle}</strong>
                    </p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 11.5px; font-family: monospace; color: var(--text-muted); border: 1px solid var(--border-strong); padding: 3px 8px; background: var(--bg-body);">
                        Ngày hoàn thành: ${dateStr}
                    </span>
                </div>
            </div>

            <div style="display: flex; gap: 16px; align-items: center; background: var(--bg-body); border: 1px solid var(--border-strong); padding: 14px 18px;">
                <div style="flex-shrink: 0; width: 48px; height: 48px;">
                    ${companionAvatar}
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; font-family: var(--font-ui);">
                        Nori
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-main); font-family: var(--font-ui);">
                        Chào ${studentName}, bạn đã hoàn thành các bài học và bài kiểm tra của lộ trình này.
                    </div>
                </div>
            </div>
        </div>
    `;
}

function morphCompanionAvatarMood(targetMood, isTalking = true) {
    if (!targetMood) return;
    const info = getMoodColorAndLabel(targetMood);
    const container = document.getElementById('mentor-avatar-container');
    if (container) {
        container.innerHTML = renderMentorAvatarHTML(targetMood, isTalking, info.col);
        if (window._noriLivingIdleEngine) {
            window._noriLivingIdleEngine.setTalking(isTalking);
        }
    }
}
window.morphCompanionAvatarMood = morphCompanionAvatarMood;

function startTypewriterEffect(fullText, emotionProgression = []) {
    if (!fullText) return;
    if (_typewriterTimer) {
        clearInterval(_typewriterTimer);
        _typewriterTimer = null;
    }
    _currentFullSpeech = fullText;
    const textEl = document.getElementById('mentor-bubble-text');
    const skipBtn = document.getElementById('btn-skip-typewriter');
    const waveEl = document.getElementById('vectoria-avatar-voice-waves');
    
    if (!textEl) return;
    
    if (window._noriLivingIdleEngine) {
        window._noriLivingIdleEngine.setTalking(true);
    }
    const mouthEl = document.getElementById('vectoria-companion-mouth');
    if (mouthEl) {
        mouthEl.classList.add('is-talking');
    }
    if (waveEl) {
        waveEl.style.display = 'flex';
    }
    if (skipBtn) {
        skipBtn.style.display = 'inline-block';
    }

    const words = fullText.split(' ');
    let currentIdx = 0;
    textEl.textContent = '';

    const moods = Array.isArray(emotionProgression) && emotionProgression.length > 0 
        ? emotionProgression 
        : ['thoughtful'];
    
    let sentenceIndex = 0;
    if (moods[0]) {
        morphCompanionAvatarMood(moods[0], true);
    }

    _typewriterTimer = setInterval(() => {
        if (currentIdx < words.length) {
            const word = words[currentIdx];
            textEl.textContent += (currentIdx === 0 ? '' : ' ') + word;
            
            // Check if word ends with sentence terminator (. ! ?)
            if (/[.!?]$/.test(word) && currentIdx < words.length - 1) {
                sentenceIndex++;
                const nextMood = moods[Math.min(sentenceIndex, moods.length - 1)];
                if (nextMood) {
                    morphCompanionAvatarMood(nextMood, true);
                }
            }
            currentIdx++;
        } else {
            const finalMood = moods[Math.min(sentenceIndex, moods.length - 1)] || moods[moods.length - 1];
            stopMentorTypewriter(finalMood);
        }
    }, 28);
}

function stopMentorTypewriter(finalMood = '') {
    if (_typewriterTimer) {
        clearInterval(_typewriterTimer);
        _typewriterTimer = null;
    }
    const textEl = document.getElementById('mentor-bubble-text');
    const skipBtn = document.getElementById('btn-skip-typewriter');
    const waveEl = document.getElementById('vectoria-avatar-voice-waves');
    const mouthEl = document.getElementById('vectoria-companion-mouth');
    
    if (textEl && _currentFullSpeech) {
        textEl.textContent = _currentFullSpeech;
    }
    if (mouthEl) {
        mouthEl.classList.remove('is-talking');
    }
    if (waveEl) {
        waveEl.style.display = 'none';
    }
    if (skipBtn) {
        skipBtn.style.display = 'none';
    }
    if (finalMood) {
        morphCompanionAvatarMood(finalMood, false);
    }
    if (window._noriLivingIdleEngine) {
        window._noriLivingIdleEngine.setTalking(false, finalMood || 'neutral_2');
        window._noriLivingIdleEngine.start();
    }
    if (window._noriLivingIdleEngine) {
        window._noriLivingIdleEngine.setTalking(false);
        window._noriLivingIdleEngine.start();
    }
}
window.skipMentorTypewriter = stopMentorTypewriter;

function initMentorInteractions(session) {
    if (!session) return;
    if (typeof window !== 'undefined' && !window._noriLivingIdleEngine) {
        window._noriLivingIdleEngine = new NoriLivingIdleEngine('#mentor-avatar-container', null, (decayMood) => {
            morphCompanionAvatarMood(decayMood, false);
        });
        window._noriLivingIdleEngine.start();
    }
    if (typeof window !== 'undefined' && !window._noriLivingIdleEngine) {
        window._noriLivingIdleEngine = new NoriLivingIdleEngine('#mentor-avatar-container');
        window._noriLivingIdleEngine.start();
    }
    
    // Start typewriter effect smoothly with dynamic emotion morphing
    setTimeout(() => {
        startTypewriterEffect(session.speechText, session.emotionProgression);
    }, 60);
    
    // If LLM status is pending, poll for async LLM completion
    if (session.llmStatus === 'pending' && session.quizId) {
        pollQuizMetadata(session.quizId);
    }
}
window.initMentorInteractions = initMentorInteractions;
window.startTypewriterEffect = startTypewriterEffect;

function pollQuizMetadata(quizId) {
    if (!quizId) return;
    if (_mentorPollTimer) {
        clearInterval(_mentorPollTimer);
        _mentorPollTimer = null;
    }
    
    let attempts = 0;
    const maxAttempts = 8;
    const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
    
    _mentorPollTimer = setInterval(() => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(_mentorPollTimer);
            _mentorPollTimer = null;
            return;
        }
        
        const token = getAuthToken();
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        
        fetch(`${API}/api/quiz/${quizId}/metadata`, { headers: headers })
            .then(res => res.json())
            .then(resData => {
                if (resData && resData.status === 'success' && resData.metadata) {
                    const meta = resData.metadata;
                    if (meta.llm_status === 'completed') {
                        clearInterval(_mentorPollTimer);
                        _mentorPollTimer = null;
                        
                        // Update storage
                        try {
                            const raw = sessionStorage.getItem('latest_mentor_session');
                            let currentData = raw ? JSON.parse(raw) : {};
                            const updatedData = Object.assign({}, currentData, meta, {
                                llm_status: 'completed',
                                timestamp: Date.now()
                            });
                            sessionStorage.setItem('latest_mentor_session', JSON.stringify(updatedData));
                        } catch (e) {}
                        
                        // Update UI smoothly
                        const speechText = meta.mentor_speech?.text || meta.mentor_speech?.mentor_speech || '';
                        const newMood = meta.mentor_speech?.avatar_mood || meta.tone_emotion || 'thoughtful';
                        const newProgression = meta.mentor_speech?.emotion_progression || [newMood];

                        if (speechText) {
                            startTypewriterEffect(speechText, newProgression);
                        } else {
                            morphCompanionAvatarMood(newMood, false);
                        }
                        
                        const gapEl = document.getElementById('mentor-core-gap');
                        const summaryReason = meta.mentor_speech?.summary_reason || meta.core_gap;
                        if (gapEl && summaryReason) {
                            gapEl.innerHTML = `<strong style="color: var(--primary-base);">Lỗ hổng cốt lõi:</strong> ${summaryReason}`;
                        }
                        
                        const actionEl = document.getElementById('mentor-suggested-action');
                        const suggestedAction = meta.mentor_speech?.suggested_action || meta.actionable_direction;
                        if (actionEl && suggestedAction) {
                            actionEl.innerHTML = `<strong style="color: var(--text-main);">Định hướng trọng tâm:</strong> ${suggestedAction}`;
                        }
                    }
                }
            })
            .catch(err => {
                console.warn("Poll metadata error:", err);
            });
    }, 1800);
}

function fetchAndRenderPaths(forceCatalog = false) {
    const emptyState = document.getElementById('lp-empty-state');
    const activeState = document.getElementById('lp-active-state');
    const container = document.getElementById('vertical-timeline-container');
    
    // Hide existing states and show loading
    if (emptyState) emptyState.style.display = 'none';
    if (activeState) activeState.style.display = 'block';
    if (container) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-muted); font-family: var(--font-ui);">
                <div style="font-size: 14px; letter-spacing: 0.5px;">Đang đồng bộ dữ liệu...</div>
            </div>
        `;
    }

    const token = getAuthToken();
    const userId = getUserId();
    if (!token && !userId) {
        showEmptyState();
        return;
    }
    const API = (window.App && window.App.API_BASE) || 
                (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:5000' : 'https://visualization-rr5v.onrender.com');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    fetchRealCourseMetadata().finally(() => {
        fetch(`${API}/api/path/list${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`, { headers: headers })
            .then(res => res.json())
            .then(data => {
                if (data.paths && data.paths.length > 0) {
                    window._cachedPaths = window._cachedPaths || {};
                    data.paths.forEach(p => { window._cachedPaths[p.path_id] = p; });

                    const urlParams = (typeof URLSearchParams !== 'undefined' && window.location.search) ? new URLSearchParams(window.location.search) : null;
                    const requestedPathId = urlParams ? urlParams.get('path_id') : null;
                    const shouldOpenDetail = !forceCatalog && requestedPathId && data.paths.some(p => p.path_id === requestedPathId);

                    if (shouldOpenDetail) {
                        const targetPath = data.paths.find(p => p.path_id === requestedPathId);
                        openPathDetail(targetPath);
                    } else {
                        renderPathList(data.paths);
                    }
                } else {
                    showEmptyState();
                }
            })
            .catch(err => {
                console.error("DB Error:", err);
                showEmptyState();
            });
    });
}
window.fetchAndRenderPaths = fetchAndRenderPaths;
window.showPathCatalog = function() { fetchAndRenderPaths(true); };

function showEmptyState() {
    const emptyState = document.getElementById('lp-empty-state');
    const activeState = document.getElementById('lp-active-state');
    if (emptyState) emptyState.style.display = 'block';
    if (activeState) activeState.style.display = 'none';
}

function renderPathList(paths) {
    const emptyState = document.getElementById('lp-empty-state');
    const activeState = document.getElementById('lp-active-state');
    const container = document.getElementById('vertical-timeline-container');
    
    if (emptyState) emptyState.style.display = 'none';
    if (activeState) activeState.style.display = 'block';
    
    let html = '';
    const mentorSession = getLatestMentorSession();
    if (mentorSession) {
        html += renderMentorCardHTML(mentorSession);
    }

    window._cachedPaths = window._cachedPaths || {};
    const committedPathId = localStorage.getItem('committed_path_id');
    const radixBlue = 'var(--primary-base)';

    // Group paths into 3 clear categories
    let activePath = null;
    const pendingPaths = [];
    const completedPaths = [];

    paths.forEach(p => {
        if (typeof p.path_nodes === 'string') {
            try { p.path_nodes = JSON.parse(p.path_nodes); } catch(e) { p.path_nodes = []; }
        }
        if (!Array.isArray(p.path_nodes)) p.path_nodes = [];
        window._cachedPaths[p.path_id] = p;

        if (p.status === 'completed') {
            completedPaths.push(p);
        } else if (p.status === 'active' || p.path_id === committedPathId) {
            if (!activePath) {
                activePath = p;
            } else {
                pendingPaths.push(p);
            }
        } else {
            pendingPaths.push(p);
        }
    });

    // 1. ACTIVE PATH BLOCK
    if (activePath) {
        if (typeof window.updateHeaderCreatePathButton === 'function') {
            window.updateHeaderCreatePathButton(true);
        }
        const startNode = activePath.path_nodes.length > 0 ? activePath.path_nodes[0] : (activePath.start_node_id || 'l1');
        const endNode = activePath.path_nodes.length > 0 ? activePath.path_nodes[activePath.path_nodes.length - 1] : (activePath.target_node_id || 'l3');
        const startData = getLessonData(startNode);
        const endData = getLessonData(endNode);
        const dateStr = activePath.created_at ? new Date(activePath.created_at).toLocaleDateString('vi-VN') : '';
        const progress = JSON.parse(localStorage.getItem('path_progress_' + activePath.path_id) || '{"nodeIndex": 0, "taskLevel": 0}');
        const completedNodes = Math.min(activePath.path_nodes.length, progress.nodeIndex);
        const pct = activePath.path_nodes.length > 0 ? Math.round((completedNodes / activePath.path_nodes.length) * 100) : 0;

        html += `
            <div style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${radixBlue}; background: rgba(62, 99, 221, 0.08); border: 1px solid ${radixBlue}; padding: 2px 8px; border-radius: 0px;">
                        Đang học
                    </span>
                </div>
                <div style="border: 1px solid ${radixBlue}; background: var(--bg-card); padding: 20px 22px; border-radius: 0px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 700; color: var(--text-main); font-family: var(--font-ui);">
                                Lộ trình: ${startData.title} ➔ ${endData.title}
                            </h3>
                            <div style="font-size: 13px; color: var(--text-muted); display: flex; gap: 16px; flex-wrap: wrap;">
                                <span>${activePath.path_nodes.length} bài học</span>
                                <span>Khởi tạo: ${dateStr}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <button onclick="openPathDetail('${activePath.path_id}')" style="padding: 6px 16px; border-radius: 0px; background: ${radixBlue}; color: #ffffff; border: 1px solid ${radixBlue}; font-size: 13px; font-weight: 600; cursor: pointer;">
                                Học tiếp
                            </button>
                            <button onclick="deletePath('${activePath.path_id}')" style="padding: 6px 12px; border-radius: 0px; background: transparent; color: var(--danger-base, #e5484d); border: 1px solid var(--danger-base, #e5484d); font-size: 13px; cursor: pointer;">
                                Xóa
                            </button>
                        </div>
                    </div>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-strong);">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
                            <span>Tiến độ hoàn thành</span>
                            <span style="font-weight: 700; color: ${radixBlue};">${pct}% (${completedNodes}/${activePath.path_nodes.length} bài học)</span>
                        </div>
                        <div style="height: 6px; width: 100%; background: var(--border-strong); overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: ${radixBlue}; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        if (typeof window.updateHeaderCreatePathButton === 'function') {
            window.updateHeaderCreatePathButton(false);
        }
        html += `
            <div style="margin-bottom: 24px; border: 1px dashed var(--border-strong); padding: 18px 20px; background: var(--bg-body, rgba(0,0,0,0.01)); border-radius: 0px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); margin-bottom: 2px;">Chưa có lộ trình nào đang học</div>
                    <div style="font-size: 13px; color: var(--text-muted);">Hãy chọn kích hoạt một lộ trình đã lưu bên dưới hoặc tạo lộ trình mới từ Đồ thị tri thức.</div>
                </div>
                <button onclick="if(typeof window.openGraphWithPathFinder === 'function'){ window.openGraphWithPathFinder(); } else { window.location.href='knowledge_info.html?type=graph&id=graph&open_pathfinder=1'; }" style="padding: 6px 14px; border-radius: 0px; border: 1px solid var(--border-strong); background: transparent; color: var(--text-main); font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="ph ph-plus"></i> Tạo lộ trình
                </button>
            </div>
        `;
    }

    // 2. PENDING / DRAFT PATHS BLOCK
    html += `
        <div style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted);">
                    Lộ trình đã lưu (${pendingPaths.length})
                </span>
            </div>
    `;
    if (pendingPaths.length > 0) {
        html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
        pendingPaths.forEach(p => {
            const startNode = p.path_nodes.length > 0 ? p.path_nodes[0] : (p.start_node_id || 'l1');
            const endNode = p.path_nodes.length > 0 ? p.path_nodes[p.path_nodes.length - 1] : (p.target_node_id || 'l3');
            const sData = getLessonData(startNode);
            const eData = getLessonData(endNode);
            const dStr = p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '';
            html += `
                <div style="border: 1px solid var(--border-strong); border-radius: 0px; padding: 14px 18px; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="font-weight: 700; font-family: var(--font-ui); font-size: 1rem; color: var(--text-main); margin-bottom: 3px;">
                            Lộ trình: ${sData.title} ➔ ${eData.title}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted);">
                            ${p.path_nodes.length} bài học · Ngày tạo: ${dStr}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="activateAndStartPath('${p.path_id}')" style="padding: 6px 14px; border-radius: 0px; background: transparent; color: var(--primary-base); border: 1px solid var(--primary-base); font-size: 12.5px; font-weight: 600; cursor: pointer;">
                            Bắt đầu
                        </button>
                        <button onclick="deletePath('${p.path_id}')" style="padding: 6px 10px; border-radius: 0px; background: transparent; color: var(--danger-base, #e5484d); border: 1px solid var(--danger-base, #e5484d); font-size: 12.5px; cursor: pointer;">
                            Xóa
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `<div style="font-size: 13px; color: var(--text-muted); padding: 14px 18px; border: 1px dashed var(--border-strong);">Không có lộ trình nào đang lưu.</div>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    if (mentorSession) {
        initMentorInteractions(mentorSession);
    }
}

window.activateAndStartPath = function(pathId) {
    const token = getAuthToken();
    const userId = getUserId();
    const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    localStorage.setItem('committed_path_id', pathId);
    if (!localStorage.getItem('path_progress_' + pathId)) {
        localStorage.setItem('path_progress_' + pathId, JSON.stringify({ nodeIndex: 0, taskLevel: 0 }));
    }
    
    fetch(`${API}/api/path/status`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ user_id: userId, path_id: pathId, status: 'active' })
    }).finally(() => {
        if (typeof renderLearningPathWorkspace === 'function') {
            var cnt = document.getElementById('dd-content');
            if (cnt) renderLearningPathWorkspace(cnt);
            else window.location.href = 'knowledge_info.html?view=path&path_id=' + encodeURIComponent(pathId);
        } else {
            window.location.href = 'knowledge_info.html?view=path&path_id=' + encodeURIComponent(pathId);
        }
    });
};

window.deactivatePath = function(pathId) {
    if (!confirm('Bạn có chắc muốn tạm dừng lộ trình này? Tiến trình đã học vẫn được lưu giữ.')) return;
    
    localStorage.removeItem('committed_path_id');
    const token = getAuthToken();
    const userId = getUserId();
    const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    fetch(`${API}/api/path/status`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ user_id: userId, path_id: pathId, status: 'pending' })
    }).finally(() => {
        if (typeof renderLearningPathWorkspace === 'function') {
            var cnt = document.getElementById('dd-content');
            if (cnt) renderLearningPathWorkspace(cnt);
            else window.location.reload();
        } else {
            fetchAndRenderPaths();
        }
    });
};

window.restartPath = function(pathId) {
    if (!confirm('Bạn có muốn học lại lộ trình này từ đầu?')) return;
    localStorage.setItem('path_progress_' + pathId, JSON.stringify({ nodeIndex: 0, taskLevel: 0 }));
    activateAndStartPath(pathId);
};

window.promptExecutePath = function(pathId) {
    let modalHtml = `
        <div id="execute-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: var(--bg-card); padding: 28px 32px; border-radius: 0px; max-width: 500px; width: 92%; border: 1px solid var(--border-strong);">
                <h3 style="margin: 0; font-family: var(--font-ui); font-size: 1.35rem; font-weight: 700; color: var(--text-main); letter-spacing: 0.2px;">Xác nhận Thực hiện Lộ trình</h3>
                <div style="height: 1px; background: var(--border-strong); margin: 14px 0 16px 0;"></div>
                <p style="font-family: var(--font-ui); color: var(--text-main); line-height: 1.7; margin: 0 0 14px 0; font-size: 14px; text-align: justify;">
                    Tiến trình học tập sẽ được xác lập cố định vào chuỗi bài học của lộ trình này. Nhằm bảo toàn cấu trúc kiến thức tiên quyết và độ chính xác của các chỉ số đánh giá, hệ thống không cho phép chuyển đổi lộ trình trong quá trình thực hiện.
                </p>
                <p style="font-family: var(--font-ui); color: var(--text-muted); line-height: 1.6; margin: 0 0 20px 0; font-size: 13px; font-style: italic;">
                    Lưu ý: Hành động này sẽ được ghi nhận vào cơ sở dữ liệu và không thể hoàn tác.
                </p>
                <div style="height: 1px; background: var(--border-strong); margin: 0 0 18px 0;"></div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button style="border: 1px solid var(--border-strong); border-radius: 0px; background: transparent; color: var(--text-main); font-family: var(--font-ui); font-size: 13px; padding: 6px 16px; cursor: pointer;" onclick="document.getElementById('execute-modal').remove()">Đóng</button>
                    <button style="border: 1px solid var(--danger-base); border-radius: 0px; background: var(--danger-base); color: #ffffff; font-family: var(--font-ui); font-size: 13px; font-weight: 600; padding: 6px 18px; cursor: pointer;" onclick="confirmExecutePath('${pathId}')">Xác nhận thực hiện</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.confirmExecutePath = function(pathId) {
    localStorage.setItem('committed_path_id', pathId);
    if (!localStorage.getItem('path_progress_' + pathId)) {
        localStorage.setItem('path_progress_' + pathId, JSON.stringify({ nodeIndex: 0, taskLevel: 0 }));
    }
    const modal = document.getElementById('execute-modal');
    if (modal) modal.remove();
    if (window._currentPathObj && window._currentPathObj.path_id === pathId) {
        openPathDetail(window._currentPathObj);
    } else {
        fetchAndRenderPaths();
    }
}

window.submitTheory = function(pathId, nodeIdx) {
    const progress = { nodeIndex: nodeIdx, taskLevel: 1 };
    localStorage.setItem('path_progress_' + pathId, JSON.stringify(progress));

    const p = window._currentPathObj;
    const nId = (p && p.path_nodes && p.path_nodes[nodeIdx]) || ('l' + (nodeIdx + 1));
    const token = getAuthToken();
    const userId = getUserId();
    const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(`${API}/api/path/save`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            user_id: userId,
            node_id: nId,
            task_type: 'theory',
            progress_data: {
                status: 'completed',
                path_id: pathId,
                completed_at: new Date().toISOString()
            }
        })
    }).catch(err => console.warn('Could not sync theory task to user_tasks:', err));

    if (window._currentPathObj) {
        openPathDetail(window._currentPathObj);
    }
};

window.submitPractice = function(pathId, nodeIdx) {
    const p = window._currentPathObj;
    const nextIdx = nodeIdx + 1;
    const progress = { nodeIndex: nextIdx, taskLevel: 0 };
    localStorage.setItem('path_progress_' + pathId, JSON.stringify(progress));

    const nId = (p && p.path_nodes && p.path_nodes[nodeIdx]) || ('l' + (nodeIdx + 1));
    const token = getAuthToken();
    const userId = getUserId();
    const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(`${API}/api/path/save`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            user_id: userId,
            node_id: nId,
            task_type: 'practice',
            progress_data: {
                status: 'completed',
                path_id: pathId,
                completed_at: new Date().toISOString()
            }
        })
    }).catch(err => console.warn('Could not sync practice task to user_tasks:', err));

    if (p) {
        openPathDetail(p);
    }
};

window.openPathDetail = function(pathObjOrId, containerOverrideId) {
    let pathObj = pathObjOrId;
    if (typeof pathObjOrId === 'string') {
        pathObj = (window._cachedPaths && window._cachedPaths[pathObjOrId]) || window._currentPathObj;
    }
    if (!pathObj) return;

    if (Object.keys(_realLessonsMap).length === 0) {
        fetchRealCourseMetadata().finally(() => {
            window.openPathDetail(pathObj, containerOverrideId);
        });
        return;
    }
    if (typeof pathObj.path_nodes === 'string') {
        try { pathObj.path_nodes = JSON.parse(pathObj.path_nodes); } catch(e) { pathObj.path_nodes = []; }
    }
    if (!Array.isArray(pathObj.path_nodes)) pathObj.path_nodes = [];
    window._currentPathObj = pathObj;
    const pathNodes = pathObj.path_nodes;
    const pathId = pathObj.path_id;
    const committedPathId = localStorage.getItem('committed_path_id');
    const isCommitted = committedPathId === pathId || pathObj.status === 'active';
    
    const container = (containerOverrideId && document.getElementById(containerOverrideId)) ||
                      document.getElementById('learning-path-workspace-container') ||
                      document.getElementById('vertical-timeline-container');
    if (!container) return;
    const radixBlue = 'var(--primary-base)';
    
    if (!window._pathTasksSyncing && !pathObj._syncedFromServer) {
        const token = getAuthToken();
        const API = window.App?.API_BASE || 'http://127.0.0.1:5000';
        if (token) {
            window._pathTasksSyncing = true;
            fetch(`${API}/api/path/tasks?path_id=${pathId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(r => r.json())
            .then(res => {
                window._pathTasksSyncing = false;
                pathObj._syncedFromServer = true;
                if (res && Array.isArray(res.tasks) && res.tasks.length > 0) {
                    const taskMap = {};
                    res.tasks.forEach(t => {
                        const k = `${t.node_id}_${t.task_type}`;
                        taskMap[k] = t.progress_data;
                    });
                    
                    let sNodeIdx = 0;
                    let sTaskLvl = 0;
                    for (let i = 0; i < pathNodes.length; i++) {
                        const n = pathNodes[i];
                        const th = taskMap[`${n}_theory`];
                        const pr = taskMap[`${n}_practice`];
                        const prPassed = pr && (pr.passed === true || pr.status === 'completed' || pr.score >= 5.0);
                        const thDone = th && (th.status === 'completed');
                        
                        if (thDone && prPassed) {
                            sNodeIdx = i + 1;
                            sTaskLvl = 0;
                        } else if (thDone) {
                            sNodeIdx = i;
                            sTaskLvl = 1;
                            break;
                        } else {
                            sNodeIdx = i;
                            sTaskLvl = 0;
                            break;
                        }
                    }
                    const curP = JSON.parse(localStorage.getItem('path_progress_' + pathId) || '{"nodeIndex":0,"taskLevel":0}');
                    if (sNodeIdx > curP.nodeIndex || (sNodeIdx === curP.nodeIndex && sTaskLvl > curP.taskLevel)) {
                        localStorage.setItem('path_progress_' + pathId, JSON.stringify({ nodeIndex: sNodeIdx, taskLevel: sTaskLvl }));
                    }
                }
                window.openPathDetail(pathObj, containerOverrideId);
            })
            .catch(() => {
                window._pathTasksSyncing = false;
                pathObj._syncedFromServer = true;
            });
            return;
        }
    }

    const savedProgress = JSON.parse(localStorage.getItem('path_progress_' + pathId) || '{"nodeIndex": 0, "taskLevel": 0}');
    const activeNodeIdx = savedProgress.nodeIndex;
    const activeTaskLvl = savedProgress.taskLevel;

    const isInsideKnowledgeInfo = window.location.pathname.includes('knowledge_info') || (typeof window.navigateTo === 'function');

    if (typeof window.updateHeaderCreatePathButton === 'function') {
        window.updateHeaderCreatePathButton(false);
    }

    let backBtnHtml = isInsideKnowledgeInfo 
        ? `<button style="border-radius: 0px; padding: 5px 14px; font-family: var(--font-ui); font-size: 13px; background: transparent; border: 1px solid var(--border-strong); color: var(--text-main); cursor: pointer;" onclick="typeof window.showPathCatalogInWorkspace === 'function' ? window.showPathCatalogInWorkspace() : navigateTo('root', 'root', 'Thư viện', null)">← Danh sách lộ trình</button>`
        : `<button style="border-radius: 0px; padding: 5px 14px; font-family: var(--font-ui); font-size: 13px; background: transparent; border: 1px solid var(--border-strong); color: var(--text-main); cursor: pointer;" onclick="window.showPathCatalog ? window.showPathCatalog() : fetchAndRenderPaths(true)">← Danh sách lộ trình</button>`;

    let deleteBtnHtml = `<button style="border-radius: 0px; padding: 5px 12px; font-family: var(--font-ui); font-size: 13px; background: transparent; border: 1px solid var(--danger-base, #e5484d); color: var(--danger-base, #e5484d); cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" onclick="deletePath('${pathId}')"><i class="ph ph-trash"></i> Xóa</button>`;

    let rightNavHtml = `<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
             ${deleteBtnHtml}
             ${!isCommitted ? `<button style="border-radius: 0px; padding: 6px 16px; font-family: var(--font-ui); background: ${radixBlue}; color: #ffffff; border: 1px solid ${radixBlue}; font-size: 13px; font-weight: 600; cursor: pointer;" onclick="promptExecutePath('${pathId}')">Bắt đầu học</button>` : `<span style="font-weight: 600; color: ${radixBlue}; font-family: var(--font-ui); font-size: 13px;">Đang học</span>`}
           </div>`;

    let html = `
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            ${backBtnHtml}
            ${rightNavHtml}
        </div>
    `;
    
    const mentorSession = getLatestMentorSession();
    if (mentorSession) {
        html += renderMentorCardHTML(mentorSession);
    }
    
    const isCompleted = pathObj.status === 'completed' || (activeNodeIdx >= pathNodes.length && pathNodes.length > 0);
    if (isCompleted) {
        html += renderAcademicHonorsShowcase(pathObj);
    }
    
    html += `<div id="svg-timeline-wrapper" data-path-id="${pathId}" style="position: relative; margin-left: 20px;">`;

    for (let i = 0; i < pathNodes.length; i++) {
        let nId = pathNodes[i];
        let data = getLessonData(nId);
        let lessonNum = i + 1;
        
        let isPast = isCommitted && (i < activeNodeIdx);
        let isActive = isCommitted && (i === activeNodeIdx);
        let isLocked = !isCommitted || (i > activeNodeIdx);
        let opacityStyle = isLocked ? 'opacity: 0.45; filter: grayscale(100%); pointer-events: none; user-select: none;' : '';
        
        // Task 1 configuration (Nhiệm vụ X.1: Nghiên cứu lý thuyết trọng tâm)
        let t1Border = 'border: 1px solid var(--border-strong);';
        let t1Actions = '';
        if (isPast || (isActive && activeTaskLvl >= 1)) {
            t1Border = `border: 1px solid ${radixBlue};`;
            t1Actions = `
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 12.5px; font-weight: 600; color: ${radixBlue}; font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 4px;">
                        <i class="ph ph-check-circle"></i> Đã hoàn thành
                    </span>
                    <button style="border-radius: 0px; font-size: 12px; font-family: var(--font-ui); padding: 4px 10px; background: transparent; color: var(--text-main); border: 1px solid var(--border-strong); cursor: pointer;" onclick="if(typeof window.openLessonFromTimeline === 'function'){ window.openLessonFromTimeline('${nId}'); } else { window.location.href='knowledge_info.html?id=${nId}&type=lesson'; }">Đọc lại</button>
                </div>
            `;
        } else if (isActive && activeTaskLvl === 0) {
            t1Border = `border: 1px solid ${radixBlue};`;
            t1Actions = `
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button style="border-radius: 0px; font-size: 13px; font-family: var(--font-ui); padding: 6px 14px; background: transparent; color: var(--text-main); border: 1px solid var(--border-strong); cursor: pointer;" onclick="if(typeof window.openLessonFromTimeline === 'function'){ window.openLessonFromTimeline('${nId}'); } else { window.location.href='knowledge_info.html?id=${nId}&type=lesson'; }">Đọc tài liệu</button>
                    <button style="border-radius: 0px; font-size: 13px; font-family: var(--font-ui); background: ${radixBlue}; color: #fff; border: 1px solid ${radixBlue}; padding: 6px 16px; cursor: pointer; font-weight: 600;" onclick="submitTheory('${pathId}', ${i})">Đã học xong</button>
                </div>
            `;
        } else {
            t1Actions = `<button style="border-radius: 0px; font-size: 13px; font-family: var(--font-ui); background: transparent; color: var(--text-muted); border: 1px solid var(--border-strong); cursor: not-allowed;" disabled>Đọc tài liệu</button>`;
        }

        // Task 2 configuration (Nhiệm vụ X.2: Luyện tập giải bài tập)
        let t2Border = 'border: 1px solid var(--border-strong);';
        let t2Actions = '';
        if (isPast) {
            t2Border = `border: 1px solid ${radixBlue};`;
            t2Actions = `
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 12.5px; font-weight: 600; color: ${radixBlue}; font-family: var(--font-ui); display: inline-flex; align-items: center; gap: 4px;">
                        <i class="ph ph-check-circle"></i> Đạt yêu cầu
                    </span>
                    <button style="border-radius: 0px; font-size: 12px; font-family: var(--font-ui); padding: 4px 10px; background: transparent; color: var(--text-main); border: 1px solid var(--border-strong); cursor: pointer;" onclick="if(typeof window.startPracticeFromTimeline === 'function'){ window.startPracticeFromTimeline('${pathId}', '${nId}', ${i}); } else { window.location.href='knowledge_info.html?practice_lesson_id=${nId}&path_id=${pathId}&node_idx=${i}'; }">Làm lại</button>
                </div>
            `;
        } else if (isActive && activeTaskLvl === 1) {
            t2Border = `border: 1px solid ${radixBlue};`;
            t2Actions = `
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button style="border-radius: 0px; font-size: 13px; font-family: var(--font-ui); background: ${radixBlue}; color: #fff; border: 1px solid ${radixBlue}; padding: 6px 18px; cursor: pointer; font-weight: 600;" onclick="if(typeof window.startPracticeFromTimeline === 'function'){ window.startPracticeFromTimeline('${pathId}', '${nId}', ${i}); } else { window.location.href='knowledge_info.html?practice_lesson_id=${nId}&path_id=${pathId}&node_idx=${i}'; }">Làm bài tập</button>
                </div>
            `;
        } else if (isActive && activeTaskLvl === 0) {
            t2Actions = `
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: var(--text-muted); font-family: var(--font-ui); font-style: italic;">Cần hoàn thành nhiệm vụ ${lessonNum}.1 trước</span>
                    <button style="border-radius: 0px; font-size: 13px; font-family: var(--font-ui); opacity: 0.5; background: transparent; color: var(--text-muted); border: 1px solid var(--border-strong); cursor: not-allowed;" disabled>Làm bài tập</button>
                </div>
            `;
        } else {
            t2Actions = `<button style="border-radius: 0px; font-size: 13px; font-family: var(--font-ui); background: transparent; color: var(--text-muted); border: 1px solid var(--border-strong); cursor: not-allowed;" disabled>Làm bài tập</button>`;
        }
        
        html += `
        <div class="tl-content-node" data-index="${i}" style="position: relative; padding-bottom: 44px; padding-left: 44px; ${opacityStyle}">
            
            <div class="tl-anchor-dot" style="position: absolute; left: 0; top: 8px; width: 1px; height: 1px; visibility: hidden;"></div>
            
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; font-family: var(--font-ui);">
                <span style="font-size: 12px; font-weight: 700; color: var(--text-main); background: var(--bg-body); border: 1px solid var(--border-strong); padding: 2px 8px; border-radius: 0px;">
                    Chủ đề: ${data.topicTitle}
                </span>
                <span style="font-size: 12.5px; color: var(--text-muted); font-weight: 500;">
                    Đề mục: ${data.sectionTitle}
                </span>
            </div>
            <h3 style="margin: 0 0 16px; color: var(--text-main); font-size: 1.25rem; font-weight: 700; font-family: var(--font-ui);">
                Bài ${lessonNum}: ${data.title}
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div class="tl-anchor-task1" style="position: relative; ${t1Border} border-radius: 0px; padding: 14px 18px; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; transition: border-color 0.2s ease;">
                    <div style="max-width: 65%;">
                        <div style="font-weight: 700; font-family: var(--font-ui); color: var(--text-main); font-size: 14px; margin-bottom: 3px;">
                            Nhiệm vụ ${lessonNum}.1: Nghiên cứu lý thuyết trọng tâm
                        </div>
                        <div style="font-size: 12.5px; color: var(--text-muted); font-family: var(--font-ui); line-height: 1.45;">
                            Nghiên cứu định nghĩa, các công thức toán học và ví dụ minh họa.
                        </div>
                    </div>
                    <div>${t1Actions}</div>
                </div>
                
                <div class="tl-anchor-task2" style="position: relative; ${t2Border} border-radius: 0px; padding: 14px 18px; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; transition: border-color 0.2s ease;">
                    <div style="max-width: 65%;">
                        <div style="font-weight: 700; font-family: var(--font-ui); color: var(--text-main); font-size: 14px; margin-bottom: 3px;">
                            Nhiệm vụ ${lessonNum}.2: Luyện tập giải bài tập
                        </div>
                        <div style="font-size: 12.5px; color: var(--text-muted); font-family: var(--font-ui); line-height: 1.45;">
                            Vận dụng kiến thức hoàn thành bộ câu hỏi trắc nghiệm rèn luyện năng lực.
                        </div>
                    </div>
                    <div>${t2Actions}</div>
                </div>
            </div>
        </div>
        `;
    }
    
    // Final Roadmap Evaluation Task
    let allLessonsCompleted = isCommitted && (activeNodeIdx >= pathNodes.length);
    let isPathCompleted = pathObj.status === 'completed' || (allLessonsCompleted && pathObj.status === 'completed');

    let capstoneBorder = 'border: 1px solid var(--border-strong);';
    let capstoneBg = 'background: var(--bg-card);';
    let capstoneBadge = `<span style="font-size: 11px; font-weight: 600; color: var(--text-muted); background: var(--bg-body); border: 1px solid var(--border-strong); padding: 3px 8px; border-radius: 0px;"><i class="ph ph-lock-key"></i> Chưa mở khóa</span>`;
    
    let capstoneAlert = `
        <div style="background: var(--bg-body); border: 1px solid var(--border-base); border-radius: 0px; padding: 10px 14px; margin-bottom: 14px; font-size: 12.5px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span>Điều kiện mở khóa: Hoàn thành tất cả các bài học trong lộ trình</span>
            <span style="font-weight: 600; color: var(--text-main);">${activeNodeIdx}/${pathNodes.length} bài học</span>
        </div>
    `;

    let capstoneActionBtn = `
        <button disabled style="border-radius: 0px; font-family: var(--font-ui); background: var(--bg-body); color: var(--text-muted); border: 1px solid var(--border-strong); cursor: not-allowed; opacity: 0.6; padding: 8px 18px; font-size: 13px; font-weight: 600;">
            Chưa mở khóa
        </button>
    `;

    if (isPathCompleted) {
        capstoneBorder = 'border: 1px solid #16a34a;';
        capstoneBg = 'background: var(--bg-card);';
        capstoneBadge = `<span style="font-size: 11px; font-weight: 600; color: #16a34a; background: rgba(22, 163, 74, 0.08); border: 1px solid #16a34a; padding: 3px 8px; border-radius: 0px;"><i class="ph ph-check"></i> Đã hoàn thành</span>`;
        capstoneAlert = `
            <div style="background: rgba(22, 163, 74, 0.05); border: 1px solid #16a34a; border-radius: 0px; padding: 10px 14px; margin-bottom: 14px; font-size: 12.5px; color: #16a34a; display: flex; align-items: center; gap: 8px;">
                <i class="ph ph-check" style="font-size: 16px;"></i>
                <span>Bạn đã hoàn thành bài đánh giá tổng kết của lộ trình này.</span>
            </div>
        `;
        capstoneActionBtn = `
            <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" style="border-radius: 0px; font-family: var(--font-ui); background: transparent; color: #16a34a; border: 1px solid #16a34a; cursor: pointer; padding: 8px 18px; font-size: 13px; font-weight: 600;">
                Xem tổng kết
            </button>
        `;
    } else if (allLessonsCompleted) {
        capstoneBorder = `border: 1.5px solid ${radixBlue};`;
        capstoneBg = 'background: var(--bg-card);';
        capstoneBadge = `<span style="font-size: 11px; font-weight: 600; color: ${radixBlue}; background: rgba(33, 150, 243, 0.08); border: 1px solid ${radixBlue}; padding: 3px 8px; border-radius: 0px;"><i class="ph ph-check-circle"></i> Sẵn sàng làm bài</span>`;
        capstoneAlert = `
            <div style="background: rgba(33, 150, 243, 0.05); border: 1px solid ${radixBlue}; border-radius: 0px; padding: 10px 14px; margin-bottom: 14px; font-size: 12.5px; color: ${radixBlue}; display: flex; align-items: center; gap: 8px;">
                <i class="ph ph-check-circle" style="font-size: 16px;"></i>
                <span>Bạn đã hoàn thành các bài học trong lộ trình. Hãy làm bài đánh giá này để tổng kết kiến thức.</span>
            </div>
        `;
        let onFinalClick = `if(typeof window.startFinalExamFromTimeline === 'function'){ window.startFinalExamFromTimeline('${pathId}'); } else { window.startFinalExam('${pathId}'); }`;
        capstoneActionBtn = `
            <button onclick="${onFinalClick}" style="border-radius: 0px; font-family: var(--font-ui); background: ${radixBlue}; color: #ffffff; border: 1px solid ${radixBlue}; cursor: pointer; padding: 8px 20px; font-size: 13px; font-weight: 600;">
                Làm bài đánh giá
            </button>
        `;
    }

    html += `
        <div class="tl-content-node tl-final-capstone-node" data-index="${pathNodes.length}" style="position: relative; padding-left: 44px; margin-top: 10px;">
            <div class="tl-anchor-dot" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 1px; height: 1px; visibility: hidden;"></div>
            <div style="padding: 20px 24px; border-radius: 0px; ${capstoneBorder} ${capstoneBg}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); font-family: var(--font-ui);">
                        Tổng kết lộ trình
                    </div>
                    <div>${capstoneBadge}</div>
                </div>
                
                <h3 style="margin: 0 0 6px; color: var(--text-main); font-size: 1.15rem; font-weight: 700; font-family: var(--font-ui);">
                    Bài đánh giá tổng kết lộ trình
                </h3>
                <div style="font-size: 13px; color: var(--text-muted); font-family: var(--font-ui); line-height: 1.5; margin-bottom: 14px;">
                    Bộ câu hỏi tổng hợp kiến thức từ toàn bộ ${pathNodes.length} bài học trong lộ trình học tập này.
                </div>

                ${capstoneAlert}

                <div style="display: flex; justify-content: flex-end; align-items: center;">
                    ${capstoneActionBtn}
                </div>
            </div>
        </div>
    </div> <!-- end master wrapper -->
    `;
    
    container.innerHTML = html;
    
    // BUILD SVG TIMELINE DYNAMICALLY
    buildSVGTimeline(document.getElementById('svg-timeline-wrapper'), radixBlue);

    if (mentorSession) {
        initMentorInteractions(mentorSession);
    }
}

function buildSVGTimeline(wrapper, radixBlue) {
    const nodes = wrapper.querySelectorAll('.tl-content-node');
    if (nodes.length === 0) return;
    
    const wrapperRect = wrapper.getBoundingClientRect();
    const svgWidth = 60;
    const svgHeight = wrapper.scrollHeight;
    const centerX = 8;
    const colorGray = 'var(--border-strong)';
    
    const committedPathId = localStorage.getItem('committed_path_id');
    const pathId = wrapper.getAttribute('data-path-id');
    const isCommitted = committedPathId === pathId;

    const savedProgress = JSON.parse(localStorage.getItem('path_progress_' + pathId) || '{"nodeIndex": 0, "taskLevel": 0}');
    const activeNodeIdx = savedProgress.nodeIndex;
    const activeTaskLvl = savedProgress.taskLevel;

    let svgHTML = `<svg width="${svgWidth}" height="${svgHeight}" style="position: absolute; top: 0; left: -8px; z-index: 1; pointer-events: none;">`;
    
    const firstDot = nodes[0].querySelector('.tl-anchor-dot').getBoundingClientRect();
    const lastDot = nodes[nodes.length-1].querySelector('.tl-anchor-dot').getBoundingClientRect();
    const startY = firstDot.top - wrapperRect.top;
    const endY = lastDot.top - wrapperRect.top;
    
    svgHTML += `<line x1="${centerX}" y1="${startY}" x2="${centerX}" y2="${endY}" stroke="${colorGray}" stroke-width="1.5" />`;
    
    let targetFlowY = startY;
    const lessonCount = nodes.length - 1;
    const allLessonsDone = isCommitted && (activeNodeIdx >= lessonCount);

    nodes.forEach((node, i) => {
        const dotElem = node.querySelector('.tl-anchor-dot');
        const task1 = node.querySelector('.tl-anchor-task1');
        const task2 = node.querySelector('.tl-anchor-task2');
        
        const dotY = dotElem.getBoundingClientRect().top - wrapperRect.top;
        
        let t1Y = 0, t2Y = 0;
        if (task1 && task2) {
            t1Y = task1.getBoundingClientRect().top - wrapperRect.top + (task1.offsetHeight / 2);
            t2Y = task2.getBoundingClientRect().top - wrapperRect.top + (task2.offsetHeight / 2);
            svgHTML += `<line x1="${centerX}" y1="${t1Y}" x2="${centerX+36}" y2="${t1Y}" stroke="${colorGray}" stroke-width="1.5" />`;
            svgHTML += `<line x1="${centerX}" y1="${t2Y}" x2="${centerX+36}" y2="${t2Y}" stroke="${colorGray}" stroke-width="1.5" />`;
        } else if (i === nodes.length - 1) {
            // Horizontal branch into the Capstone card center
            svgHTML += `<line x1="${centerX}" y1="${dotY}" x2="${centerX+36}" y2="${dotY}" stroke="${allLessonsDone ? radixBlue : colorGray}" stroke-width="1.5" />`;
        }

        if (isCommitted) {
            if (i < activeNodeIdx) {
                if (task1 && task2) {
                    svgHTML += `<line x1="${centerX}" y1="${t1Y}" x2="${centerX+36}" y2="${t1Y}" stroke="${radixBlue}" stroke-width="1.5" />`;
                    svgHTML += `<line x1="${centerX}" y1="${t2Y}" x2="${centerX+36}" y2="${t2Y}" stroke="${radixBlue}" stroke-width="1.5" />`;
                }
            } else if (i === activeNodeIdx) {
                if (task1 && task2) {
                    if (activeTaskLvl === 0) {
                        targetFlowY = t1Y;
                        svgHTML += `<line x1="${centerX}" y1="${t1Y}" x2="${centerX+36}" y2="${t1Y}" stroke="${radixBlue}" stroke-width="1.5" stroke-dasharray="36" stroke-dashoffset="36">
                                        <animate attributeName="stroke-dashoffset" to="0" dur="0.3s" fill="freeze" begin="0.3s"/>
                                    </line>`;
                    } else if (activeTaskLvl >= 1) {
                        targetFlowY = t2Y;
                        svgHTML += `<line x1="${centerX}" y1="${t1Y}" x2="${centerX+36}" y2="${t1Y}" stroke="${radixBlue}" stroke-width="1.5" />`;
                        svgHTML += `<line x1="${centerX}" y1="${t2Y}" x2="${centerX+36}" y2="${t2Y}" stroke="${radixBlue}" stroke-width="1.5" stroke-dasharray="36" stroke-dashoffset="36">
                                        <animate attributeName="stroke-dashoffset" to="0" dur="0.3s" fill="freeze" begin="0.3s"/>
                                    </line>`;
                    }
                }
            } else if (i === nodes.length - 1 && allLessonsDone) {
                targetFlowY = dotY;
                svgHTML += `<line x1="${centerX}" y1="${dotY}" x2="${centerX+36}" y2="${dotY}" stroke="${radixBlue}" stroke-width="1.5" stroke-dasharray="36" stroke-dashoffset="36">
                                <animate attributeName="stroke-dashoffset" to="0" dur="0.3s" fill="freeze" begin="0.3s"/>
                            </line>`;
            }
        }

        let isNodeBlue = isCommitted && (i <= activeNodeIdx);
        let isFinalNode = (i === nodes.length - 1);

        if (isFinalNode) {
            let capColor = allLessonsDone ? radixBlue : colorGray;
            let capFill = allLessonsDone ? radixBlue : 'var(--bg-card)';
            if (allLessonsDone) {
                svgHTML += `<circle cx="${centerX}" cy="${dotY}" r="9" fill="none" stroke="${radixBlue}" stroke-width="1.5" />`;
            }
            svgHTML += `<circle cx="${centerX}" cy="${dotY}" r="6" fill="${capFill}" stroke="${capColor}" stroke-width="2" />`;
        } else {
            let dotColor = isNodeBlue ? radixBlue : 'var(--bg-base)';
            let dotBorder = isNodeBlue ? radixBlue : colorGray;
            svgHTML += `<circle cx="${centerX}" cy="${dotY}" r="5" fill="${dotColor}" stroke="${dotBorder}" stroke-width="2" />`;
        }
    });

    if (isCommitted && targetFlowY > startY) {
        svgHTML += `<line x1="${centerX}" y1="${startY}" x2="${centerX}" y2="${targetFlowY}" stroke="${radixBlue}" stroke-width="1.5">
                        <animate attributeName="y2" values="${startY};${targetFlowY}" dur="0.4s" fill="freeze" />
                    </line>`;
    }

    svgHTML += `</svg>`;
    wrapper.insertAdjacentHTML('afterbegin', svgHTML);
}

window.deletePath = function(pathId) {
    if (!pathId) return;
    const pathObj = (window._cachedPaths && window._cachedPaths[pathId]) || null;
    const pathInfo = pathObj ? ` (${pathObj.start_node_id || ''} ➔ ${pathObj.target_node_id || ''})` : '';
    if (!confirm(`Xác nhận xóa lộ trình này${pathInfo}? Toàn bộ tiến trình liên quan sẽ bị xóa khỏi hệ thống.`)) {
        return;
    }

    if (localStorage.getItem('committed_path_id') === pathId) {
        localStorage.removeItem('committed_path_id');
    }
    localStorage.removeItem('path_progress_' + pathId);
    if (window._cachedPaths) {
        delete window._cachedPaths[pathId];
    }
    if (window._currentPathObj && window._currentPathObj.path_id === pathId) {
        window._currentPathObj = null;
    }

    const API = (window.App && window.App.API_BASE) || 
                (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:5000' : 'https://visualization-rr5v.onrender.com');
    const token = getAuthToken();
    const userId = getUserId();
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    fetch(`${API}/api/path/delete/${encodeURIComponent(pathId)}${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`, { 
        method: 'DELETE',
        headers: headers 
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Lỗi từ máy chủ khi xóa lộ trình: ' + res.status);
        }
        return res.json();
    })
    .then(data => {
        if (typeof window.showToast === 'function') {
            window.showToast('Đã xóa lộ trình thành công.', 'info');
        }
        if (typeof renderLearningPathWorkspace === 'function') {
            var cnt = document.getElementById('dd-content');
            if (cnt) {
                renderLearningPathWorkspace(cnt);
                return;
            }
        }
        if (typeof fetchAndRenderPaths === 'function') {
            fetchAndRenderPaths(true);
        } else {
            window.location.reload();
        }
    })
    .catch(err => {
        console.error('Delete path error:', err);
        alert('Không thể xóa lộ trình: ' + (err.message || 'Lỗi kết nối'));
        if (typeof fetchAndRenderPaths === 'function') {
            fetchAndRenderPaths(true);
        }
    });
};

window.clearLearningPath = function() {
    const committedId = localStorage.getItem('committed_path_id');
    if (committedId) {
        window.deletePath(committedId);
    } else {
        alert('Không có lộ trình nào đang kích hoạt để hủy.');
    }
};

window.startFinalExam = function(pathId) {
    if (!pathId && window._currentPathObj) {
        pathId = window._currentPathObj.path_id;
    }
    if (!pathId) {
        pathId = localStorage.getItem('committed_path_id') || 'default_path';
    }
    window.location.href = 'knowledge_info.html?final_exam=1&path_id=' + encodeURIComponent(pathId);
};

window.simulateFinalExam = window.startFinalExam;

// =========================================================================
// 8. DASHBOARD COMPLETED ROADMAPS (RETROSPECTIVE ARCHIVE)
// =========================================================================

window.renderCompletedRoadmapsDashboard = function(containerId) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    container.innerHTML = `
        <div style="padding: 32px 0; color: var(--text-muted); font-size: 13.5px; display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-spinner ph-spin" style="font-size: 20px;"></i> Đang tải...
        </div>
    `;

    try {
        const token = getAuthToken();
        const userId = getUserId();
        const API = (window.App && window.App.API_BASE) || 
                    (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:5000' : 'https://visualization-rr5v.onrender.com');
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        // Fallback directly to empty state if no user session
        if (!userId && !token) {
            renderCompletedEmptyState(container);
            return;
        }

        fetchRealCourseMetadata().finally(() => {
            fetch(`${API}/api/path/list${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`, { headers })
                .then(res => res.json())
                .then(data => {
                    const paths = (data && data.paths) || [];
                    window._cachedPaths = window._cachedPaths || {};
                    paths.forEach(p => { 
                        if (typeof p.path_nodes === 'string') {
                            try { p.path_nodes = JSON.parse(p.path_nodes); } catch(e) { p.path_nodes = []; }
                        }
                        if (!Array.isArray(p.path_nodes)) p.path_nodes = [];
                        window._cachedPaths[p.path_id] = p; 
                    });

                    // Filter strictly completed paths
                    const completedPaths = paths.filter(p => {
                        if (p.status === 'completed') return true;
                        if (p.path_nodes && p.path_nodes.length > 0) {
                            const prog = JSON.parse(localStorage.getItem('path_progress_' + p.path_id) || '{"nodeIndex":0}');
                            if (prog.nodeIndex >= p.path_nodes.length) return true;
                        }
                        return false;
                    });

                    if (completedPaths.length === 0) {
                        renderCompletedEmptyState(container);
                        return;
                    }

                    renderCompletedDashboardView(container, completedPaths);
                })
                .catch(err => {
                    console.error("Error fetching completed paths:", err);
                    renderCompletedEmptyState(container);
                });
        });
    } catch(err) {
        console.error("renderCompletedRoadmapsDashboard error:", err);
        renderCompletedEmptyState(container);
    }
};

function renderCompletedEmptyState(container) {
    container.innerHTML = `
        <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 44px 28px; text-align: center; border-radius: 0px;">
            <div style="width: 44px; height: 44px; margin: 0 auto 14px; background: var(--bg-body); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 20px;">
                <i class="ph ph-check-circle"></i>
            </div>
            <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 700; color: var(--text-main); font-family: var(--font-ui);">
                Chưa có lộ trình hoàn thành
            </h3>
            <p style="color: var(--text-muted); font-size: 13.5px; margin: 0 0 20px 0; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.6;">
                Khi hoàn thành tất cả bài học của một lộ trình, kết quả và dòng thời gian sẽ được lưu tại đây.
            </p>
            <button onclick="window.location.href='knowledge_info.html?type=learning-path&id=learning-path'" style="padding: 7px 18px; border-radius: 0px; background: var(--primary-base); color: #ffffff; border: 1px solid var(--primary-base); font-size: 13px; font-weight: 600; cursor: pointer;">
                Đến trang học tập
            </button>
        </div>
    `;
}

function renderCompletedDashboardView(container, completedPaths) {
    const totalPaths = completedPaths.length;
    let totalLessons = 0;
    completedPaths.forEach(p => {
        totalLessons += (p.path_nodes ? p.path_nodes.length : 0);
    });

    const primaryPath = completedPaths[0];
    const pathNodes = (primaryPath && primaryPath.path_nodes) || [];

    // Build SVG bar chart for primaryPath lessons scores (0-10 scale)
    const mockScores = [8.5, 9.0, 8.0, 8.5, 9.5];
    const chartBars = pathNodes.map((nId, idx) => {
        const lData = getLessonData(nId);
        const score = mockScores[idx % mockScores.length];
        const barHeight = Math.round((score / 10) * 110);
        const barY = 130 - barHeight;
        const xPos = 40 + idx * 110;

        return `
            <g class="chart-col" transform="translate(${xPos}, 0)">
                <rect x="15" y="${barY}" width="36" height="${barHeight}" fill="var(--primary-base)" rx="0"></rect>
                <text x="33" y="${barY - 8}" fill="var(--text-main)" font-size="11.5" font-family="var(--font-ui)" font-weight="700" text-anchor="middle">${score}</text>
                <text x="33" y="150" fill="var(--text-muted)" font-size="11" font-family="var(--font-ui)" text-anchor="middle">Bài ${idx + 1}</text>
                <title>${lData.title}: ${score}/10</title>
            </g>
        `;
    }).join('');

    const chartWidth = Math.max(360, 80 + pathNodes.length * 110);

    let html = `
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- 3 Simple Metrics -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 14px 18px; border-radius: 0px;">
                    <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Đã hoàn thành</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); font-family: var(--font-ui);">${totalPaths} lộ trình</div>
                </div>
                <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 14px 18px; border-radius: 0px;">
                    <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Số bài đã học</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); font-family: var(--font-ui);">${totalLessons} bài</div>
                </div>
                <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 14px 18px; border-radius: 0px;">
                    <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px;">Điểm trung bình</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-base); font-family: var(--font-ui);">8.5 / 10</div>
                </div>
            </div>

            <!-- Score Chart (Clean & Direct) -->
            <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 18px 22px; border-radius: 0px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); font-family: var(--font-ui);">Điểm số các bài kiểm tra</div>
                        <div style="font-size: 12.5px; color: var(--text-muted);">Thang điểm 10 qua từng bài học của lộ trình</div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 14px;">
                        <span>Lý thuyết: <strong style="color: var(--text-main);">100%</strong></span>
                        <span>Thực hành: <strong style="color: var(--text-main);">100%</strong></span>
                    </div>
                </div>
                <div style="overflow-x: auto; width: 100%;">
                    <svg viewBox="0 0 ${chartWidth} 175" style="width: 100%; max-width: ${chartWidth}px; height: 175px; display: block; margin: 0 auto;">
                        <!-- Grid lines -->
                        <line x1="20" y1="20" x2="${chartWidth - 20}" y2="20" stroke="var(--border-strong)" stroke-dasharray="3 3" opacity="0.5"></line>
                        <text x="12" y="24" fill="var(--text-muted)" font-size="10" font-family="monospace">10</text>
                        <line x1="20" y1="75" x2="${chartWidth - 20}" y2="75" stroke="var(--border-strong)" stroke-dasharray="3 3" opacity="0.5"></line>
                        <text x="12" y="79" fill="var(--text-muted)" font-size="10" font-family="monospace">5</text>
                        <line x1="20" y1="130" x2="${chartWidth - 20}" y2="130" stroke="var(--border-strong)" opacity="0.8"></line>
                        <text x="12" y="134" fill="var(--text-muted)" font-size="10" font-family="monospace">0</text>

                        <!-- Bars -->
                        ${chartBars}
                    </svg>
                </div>
            </div>

            <!-- List of Completed Roadmaps -->
            <div>
                <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 12px;">
                    Danh sách lộ trình (${totalPaths})
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    completedPaths.forEach(p => {
        const startNode = (p.path_nodes && p.path_nodes.length > 0) ? p.path_nodes[0] : (p.start_node_id || 'l1');
        const endNode = (p.path_nodes && p.path_nodes.length > 0) ? p.path_nodes[p.path_nodes.length - 1] : (p.target_node_id || 'l3');
        const sData = getLessonData(startNode);
        const eData = getLessonData(endNode);
        const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '';
        const nodeCount = (p.path_nodes && p.path_nodes.length) || 0;

        html += `
            <div style="border: 1px solid var(--border-strong); background: var(--bg-card); padding: 16px 20px; border-radius: 0px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-weight: 700; font-family: var(--font-ui); font-size: 1.05rem; color: var(--text-main);">
                            Lộ trình: ${sData.title} ➔ ${eData.title}
                        </span>
                        <span style="font-size: 10.5px; color: var(--success-base, #30a46c); background: rgba(48, 164, 108, 0.08); border: 1px solid var(--success-base, #30a46c); padding: 1px 6px; font-weight: 700;">
                            Đã hoàn thành
                        </span>
                    </div>
                    <div style="font-size: 12.5px; color: var(--text-muted);">
                        ${nodeCount} bài học · Hoàn thành: ${dateStr}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button onclick="openRetrospectiveTimeline('${p.path_id}')" style="padding: 6px 14px; border-radius: 0px; background: transparent; color: var(--text-main); border: 1px solid var(--border-strong); font-size: 12.5px; font-weight: 500; cursor: pointer;">
                        Dòng thời gian
                    </button>
                    <button onclick="openRetrospectiveDetail('${p.path_id}')" style="padding: 6px 14px; border-radius: 0px; background: transparent; color: var(--primary-base); border: 1px solid var(--primary-base); font-size: 12.5px; font-weight: 600; cursor: pointer;">
                        Chi tiết
                    </button>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>

            <!-- Inline Timeline View Container -->
            <div id="retrospective-timeline-panel" style="display: none; border: 1px solid var(--border-strong); background: var(--bg-card); padding: 20px 24px; border-radius: 0px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-strong); padding-bottom: 12px;">
                    <div>
                        <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main);" id="retro-timeline-title">Dòng thời gian bài học</div>
                    </div>
                    <button onclick="document.getElementById('retrospective-timeline-panel').style.display = 'none'" style="border: 1px solid var(--border-strong); background: transparent; color: var(--text-muted); font-size: 12px; padding: 4px 10px; cursor: pointer;">Đóng</button>
                </div>
                <div id="retro-timeline-content"></div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

window.openRetrospectiveTimeline = function(pathId) {
    const pathObj = (window._cachedPaths && window._cachedPaths[pathId]);
    if (!pathObj) return;

    const panel = document.getElementById('retrospective-timeline-panel');
    const content = document.getElementById('retro-timeline-content');
    const title = document.getElementById('retro-timeline-title');
    if (!panel || !content) return;

    const pathNodes = pathObj.path_nodes || [];
    const startNode = pathNodes.length > 0 ? pathNodes[0] : (pathObj.start_node_id || 'l1');
    const endNode = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : (pathObj.target_node_id || 'l3');
    const sData = getLessonData(startNode);
    const eData = getLessonData(endNode);

    if (title) title.textContent = `Dòng thời gian: ${sData.title} ➔ ${eData.title}`;

    let nodesHtml = '<div style="display: flex; flex-direction: column; gap: 14px;">';
    pathNodes.forEach((nId, idx) => {
        const lData = getLessonData(nId);
        nodesHtml += `
            <div style="display: flex; gap: 14px; align-items: center; padding: 12px 16px; border: 1px solid var(--border-strong); background: var(--bg-body);">
                <div style="width: 24px; height: 24px; border-radius: 0px; background: rgba(48, 164, 108, 0.1); border: 1px solid var(--success-base, #30a46c); color: var(--success-base, #30a46c); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;">
                    <i class="ph ph-check"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 13.5px; color: var(--text-main);">Bài ${idx + 1}: ${lData.title}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Lý thuyết: Đã học · Bài tập: Đạt yêu cầu</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.location.href='knowledge_info.html?id=${nId}&type=lesson'" style="padding: 4px 10px; border: 1px solid var(--border-strong); background: transparent; font-size: 12px; color: var(--text-main); cursor: pointer;">
                        Đọc lại
                    </button>
                    <button onclick="window.location.href='knowledge_info.html?practice_lesson_id=${nId}&path_id=${pathId}&node_idx=${idx}'" style="padding: 4px 10px; border: 1px solid var(--border-strong); background: transparent; font-size: 12px; color: var(--text-main); cursor: pointer;">
                        Làm lại
                    </button>
                </div>
            </div>
        `;
    });
    nodesHtml += '</div>';

    content.innerHTML = nodesHtml;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.openRetrospectiveDetail = function(pathId) {
    const pathObj = (window._cachedPaths && window._cachedPaths[pathId]);
    if (!pathObj) return;

    const pathNodes = pathObj.path_nodes || [];
    const startNode = pathNodes.length > 0 ? pathNodes[0] : (pathObj.start_node_id || 'l1');
    const endNode = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : (pathObj.target_node_id || 'l3');
    const sData = getLessonData(startNode);
    const eData = getLessonData(endNode);
    const studentName = getUserFullName();
    const dateStr = pathObj.created_at ? new Date(pathObj.created_at).toLocaleDateString('vi-VN') : '';

    const existingModal = document.getElementById('retro-detail-modal');
    if (existingModal) existingModal.remove();

    let rowsHtml = '';
    const mockScores = [8.5, 9.0, 8.0, 8.5, 9.5];
    pathNodes.forEach((nId, idx) => {
        const lData = getLessonData(nId);
        const score = mockScores[idx % mockScores.length];
        rowsHtml += `
            <tr style="border-bottom: 1px solid var(--border-strong);">
                <td style="padding: 10px 12px; font-size: 13px; color: var(--text-main);">Bài ${idx + 1}: ${lData.title}</td>
                <td style="padding: 10px 12px; font-size: 12.5px; color: var(--success-base, #30a46c);">Đã học</td>
                <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: var(--text-main); font-family: monospace;">${score} / 10</td>
                <td style="padding: 10px 12px; font-size: 12px; color: var(--success-base, #30a46c);">Đạt</td>
            </tr>
        `;
    });

    const modalHtml = `
        <div id="retro-detail-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px;">
            <div style="background: var(--bg-card); border: 1px solid var(--border-strong); width: 100%; max-width: 580px; padding: 24px; border-radius: 0px; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid var(--border-strong); padding-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; font-size: 1.15rem; font-weight: 700; color: var(--text-main); font-family: var(--font-ui);">Tổng kết lộ trình</h3>
                        <div style="font-size: 12.5px; color: var(--text-muted);">${sData.title} ➔ ${eData.title}</div>
                    </div>
                    <button onclick="document.getElementById('retro-detail-modal').remove()" style="background: transparent; border: none; font-size: 16px; color: var(--text-muted); cursor: pointer;">✕</button>
                </div>

                <!-- Table of lessons -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-strong); text-align: left; font-size: 11.5px; text-transform: uppercase; color: var(--text-muted);">
                            <th style="padding: 8px 12px;">Bài học</th>
                            <th style="padding: 8px 12px;">Lý thuyết</th>
                            <th style="padding: 8px 12px;">Điểm bài tập</th>
                            <th style="padding: 8px 12px;">Kết quả</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <!-- Simple feedback box from Nori -->
                <div style="background: var(--bg-body); border: 1px solid var(--border-strong); padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: var(--text-main); line-height: 1.6;">
                    <strong style="color: var(--text-main);">Nori:</strong> Chào ${studentName}, bạn đã hoàn thành đầy đủ các bài học và bài kiểm tra của lộ trình này vào ngày ${dateStr}.
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="document.getElementById('retro-detail-modal').remove()" style="padding: 6px 18px; border-radius: 0px; background: var(--primary-base); color: #ffffff; border: 1px solid var(--primary-base); font-size: 13px; font-weight: 600; cursor: pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
