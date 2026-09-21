/**
 * Nori Avatar Renderer & Living Idle Engine v8
 */
(function(window) {
        function getMoodColorAndLabel(mood) {
            const moods = {
                'neutral': { col: '#d97706', bg: '#fffbeb', label: 'Thư thái / Lắng nghe (Neutral)' },
                'stern': { col: '#dc2626', bg: '#fef2f2', label: 'Nghiêm cẩn / Phẫn nộ' },
                'thoughtful': { col: '#b45309', bg: '#fffbeb', label: 'Trầm ngâm / Suy ngẫm' },
                'puzzled': { col: '#d97706', bg: '#fffbeb', label: 'Bối rối / Băn khoăn' },
                'proud': { col: '#16a34a', bg: '#f0fdf4', label: 'Tự hào / Biểu dương' },
                'shocked': { col: '#ea580c', bg: '#fff7ed', label: 'Kinh ngạc / Bất ngờ' },
                'empathetic': { col: '#0284c7', bg: '#f0f9ff', label: 'Thấu cảm / Đồng hành' },
                'relieved': { col: '#0d9488', bg: '#f0fdfa', label: 'Nhẹ nhõm / Thư thái' },
                'wink': { col: '#c026d3', bg: '#fdf4ff', label: 'Dí dỏm / Cổ vũ' }
            };
            const moodKey = String(mood || 'neutral_2').split('_')[0].toLowerCase();
            return moods[moodKey] || { col: '#d97706', bg: '#fffbeb', label: 'Nori Companion' };
        }

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
            { id: 'sway', name: 'Đổi trọng tâm chân & Lắc lư', duration: 1800, target: 'actor' },
            { id: 'peekaboo', name: 'Ú òa tinh nghịch (Peekaboo!)', duration: 1800, target: 'actor' },
            { id: 'chinrest', name: 'Nằm chống cằm ngắm bài làm', duration: 2600, target: 'actor' }
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
        if (!this.autoDecayActive) {
            this.updateStatus(`Khóa cố định biểu cảm: ${moodStr}`);
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

    window.getMoodColorAndLabel = getMoodColorAndLabel;
    window.renderMentorAvatarHTML = renderMentorAvatarHTML;
    window.NoriLivingIdleEngine = NoriLivingIdleEngine;
})(window);
