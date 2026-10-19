/**
 * Vectoria - Nori Floating Companion & Pedagogical Living Entity
 * Seamless In-Canvas & Floating Companion with Physical Interactions
 * 
 * Features:
 *  1. Unified Identity: Nori stays at canvas origin (0, 0) by default, warped by matrix transformations.
 *  2. Drag from Origin: Clicking Nori at (0, 0) lifts it into the floating layer, making it immune to matrix stretching.
 *  3. Return to Origin: Dropping Nori near (0, 0) or double-clicking snaps Nori back into coordinate space (no ugly chalk markers).
 *  4. Canvas Boundary Clamping: Strictly constrained inside the canvas viewport, never overflows into topbar.
 *  5. Low z-index (15): Positioned underneath the sidebar (#controls z-index: 250) and HUD, never blocking vectors.
 *  6. Surgical Pointer Events: Transparent background passes all clicks directly to vectors.
 *  7. Instant Click & Drag Reactions:
 *     - Click/Drag Ear: Skull-anchored twitch on click, elastic stretch & harmonic snapback on drag.
 *     - Click/Drag Cheek: Mochi bounce on click, squishy stretch on drag.
 *     - Click Nose: Instant nose wrinkle & sneeze recoil.
 *     - Click Belly: Instant giggle & jiggle animation.
 *     - Click Body: Instant bounce greeting guiding user.
 *     - Dizzy Shake: High-speed mouse shaking triggers dizzy spiral eyes.
 *     - Double Click: Somersault back to (0, 0).
 *     - Rapid Click: Blowfish puff-up.
 * 
 * Standards Compliance: Vanilla JS, Zero Em-dash, Strict NaN safety.
 */

(function (global) {
  'use strict';

  const NORI_SVG_CONTENT = `
<svg class="nori-companion-svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <radialGradient id="nori-comp-body-grad" cx="45%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </radialGradient>
    <radialGradient id="nori-comp-shadow-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(30, 20, 15, 0.25)"/>
      <stop offset="100%" stop-color="rgba(30, 20, 15, 0)"/>
    </radialGradient>
  </defs>

  <!-- Bóng chân tiếp đất -->
  <g id="Ground_Shadow">
    <ellipse cx="50" cy="92" rx="26" ry="4" fill="url(#nori-comp-shadow-grad)"/>
  </g>

  <!-- Khối thân vật lý Nori -->
  <g id="Nori_Character" class="nori-body-mesh">
    <!-- Tai trái (Neo chắc vào sọ tại 32, 28) -->
    <g id="Ear_Left" style="transform-origin: 32px 28px; cursor: grab;">
      <ellipse cx="25" cy="22" rx="10.5" ry="9.5" fill="url(#nori-comp-body-grad)" stroke="#78350f" stroke-width="1.6"/>
      <ellipse cx="25.5" cy="22.5" rx="6.2" ry="5.4" fill="#fecdd3"/>
    </g>

    <!-- Tai phải (Neo chắc vào sọ tại 68, 28) -->
    <g id="Ear_Right" style="transform-origin: 68px 28px; cursor: grab;">
      <ellipse cx="75" cy="22" rx="10.5" ry="9.5" fill="url(#nori-comp-body-grad)" stroke="#78350f" stroke-width="1.6"/>
      <ellipse cx="74.5" cy="22.5" rx="6.2" ry="5.4" fill="#fecdd3"/>
    </g>

    <!-- Bàn chân -->
    <g id="Feet">
      <ellipse id="Foot_Left" cx="35" cy="85" rx="7.5" ry="4.5" fill="#d97706" stroke="#78350f" stroke-width="1.4"/>
      <ellipse id="Foot_Right" cx="65" cy="85" rx="7.5" ry="4.5" fill="#d97706" stroke="#78350f" stroke-width="1.4"/>
    </g>

    <!-- Khối đầu và thân -->
    <g id="Body_Group">
      <path id="Body_Silhouette" d="M 50 19 C 72 19, 85 30, 85 47 C 85 62, 79 74, 69 79 C 59 84, 41 84, 31 79 C 21 74, 15 62, 15 47 C 15 30, 28 19, 50 19 Z" fill="url(#nori-comp-body-grad)" stroke="#78350f" stroke-width="1.6"/>
      <!-- Vùng bụng tương tác chọc nhột -->
      <g id="Tummy_Group" cursor="pointer" pointer-events="all">
        <path id="Tummy_Patch" d="M 50 43 C 63 43, 73 51, 73 63 C 73 74, 63 79, 50 79 C 37 79, 27 74, 27 63 C 27 51, 37 43, 50 43 Z" fill="#fefae0" opacity="0.95" pointer-events="all"/>
        <ellipse cx="50" cy="67" rx="14" ry="10" fill="#000" fill-opacity="0" pointer-events="all"/>
      </g>
    </g>

    <!-- Má hồng tương tác (Véo má Mochi) -->
    <g id="Blush_Cheeks">
      <g id="Cheek_Left_Group" cursor="grab" pointer-events="all">
        <ellipse id="Cheek_Left" cx="25" cy="56" rx="5.4" ry="3.2" fill="rgba(244, 63, 94, 0.42)"/>
        <circle cx="25" cy="56" r="14" fill="#000" fill-opacity="0" pointer-events="all"/>
      </g>
      <g id="Cheek_Right_Group" cursor="grab" pointer-events="all">
        <ellipse id="Cheek_Right" cx="75" cy="56" rx="5.4" ry="3.2" fill="rgba(244, 63, 94, 0.42)"/>
        <circle cx="75" cy="56" r="14" fill="#000" fill-opacity="0" pointer-events="all"/>
      </g>
    </g>

    <!-- Lông mày -->
    <g id="Eyebrows">
      <path id="Brow_Left" d="M 34 40.5 Q 39 38 45 40.5" stroke="#78350f" stroke-width="1.9" stroke-linecap="round" fill="none"/>
      <path id="Brow_Right" d="M 55 40.5 Q 61 38 66 40.5" stroke="#78350f" stroke-width="1.9" stroke-linecap="round" fill="none"/>
    </g>

    <!-- Mắt -->
    <g id="Eyes_Group">
      <g id="Eye_Left">
        <path id="Eye_Left_Arc" d="M 33 50 Q 38 46.5 43 50" stroke="#292524" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0"/>
        <g id="Eye_Left_Pupil">
          <ellipse id="Eye_Left_Ball" cx="38" cy="49" rx="5.2" ry="5.8" fill="#292524"/>
          <circle id="Eye_Left_Catch" cx="39.6" cy="46.8" r="1.8" fill="#ffffff"/>
          <circle id="Eye_Left_Catch2" cx="36.8" cy="51.2" r="0.85" fill="#ffffff" opacity="0.85"/>
        </g>
      </g>
      <g id="Eye_Right">
        <path id="Eye_Right_Arc" d="M 57 50 Q 62 46.5 67 50" stroke="#292524" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0"/>
        <g id="Eye_Right_Pupil">
          <ellipse id="Eye_Right_Ball" cx="62" cy="49" rx="5.2" ry="5.8" fill="#292524"/>
          <circle id="Eye_Right_Catch" cx="63.6" cy="46.8" r="1.8" fill="#ffffff"/>
          <circle id="Eye_Right_Catch2" cx="60.8" cy="51.2" r="0.85" fill="#ffffff" opacity="0.85"/>
        </g>
      </g>
    </g>

    <!-- Miệng (Vẽ trước mũi để mũi luôn nằm trên, không bị miệng che khuất) -->
    <g id="Mouth">
      <path id="Mouth_Smile" d="M 45.5 59.5 Q 50 61.5 54.5 59.5" stroke="#78350f" stroke-width="1.9" stroke-linecap="round" fill="none"/>
      <path id="Mouth_Tongue" d="M 47.8 66 C 48.5 64.6, 51.5 64.6, 52.2 66 C 51.5 67.8, 48.5 67.8, 47.8 66 Z" fill="#fb7185" opacity="0" pointer-events="none"/>
    </g>

    <!-- Mũi tương tác (Búng mũi hắt xì - Nằm đè lên trên miệng) -->
    <g id="Nose_Group" cursor="pointer" pointer-events="all">
      <ellipse id="Nose" cx="50" cy="54" rx="2.4" ry="1.6" fill="#292524" opacity="0.85"/>
      <circle cx="50" cy="54" r="12" fill="#000" fill-opacity="0" pointer-events="all"/>
    </g>

    <!-- Hiệu ứng tia giọt hắt xì & giọt nước mắt cười -->
    <g id="Sneeze_FX" opacity="0" pointer-events="none" style="transition: opacity 0.15s ease;">
      <circle cx="41" cy="62" r="1.4" fill="#38bdf8" opacity="0.9"/>
      <circle cx="59" cy="62" r="1.4" fill="#38bdf8" opacity="0.9"/>
      <path d="M 43 65 L 39 70 M 57 65 L 61 70" stroke="#38bdf8" stroke-width="1.3" stroke-linecap="round"/>
    </g>
    <g id="Laugh_Tears" opacity="0" pointer-events="none" style="transition: opacity 0.15s ease;">
      <ellipse cx="32" cy="50" rx="1.6" ry="2.4" fill="#38bdf8" transform="rotate(-25 32 50)"/>
      <ellipse cx="68" cy="50" rx="1.6" ry="2.4" fill="#38bdf8" transform="rotate(25 68 50)"/>
    </g>

    <!-- Bàn tay trước -->
    <g id="Paws">
      <ellipse id="Paw_Left" cx="36" cy="62" rx="4.5" ry="3.5" fill="#f59e0b" stroke="#78350f" stroke-width="1.2"/>
      <ellipse id="Paw_Right" cx="64" cy="62" rx="4.5" ry="3.5" fill="#f59e0b" stroke="#78350f" stroke-width="1.2"/>
    </g>
  </g>
</svg>
`;

  const DEFAULT_BODY_PATH = 'M 50 19 C 72 19, 85 30, 85 47 C 85 62, 79 74, 69 79 C 59 84, 41 84, 31 79 C 21 74, 15 62, 15 47 C 15 30, 28 19, 50 19 Z';
  const DEFAULT_TUMMY_PATH = 'M 50 43 C 63 43, 73 51, 73 63 C 73 74, 63 79, 50 79 C 37 79, 27 74, 27 63 C 27 51, 37 43, 50 43 Z';

  class NoriFloatingCompanion {
    constructor() {
      this.container = null;
      this.stage = null;
      this.bubble = null;
      this.isGrabbed = false;
      this.isEarPulling = null; // 'left' | 'right' | null
      this.isCheekPinching = null; // 'left' | 'right' | null
      this.lastCheekDx = 0;
      this.lastCheekDy = 0;
      this.bubbleTimeout = null;
      this.blinkTimer = null;

      // Physics Drag State
      this.pos = { x: 0, y: 0 };
      this.pointerOffset = { x: 0, y: 0 };
      this.velocity = { x: 0, y: 0 };
      this.lastPointer = { x: 0, y: 0, time: 0 };
      this.inertiaTilt = 0;
      this.hasMovedDrag = false;
      this.dragClickStart = { x: 0, y: 0 };

      // Dizzy Shake Easter Egg State
      this.shakeHistory = [];
      this.shakeReversals = [];
      this.lastShakeDir = 0;
      this.isDizzy = false;

      // Head Petting Easter Egg State
      this.petStrokeHistory = [];
      this.isPetting = false;

      // Rapid Click Blowfish Easter Egg State
      this.clickTimestamps = [];
      this.isPuffed = false;
      this.dragStartedOnTummy = false;

      // Interaction Debounce Flags
      this.isEarTwitching = false;
      this.isCheekBouncing = false;
      this.isSneezing = false;
      this.isTickling = false;

      // Idle Timer State
      this.idleTimer = null;
      this.isIdleAnimating = false;

      // Gaze Tracking & Living Eye Motion State
      this.currentGaze = { x: 0, y: 0 };
      this.targetGaze = { x: 0, y: 0 };
      this.mousePos = null;
      this.gazeRafId = null;
      this.currentFaceExpr = 'NEUTRAL';
      this.isBlinking = false;
      this._boundGazeLoop = this.gazeLoop.bind(this);
      this._onPointerTrack = (e) => {
        this.mousePos = { x: e.clientX, y: e.clientY };
      };
      this._onPointerLeave = () => {
        this.mousePos = null;
      };

      this.init();
    }

    init() {
      if (document.getElementById('noriFloatingCompanion')) return;

      // Tạo Container chính (Mặc định ẩn, chỉ hiện khi được bưng ra khỏi gốc tọa độ)
      this.container = document.createElement('div');
      this.container.id = 'noriFloatingCompanion';
      this.container.style.display = 'none';

      this.container.innerHTML = `
        <div class="nori-speech-bubble" id="noriCompanionBubble">Hé lô</div>
        <div class="nori-companion-stage" id="noriCompanionStage">
          ${NORI_SVG_CONTENT}
        </div>
      `;

      document.body.appendChild(this.container);

      this.stage = document.getElementById('noriCompanionStage');
      this.bubble = document.getElementById('noriCompanionBubble');

      // Khôi phục vị trí đã lưu nếu có
      this.restorePosition();

      // Gắn các tương tác vật lý & Easter Eggs
      this.bindDragEvents();
      this.bindEarPhysicsEvents();
      this.bindCheekPhysicsEvents();
      this.bindNoseEvents();
      this.bindTummyEvents();
      this.bindHeadPetEvents();
      this.bindDoubleTapReturn();
      this.bindRapidClickEvents();

      // Theo dõi con trỏ chuột trên màn hình để Nori dõi mắt nhìn theo
      window.addEventListener('pointermove', this._onPointerTrack, { passive: true });
      window.addEventListener('mouseleave', this._onPointerLeave, { passive: true });

      // Khởi động chu kỳ chớp mắt sinh học & FSM Idle Animation
      this.scheduleNextBlink();
      this.resetIdleTimer();
    }

    show() {
      if (global.App && (global.App.mode === '3D' || (typeof document !== 'undefined' && document.body && document.body.classList.contains('mode-3d')))) {
        this.hide();
        return;
      }
      if (!this.container) return;
      this.container.style.display = 'flex';
      this.resetIdleTimer();
      this.startGazeLoop();
    }

    hide() {
      if (!this.container) return;
      this.container.style.display = 'none';
      if (this.bubble) this.bubble.classList.remove('is-visible');
      this.stopGazeLoop();
    }

    say(text, durationMs = 2800) {
      if (!this.bubble) return;
      this.bubble.textContent = text;
      this.bubble.classList.add('is-visible');
      if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = setTimeout(() => {
        this.bubble.classList.remove('is-visible');
      }, durationMs);
    }

    getCanvasBounds() {
      const canvas = document.getElementById('canvas2d') || document.getElementById('viewer');
      const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 60, bottom: window.innerHeight };
      const topbar = document.getElementById('topbar') || document.querySelector('.topbar');
      const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : 60;

      return {
        minX: Math.max(12, canvasRect.left + 10),
        maxX: Math.min(window.innerWidth - 132, canvasRect.right - 125),
        minY: Math.max(topbarBottom + 8, canvasRect.top + 8),
        maxY: Math.min(window.innerHeight - 135, canvasRect.bottom - 125)
      };
    }

    restorePosition() {
      try {
        const saved = localStorage.getItem('vectoria_nori_pos');
        if (saved) {
          const { x, y } = JSON.parse(saved);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            const bounds = this.getCanvasBounds();
            const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
            const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
            this.container.style.left = `${clampedX}px`;
            this.container.style.top = `${clampedY}px`;
            this.container.style.bottom = 'auto';
            this.container.style.right = 'auto';
            this.pos = { x: clampedX, y: clampedY };
            return;
          }
        }
      } catch (e) {}

      // Mặc định góc dưới bên phải trong Canvas
      const bounds = this.getCanvasBounds();
      this.pos = { x: bounds.maxX - 20, y: bounds.maxY - 20 };
    }

    savePosition() {
      try {
        localStorage.setItem('vectoria_nori_pos', JSON.stringify(this.pos));
      } catch (e) {}
    }

    // =========================================================================
    // 1. LIFT FROM CANVAS & RETURN TO ORIGIN
    // =========================================================================

    /**
     * Bưng Nori từ gốc tọa độ (0, 0) trên Canvas vào lớp giao diện nổi
     */
    liftFromCanvas(e, screenOriginX, screenOriginY) {
      if (global.App && (global.App.mode === '3D' || (typeof document !== 'undefined' && document.body && document.body.classList.contains('mode-3d')))) return;
      if (!global.App) global.App = {};
      global.App.noriIsFloating = true;

      // Hiển thị container tại đúng vị trí Nori trên màn hình
      this.show();
      const startX = screenOriginX - 60;
      const startY = screenOriginY - 60;
      this.pos = { x: startX, y: startY };
      this.container.style.left = `${startX}px`;
      this.container.style.top = `${startY}px`;
      this.container.style.bottom = 'auto';
      this.container.style.right = 'auto';

      // Vẽ lại canvas để Nori tại gốc ẩn đi
      if (global.Vec2D && typeof global.Vec2D.draw2DAllVectors === 'function') {
        global.Vec2D.draw2DAllVectors();
      }

      // Kích hoạt ngay trạng thái lơ lửng trong tay người dùng
      this.isGrabbed = true;
      this.hasMovedDrag = true;
      this.resetIdleTimer();

      this.pointerOffset = {
        x: e.clientX - startX,
        y: e.clientY - startY
      };
      this.lastPointer = {
        x: e.clientX,
        y: e.clientY,
        time: performance.now()
      };
      this.velocity = { x: 0, y: 0 };
      this.inertiaTilt = 0;
      this.shakeHistory = [];

      this.stage.classList.add('is-grabbed');
      this.stage.classList.remove('is-landing');

      this.setFaceExpression('AIRBORNE');
      this.say('Úi! Bưng tui đi đâu đây?!', 3000);

      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointercancel', this._onPointerUp);
    }

    /**
     * Bay trở lại gốc tọa độ (0, 0) và nhập vào không gian ma trận
     */
    returnToOrigin() {
      const canvas = document.getElementById('canvas2d');
      let targetX = 0;
      let targetY = 0;

      if (canvas && global.Vec2D && global.Vec2D.gridInfo2D) {
        const crect = canvas.getBoundingClientRect();
        targetX = crect.left + global.Vec2D.gridInfo2D.cx - 60;
        targetY = crect.top + global.Vec2D.gridInfo2D.cy - 60;
      } else {
        targetX = window.innerWidth / 2 - 60;
        targetY = window.innerHeight / 2 - 60;
      }

      this.container.style.transition = 'all 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)';
      this.container.style.left = `${targetX}px`;
      this.container.style.top = `${targetY}px`;
      this.setFaceExpression('HAPPY_LAND');
      this.say('Đáp xuống gốc tọa độ rồi đó!', 2200);

      setTimeout(() => {
        this.container.style.transition = '';
        if (global.App) global.App.noriIsFloating = false;
        this.hide();

        const bodySilhouette = document.getElementById('Body_Silhouette');
        if (bodySilhouette) bodySilhouette.setAttribute('d', DEFAULT_BODY_PATH);

        if (global.Vec2D && typeof global.Vec2D.draw2DAllVectors === 'function') {
          global.Vec2D.draw2DAllVectors();
        }
        if (global.App && typeof global.App.triggerNoriRelief === 'function') {
          global.App.triggerNoriRelief();
        }
      }, 380);
    }

    // =========================================================================
    // 2. PHYSICAL DRAG & INERTIA ENGINE (BƯNG NORI VỚI QUÁN TÍNH & TIẾP ĐẤT)
    // =========================================================================
    bindDragEvents() {
      this._onPointerDown = (e) => {
        // Bỏ qua nếu nhấp vào tai, má, mũi
        if (
          e.target.closest('#Ear_Left') ||
          e.target.closest('#Ear_Right') ||
          e.target.closest('#Cheek_Left_Group') ||
          e.target.closest('#Cheek_Right_Group') ||
          e.target.closest('#Nose_Group')
        ) {
          return;
        }

        e.preventDefault();
        this.dragStartedOnTummy = !!e.target.closest('#Tummy_Group');
        this.isGrabbed = true;
        this.hasMovedDrag = false;
        this.dragClickStart = { x: e.clientX, y: e.clientY };
        this.resetIdleTimer();

        const rect = this.container.getBoundingClientRect();
        this.pos = { x: rect.left, y: rect.top };
        this.pointerOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };

        this.lastPointer = {
          x: e.clientX,
          y: e.clientY,
          time: performance.now()
        };
        this.velocity = { x: 0, y: 0 };
        this.inertiaTilt = 0;
        this.shakeHistory = [];
        this.shakeReversals = [];
        this.lastShakeDir = 0;

        this.container.style.left = `${this.pos.x}px`;
        this.container.style.top = `${this.pos.y}px`;
        this.container.style.bottom = 'auto';
        this.container.style.right = 'auto';

        this.stage.classList.add('is-grabbed');
        this.stage.classList.remove('is-landing');

        if (!this.isDizzy) {
          this.setFaceExpression('AIRBORNE');
        }

        window.addEventListener('pointermove', this._onPointerMove);
        window.addEventListener('pointerup', this._onPointerUp);
        window.addEventListener('pointercancel', this._onPointerUp);
      };

      this._onPointerMove = (e) => {
        if (!this.isGrabbed) return;

        if (Math.hypot(e.clientX - this.dragClickStart.x, e.clientY - this.dragClickStart.y) > 6) {
          this.hasMovedDrag = true;
        }

        const now = performance.now();
        const dt = Math.max(1, now - this.lastPointer.time);
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;

        const instVx = dx / dt;
        const instVy = dy / dt;
        this.velocity.x = this.velocity.x * 0.65 + instVx * 0.35;
        this.velocity.y = this.velocity.y * 0.65 + instVy * 0.35;

        // Easter Egg: Theo dõi rung lắc chuột (Dizzy Shake)
        this.trackDizzyShake(dx, instVx, now);

        this.lastPointer = { x: e.clientX, y: e.clientY, time: now };

        // Quán tính lắc lư (Inertia Sway): Thân nghiêng ngược hướng kéo
        const targetTilt = Math.max(-24, Math.min(24, -this.velocity.x * 18));
        this.inertiaTilt = this.inertiaTilt * 0.7 + targetTilt * 0.3;

        // Giới hạn nghiêm ngặt chỉ trong vùng Canvas (không trèo ra ngoài topbar)
        const bounds = this.getCanvasBounds();
        this.pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, e.clientX - this.pointerOffset.x));
        this.pos.y = Math.max(bounds.minY, Math.min(bounds.maxY, e.clientY - this.pointerOffset.y));

        this.container.style.left = `${this.pos.x}px`;
        this.container.style.top = `${this.pos.y}px`;
        this.stage.style.transform = `rotate(${this.inertiaTilt.toFixed(1)}deg)`;
      };

      this._onPointerUp = (e) => {
        if (!this.isGrabbed) return;
        this.isGrabbed = false;
        this.resetIdleTimer();

        window.removeEventListener('pointermove', this._onPointerMove);
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('pointercancel', this._onPointerUp);

        this.stage.classList.remove('is-grabbed');
        this.stage.style.transform = 'none';

        const wasMoved = this.hasMovedDrag;
        setTimeout(() => {
          this.hasMovedDrag = false;
        }, 50);

        // Phản hồi khi nhấp chuột nhẹ vào người mà không kéo (Click on body)
        if (!wasMoved) {
          if (this.dragStartedOnTummy) {
            this.dragStartedOnTummy = false;
            return;
          }
          this.setFaceExpression('HAPPY');
          this.stage.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
          this.stage.style.transform = 'scale(1.08, 0.94)';
          this.say('Ơi, Nori đây! Sao vậy pạnnn?!', 2800);
          setTimeout(() => {
            this.stage.style.transform = 'none';
            setTimeout(() => {
              this.stage.style.transition = '';
              this.setFaceExpression('NEUTRAL');
            }, 180);
          }, 200);
          return;
        }

        // 1. Kiểm tra thả Nori về gần gốc tọa độ Canvas (0, 0)
        const canvas = document.getElementById('canvas2d');
        if (canvas && global.Vec2D && global.Vec2D.gridInfo2D) {
          const crect = canvas.getBoundingClientRect();
          const originX = crect.left + global.Vec2D.gridInfo2D.cx;
          const originY = crect.top + global.Vec2D.gridInfo2D.cy;
          const noriCenterX = this.pos.x + 60;
          const noriCenterY = this.pos.y + 70;
          const distToOrigin = Math.hypot(noriCenterX - originX, noriCenterY - originY);

          if (distToOrigin < 70) {
            this.returnToOrigin();
            return;
          }
        }

        // 2. Xử lý thả khi đang bị chóng mặt (Dizzy Stumble)
        if (this.isDizzy) {
          this.triggerDizzyLanding();
          return;
        }

        // 3. Tiếp đất thông thường với nảy Squash & Stretch trong Canvas
        const bounds = this.getCanvasBounds();
        this.pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.pos.x));
        this.pos.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.pos.y));
        this.container.style.left = `${this.pos.x}px`;
        this.container.style.top = `${this.pos.y}px`;

        this.savePosition();

        this.stage.classList.add('is-landing');
        this.setFaceExpression('HAPPY_LAND');
        this.say('Tiếp đất an toàn!', 2000);

        setTimeout(() => {
          this.stage.classList.remove('is-landing');
          this.setFaceExpression('NEUTRAL');
        }, 550);
      };

      this.stage.addEventListener('pointerdown', this._onPointerDown);
    }

    // =========================================================================
    // 3. ELASTIC EAR SPRING PHYSICS (KÉO VÉO TAI ĐÀN HỒI AN TOÀN)
    // =========================================================================
    bindEarPhysicsEvents() {
      const earLeft = document.getElementById('Ear_Left');
      const earRight = document.getElementById('Ear_Right');

      const setupEarPull = (earEl, side) => {
        if (!earEl) return;

        earEl.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();

          this.isEarPulling = side;
          this.resetIdleTimer();

          let hasDraggedEar = false;
          const downX = e.clientX;
          const downY = e.clientY;

          const rect = earEl.getBoundingClientRect();
          // Điểm neo gốc tai gắn vào sọ: 72% chiều rộng đối với tai trái, 28% đối với tai phải
          const rootX = (side === 'left') ? (rect.left + rect.width * 0.72) : (rect.left + rect.width * 0.28);
          const rootY = rect.top + rect.height * 0.78;

          this.setFaceExpression('EAR_PULLED', side);

          let lastTilt = 0;
          let lastStretch = 1.0;

          const onEarMove = (moveEvt) => {
            if (this.isEarPulling !== side) return;

            if (Math.hypot(moveEvt.clientX - downX, moveEvt.clientY - downY) > 5) {
              hasDraggedEar = true;
            }

            const dx = moveEvt.clientX - rootX;
            const dy = moveEvt.clientY - rootY;
            const pullDist = Math.hypot(dx, dy);

            // Khoảng kéo vượt ngưỡng nghỉ (~16px)
            const excess = Math.max(0, pullDist - 16);

            // Độ dãn theo trục dọc: tối đa 1.75x (mềm dẻo tự nhiên)
            const stretch = 1.0 + Math.min(0.75, excess * 0.022);
            // Độ co thắt trục ngang (Poisson contraction)
            const compress = Math.max(0.70, 1.0 / Math.sqrt(stretch));

            // Góc nghiêng theo hướng kéo, mở rộng biên độ quay tự nhiên lên [-72deg, 72deg]
            const mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            const restAngle = (side === 'left') ? -135 : -45;
            let angleDiff = mouseAngle - restAngle;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            const tilt = Math.max(-72, Math.min(72, angleDiff * 0.88));

            lastTilt = tilt;
            lastStretch = stretch;

            earEl.style.transform = `rotate(${tilt.toFixed(1)}deg) scale(${compress.toFixed(2)}, ${stretch.toFixed(2)})`;
          };

          const onEarRelease = () => {
            if (this.isEarPulling !== side) return;
            this.isEarPulling = null;

            window.removeEventListener('pointermove', onEarMove);
            window.removeEventListener('pointerup', onEarRelease);
            window.removeEventListener('pointercancel', onEarRelease);

            // Nếu người dùng chỉ bấm/chạm nhẹ vào tai mà không kéo: vẫy tai giật nảy
            if (!hasDraggedEar) {
              this.triggerEarTwitch(earEl, side);
              return;
            }

            // Kéo dãn thả tay: Kích hoạt dao động tắt dần damped harmonic oscillator
            this.animateEarSpringSnap(earEl, lastTilt, lastStretch);
          };

          window.addEventListener('pointermove', onEarMove);
          window.addEventListener('pointerup', onEarRelease);
          window.addEventListener('pointercancel', onEarRelease);
        });

        earEl.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.triggerEarTwitch(earEl, side);
        });
      };

      setupEarPull(earLeft, 'left');
      setupEarPull(earRight, 'right');
    }

    triggerEarTwitch(earEl, side) {
      if (this.isEarTwitching) return;
      this.isEarTwitching = true;
      this.resetIdleTimer();
      earEl.style.transition = 'transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1)';
      earEl.style.transform = (side === 'left') ? 'rotate(-32deg)' : 'rotate(32deg)';
      this.setFaceExpression('HAPPY');
      this.say('Ê nhột tai nha:))', 2200);

      setTimeout(() => {
        earEl.style.transform = 'none';
        setTimeout(() => {
          earEl.style.transition = '';
          this.setFaceExpression('NEUTRAL');
          this.isEarTwitching = false;
        }, 160);
      }, 200);
    }

    animateEarSpringSnap(earEl, initialTilt, initialStretch) {
      const omega = 32;
      const zeta = 0.24;
      const durationMs = 450;
      const startTime = performance.now();

      this.setFaceExpression('EAR_SNAP');
      this.say('Tai tui dùng để nghịch hả:>', 1800);

      const frame = (now) => {
        const elapsed = now - startTime;
        if (elapsed >= durationMs) {
          earEl.style.transform = 'none';
          this.setFaceExpression('NEUTRAL');
          return;
        }

        const tSec = elapsed / 1000;
        const decay = Math.exp(-zeta * omega * tSec);
        const curTilt = initialTilt * decay * Math.cos(omega * tSec);
        const curStretch = 1.0 + (initialStretch - 1.0) * decay * Math.cos(omega * tSec);
        const curCompress = Math.max(0.70, 1.0 / Math.sqrt(curStretch));

        earEl.style.transform = `rotate(${curTilt.toFixed(1)}deg) scale(${curCompress.toFixed(2)}, ${curStretch.toFixed(2)})`;
        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    }

    // =========================================================================
    // 4. EASTER EGG 1: VÉO MÁ MOCHI (CHEEK PINCH & MOCHI HEAD SQUISH)
    // =========================================================================
    bindCheekPhysicsEvents() {
      const cheekL = document.getElementById('Cheek_Left_Group');
      const cheekR = document.getElementById('Cheek_Right_Group');

      const setupCheekPinch = (cheekGroup, side) => {
        if (!cheekGroup) return;

        cheekGroup.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();

          this.isCheekPinching = side;
          this.resetIdleTimer();

          let hasDraggedCheek = false;
          const downX = e.clientX;
          const downY = e.clientY;

          const rect = cheekGroup.getBoundingClientRect();
          const startX = rect.left + rect.width / 2;
          const startY = rect.top + rect.height / 2;

          this.setFaceExpression('CHEEK_PINCH', side);

          const onCheekMove = (moveEvt) => {
            if (this.isCheekPinching !== side) return;

            const dx = moveEvt.clientX - startX;
            const dy = moveEvt.clientY - startY;

            if (Math.hypot(dx, dy) > 4) {
              hasDraggedCheek = true;
            }

            // Chuyển đổi từ pixel màn hình sang tọa độ SVG (tỷ lệ 100/120 = 0.833)
            const svgDx = dx * 0.833;
            const svgDy = dy * 0.833;

            this.lastCheekDx = svgDx;
            this.lastCheekDy = svgDy;

            this.applyCheekDeform(side, svgDx, svgDy);
          };

          const onCheekRelease = () => {
            if (this.isCheekPinching !== side) return;
            this.isCheekPinching = null;

            window.removeEventListener('pointermove', onCheekMove);
            window.removeEventListener('pointerup', onCheekRelease);
            window.removeEventListener('pointercancel', onCheekRelease);

            // Nếu chỉ chạm/nhấp vào má mà không kéo: nảy má bánh bao và hướng dẫn
            if (!hasDraggedCheek) {
              this.triggerCheekBounce(side);
              return;
            }

            // Kéo dãn thả tay: Kích hoạt dao động đàn hồi má bánh bao Mochi
            this.animateCheekSpringSnap(side, this.lastCheekDx || 0, this.lastCheekDy || 0);

            const mochiDialogues = [
              'Cái má tui dãn lắm rồi đó',
              'Uchacha >.<',
              'Mấy má nhéo quài đi nha @@'
            ];
            const randomText = mochiDialogues[Math.floor(Math.random() * mochiDialogues.length)];
            this.say(randomText, 2400);
          };

          window.addEventListener('pointermove', onCheekMove);
          window.addEventListener('pointerup', onCheekRelease);
          window.addEventListener('pointercancel', onCheekRelease);
        });

        cheekGroup.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.triggerCheekBounce(side);
        });
      };

      setupCheekPinch(cheekL, 'left');
      setupCheekPinch(cheekR, 'right');
    }

    applyCheekDeform(side, dx, dy) {
      const bodySilhouette = document.getElementById('Body_Silhouette');
      const tummyPatch = document.getElementById('Tummy_Patch');
      const cheekGroup = document.getElementById(side === 'left' ? 'Cheek_Left_Group' : 'Cheek_Right_Group');
      if (!bodySilhouette || !cheekGroup) return;

      if (side === 'left') {
        // dx < 0 là kéo dãn sang trái (hướng ra ngoài)
        const pullX = Math.max(-16, Math.min(6, dx));
        const pullY = Math.max(-12, Math.min(12, dy));

        // 1. Deform body silhouette (thân nâu) - má tròn bầu bĩnh mochi
        const apexX = 15 + pullX;
        const apexY = 50 + pullY * 0.65;
        const c1X = 15 + pullX * 0.75;
        const c1Y = 64 + pullY * 0.45;
        const c2X = 15 + pullX * 0.75;
        const c2Y = 34 + pullY * 0.45;
        const bX = 21 + pullX * 0.25;
        const bY = 74 + pullY * 0.15;
        const tX = 28 + pullX * 0.25;
        const tY = 19 + pullY * 0.15;

        const bodyPathD = `M 50 19 C 72 19, 85 30, 85 47 C 85 62, 79 74, 69 79 C 59 84, 41 84, 31 79 C ${bX.toFixed(1)} ${bY.toFixed(1)}, ${c1X.toFixed(1)} ${c1Y.toFixed(1)}, ${apexX.toFixed(1)} ${apexY.toFixed(1)} C ${c2X.toFixed(1)} ${c2Y.toFixed(1)}, ${tX.toFixed(1)} ${tY.toFixed(1)}, 50 19 Z`;
        bodySilhouette.setAttribute('d', bodyPathD);

        // 2. Deform tummy/face patch (vùng mặt/má kem) - dãn mềm cùng má
        if (tummyPatch) {
          const tumApexX = 27 + pullX * 0.85;
          const tumApexY = 60 + pullY * 0.6;
          const tumC1X = 27 + pullX * 0.55;
          const tumC1Y = 72 + pullY * 0.35;
          const tumC2X = 27 + pullX * 0.55;
          const tumC2Y = 48 + pullY * 0.35;
          const tumBotX = 37 + pullX * 0.25;
          const tumTopX = 37 + pullX * 0.25;

          const tummyPathD = `M 50 43 C 63 43, 73 51, 73 63 C 73 74, 63 79, 50 79 C ${tumBotX.toFixed(1)} 79, ${tumC1X.toFixed(1)} ${tumC1Y.toFixed(1)}, ${tumApexX.toFixed(1)} ${tumApexY.toFixed(1)} C ${tumC2X.toFixed(1)} ${tumC2Y.toFixed(1)}, ${tumTopX.toFixed(1)} 43, 50 43 Z`;
          tummyPatch.setAttribute('d', tummyPathD);
        }

        // 3. Tịnh tiến má hồng: luôn nằm trọn vẹn trên phần má kem
        const blushDx = pullX * 0.52;
        const blushDy = pullY * 0.55;
        const stretchX = 1.0 + Math.abs(pullX) * 0.015;
        const compressY = Math.max(0.85, 1.0 / Math.sqrt(stretchX));
        cheekGroup.style.transform = `translate(${blushDx.toFixed(1)}px, ${blushDy.toFixed(1)}px) scale(${stretchX.toFixed(2)}, ${compressY.toFixed(2)})`;
      } else {
        // dx > 0 là kéo dãn sang phải (hướng ra ngoài)
        const pullX = Math.max(-6, Math.min(16, dx));
        const pullY = Math.max(-12, Math.min(12, dy));

        // 1. Deform body silhouette (thân nâu) - má tròn bầu bĩnh mochi
        const apexX = 85 + pullX;
        const apexY = 50 + pullY * 0.65;
        const c1X = 85 + pullX * 0.75;
        const c1Y = 34 + pullY * 0.45;
        const c2X = 85 + pullX * 0.75;
        const c2Y = 64 + pullY * 0.45;
        const tX = 72 + pullX * 0.25;
        const tY = 19 + pullY * 0.15;
        const bX = 79 + pullX * 0.25;
        const bY = 74 + pullY * 0.15;

        const bodyPathD = `M 50 19 C ${tX.toFixed(1)} ${tY.toFixed(1)}, ${c1X.toFixed(1)} ${c1Y.toFixed(1)}, ${apexX.toFixed(1)} ${apexY.toFixed(1)} C ${c2X.toFixed(1)} ${c2Y.toFixed(1)}, ${bX.toFixed(1)} ${bY.toFixed(1)}, 69 79 C 59 84, 41 84, 31 79 C 21 74, 15 62, 15 47 C 15 30, 28 19, 50 19 Z`;
        bodySilhouette.setAttribute('d', bodyPathD);

        // 2. Deform tummy/face patch (vùng mặt/má kem) - dãn mềm cùng má
        if (tummyPatch) {
          const tumTopX = 63 + pullX * 0.25;
          const tumC1X = 73 + pullX * 0.55;
          const tumC1Y = 48 + pullY * 0.35;
          const tumApexX = 73 + pullX * 0.85;
          const tumApexY = 60 + pullY * 0.6;
          const tumC2X = 73 + pullX * 0.55;
          const tumC2Y = 72 + pullY * 0.35;
          const tumBotX = 63 + pullX * 0.25;

          const tummyPathD = `M 50 43 C ${tumTopX.toFixed(1)} 43, ${tumC1X.toFixed(1)} ${tumC1Y.toFixed(1)}, ${tumApexX.toFixed(1)} ${tumApexY.toFixed(1)} C ${tumC2X.toFixed(1)} ${tumC2Y.toFixed(1)}, ${tumBotX.toFixed(1)} 79, 50 79 C 37 79, 27 74, 27 63 C 27 51, 37 43, 50 43 Z`;
          tummyPatch.setAttribute('d', tummyPathD);
        }

        // 3. Tịnh tiến má hồng: luôn nằm trọn vẹn trên phần má kem
        const blushDx = pullX * 0.52;
        const blushDy = pullY * 0.55;
        const stretchX = 1.0 + Math.abs(pullX) * 0.015;
        const compressY = Math.max(0.85, 1.0 / Math.sqrt(stretchX));
        cheekGroup.style.transform = `translate(${blushDx.toFixed(1)}px, ${blushDy.toFixed(1)}px) scale(${stretchX.toFixed(2)}, ${compressY.toFixed(2)})`;
      }
    }

    animateCheekSpringSnap(side, initialDx, initialDy) {
      const bodySilhouette = document.getElementById('Body_Silhouette');
      const tummyPatch = document.getElementById('Tummy_Patch');
      const cheekGroup = document.getElementById(side === 'left' ? 'Cheek_Left_Group' : 'Cheek_Right_Group');
      const omega = 28;
      const zeta = 0.22;
      const durationMs = 450;
      const startTime = performance.now();

      this.setFaceExpression('HAPPY');

      const frame = (now) => {
        const elapsed = now - startTime;
        if (elapsed >= durationMs) {
          if (bodySilhouette) bodySilhouette.setAttribute('d', DEFAULT_BODY_PATH);
          if (tummyPatch) tummyPatch.setAttribute('d', DEFAULT_TUMMY_PATH);
          if (cheekGroup) cheekGroup.style.transform = 'none';
          this.setFaceExpression('NEUTRAL');
          return;
        }

        const tSec = elapsed / 1000;
        const decay = Math.exp(-zeta * omega * tSec);
        const curDx = initialDx * decay * Math.cos(omega * tSec);
        const curDy = initialDy * decay * Math.cos(omega * tSec);

        this.applyCheekDeform(side, curDx, curDy);
        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    }

    triggerCheekBounce(side) {
      if (this.isCheekBouncing) return;
      this.isCheekBouncing = true;
      this.resetIdleTimer();
      const initialDx = (side === 'left') ? -10 : 10;
      this.say('Núng na núng nính kkk', 2400);
      this.animateCheekSpringSnap(side, initialDx, 0);
      setTimeout(() => {
        this.isCheekBouncing = false;
      }, 450);
    }

    // =========================================================================
    // 5. EASTER EGG 2: BÚNG MŨI HẮT XÌ (NOSE BOOP & 3-PHASE DRAMATIC SNEEZE)
    // =========================================================================
    bindNoseEvents() {
      const noseGroup = document.getElementById('Nose_Group');
      if (!noseGroup) return;

      noseGroup.addEventListener('pointerdown', (e) => this.triggerSneeze(e));
      noseGroup.addEventListener('click', (e) => this.triggerSneeze(e));
    }

    triggerSneeze(e) {
      if (this.isSneezing) return;
      this.isSneezing = true;
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      this.resetIdleTimer();
      const sneezeFX = document.getElementById('Sneeze_FX');

      // Pha 1: Hít thở dồn dập, run rẩy ngửa đầu chuẩn bị hắt xì (550ms)
      this.setFaceExpression('NOSE_WRINKLE');
      this.stage.classList.add('is-sneezing-inhale');
      this.say('Hắt... hắt... hắtttt...', 1200);

      setTimeout(() => {
        // Pha 2: HẮT XÌ NỔ TUNG! (Blast Snap 280ms)
        this.stage.classList.remove('is-sneezing-inhale');
        this.stage.classList.add('is-sneezing-blast');
        this.setFaceExpression('SNEEZE');
        if (sneezeFX) sneezeFX.style.opacity = '1';

        const sneezeReplies = [
          'Achewww! Cơ địa dễ ắt xì đóooo',
          'HẮT XÌ! Cái mũi sắp thành vòi nước rồi',
          'Á-chù! Con lạy mấy cha mấy má:))'
        ];
        this.say(sneezeReplies[Math.floor(Math.random() * sneezeReplies.length)], 2400);

        setTimeout(() => {
          // Pha 3: Thẫn thờ hồi phục sau cơn hắt xì (480ms)
          this.stage.classList.remove('is-sneezing-blast');
          if (sneezeFX) sneezeFX.style.opacity = '0';
          this.setFaceExpression('DROWSY');

          setTimeout(() => {
            this.setFaceExpression('NEUTRAL');
            this.isSneezing = false;
          }, 480);
        }, 280);
      }, 550);
    }

    // =========================================================================
    // 6. EASTER EGG 3: CHỌC BỤNG CƯỜI KHÚC KHÍCH (TUMMY SQUISH & SUPER TICKLE)
    // =========================================================================
    bindTummyEvents() {
      const tummy = document.getElementById('Tummy_Group');
      if (!tummy) return;

      let tummyDownTime = 0;
      let tummyDownPos = { x: 0, y: 0 };
      let tummyMoved = false;

      tummy.addEventListener('pointerdown', (e) => {
        tummyDownTime = performance.now();
        tummyDownPos = { x: e.clientX, y: e.clientY };
        tummyMoved = false;
        // Không stopPropagation để cho phép drag Nori nếu người dùng kéo Nori bằng thân
      });

      tummy.addEventListener('pointermove', (e) => {
        if (Math.hypot(e.clientX - tummyDownPos.x, e.clientY - tummyDownPos.y) > 6) {
          tummyMoved = true;
        }
      });

      tummy.addEventListener('pointerup', (e) => {
        const elapsed = performance.now() - tummyDownTime;
        const dist = Math.hypot(e.clientX - tummyDownPos.x, e.clientY - tummyDownPos.y);
        // Chỉ kích hoạt nếu nhấp nhẹ vào bụng (không phải thao tác kéo thả Nori)
        if (elapsed < 450 && dist < 8 && !tummyMoved && !this.isGrabbed) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerTickle();
        }
      });

      tummy.addEventListener('click', (e) => {
        if (!tummyMoved && !this.isGrabbed) {
          e.preventDefault();
          e.stopPropagation();
          this.triggerTickle();
        }
      });
    }

    triggerTickle() {
      if (this.isTickling) return;
      this.isTickling = true;
      this.resetIdleTimer();

      const tummyPatch = document.getElementById('Tummy_Patch');
      const laughTears = document.getElementById('Laugh_Tears');

      // Pha 1: Chọt lún bụng nhẹ nhàng (110ms)
      if (tummyPatch) {
        tummyPatch.style.transition = 'transform 0.11s cubic-bezier(0.2, 0.8, 0.4, 1)';
        tummyPatch.style.transform = 'scale(0.92, 0.90)';
        tummyPatch.style.transformOrigin = '50px 72px';
      }

      setTimeout(() => {
        // Pha 2: Bụng nảy êm dịu đàn hồi & cười khúc khích
        if (tummyPatch) {
          tummyPatch.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)';
          tummyPatch.style.transform = 'scale(1.06, 1.04)';
          setTimeout(() => {
            if (tummyPatch) {
              tummyPatch.style.transform = 'none';
              setTimeout(() => { if (tummyPatch) tummyPatch.style.transition = ''; }, 200);
            }
          }, 320);
        }

        this.setFaceExpression('TICKLE_LAUGH');
        this.stage.classList.add('is-super-tickled');
        if (laughTears) laughTears.style.opacity = '1';

        const tickleReplies = [
          'Nhột quá à! Đừng chọc bụng tui mờ!',
          'Eeeeeeh tha...thaaa',
          'Chắc mốt đi giảm mỡ bụng quá UWU'
        ];
        this.say(tickleReplies[Math.floor(Math.random() * tickleReplies.length)], 2600);

        setTimeout(() => {
          this.stage.classList.remove('is-super-tickled');
          if (laughTears) laughTears.style.opacity = '0';
          this.setFaceExpression('NEUTRAL');
          this.isTickling = false;
        }, 1600);
      }, 110);
    }

    // =========================================================================
    // 7. EASTER EGG 4: XOA ĐẦU VUỐT VE (HEAD PETTING & PURRING)
    // =========================================================================
    bindHeadPetEvents() {
      if (!this.stage) return;

      this.stage.addEventListener('pointermove', (e) => {
        if (this.isGrabbed || this.isEarPulling || this.isCheekPinching) return;

        const rect = this.stage.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        if (relY > 50) return;

        const now = performance.now();
        this.petStrokeHistory.push({ x: e.clientX, time: now });
        this.petStrokeHistory = this.petStrokeHistory.filter(p => now - p.time < 1200);

        let directionChanges = 0;
        for (let i = 2; i < this.petStrokeHistory.length; i++) {
          const dx1 = this.petStrokeHistory[i - 1].x - this.petStrokeHistory[i - 2].x;
          const dx2 = this.petStrokeHistory[i].x - this.petStrokeHistory[i - 1].x;
          if (dx1 * dx2 < -4) {
            directionChanges++;
          }
        }

        if (directionChanges >= 4 && !this.isPetting) {
          this.isPetting = true;
          this.resetIdleTimer();
          this.setFaceExpression('HAPPY');
          this.stage.classList.add('is-petting');

          const petReplies = [
            'Ư ư... đã đấy, đúng chỗ ngứa',
            'Muốn vuốt ve mãi thế này thoaiii'
          ];
          this.say(petReplies[Math.floor(Math.random() * petReplies.length)], 2500);

          setTimeout(() => {
            this.stage.classList.remove('is-petting');
            this.setFaceExpression('NEUTRAL');
            this.isPetting = false;
            this.petStrokeHistory = [];
          }, 2400);
        }
      });
    }

    // =========================================================================
    // 8. EASTER EGG 5: LẮC CHUỘT CHÓNG MẶT (DIZZY SWIRL SPIN)
    // =========================================================================
    trackDizzyShake(dx, instVx, now) {
      if (this.isDizzy) return;

      // Xác định hướng di chuyển ngang tức thời nếu biên độ đủ rõ (> 3px)
      if (Math.abs(dx) > 3) {
        const dir = dx > 0 ? 1 : -1;
        if (this.lastShakeDir !== 0 && dir !== this.lastShakeDir) {
          this.shakeReversals.push(now);
        }
        this.lastShakeDir = dir;
      }

      // Giữ các mốc đổi chiều trong 1400ms gần nhất
      this.shakeReversals = this.shakeReversals.filter(t => now - t < 1400);

      // Khi người dùng lắc chuột qua lại (ít nhất 3 lần đảo chiều = 4 lượt vung) => Kích hoạt Chóng mặt tiền đình!
      if (this.shakeReversals.length >= 3 && !this.isDizzy) {
        this.isDizzy = true;
        this.shakeReversals = [];
        this.setFaceExpression('DIZZY');
        this.say('Chời ơi là chời @@', 3000);
      }
    }

    triggerDizzyLanding() {
      this.stage.classList.add('is-dizzy-stumble');
      this.say('Nhức nhức cái đầu...', 2500);

      setTimeout(() => {
        this.stage.classList.remove('is-dizzy-stumble');
        this.setFaceExpression('NEUTRAL');
        this.isDizzy = false;
      }, 2000);
    }

    // =========================================================================
    // 9. EASTER EGG 6: CLICK LIÊN TỤC GIẬN DỖI (PUFF-UP BLOWFISH) & CLICK ĐÚP VỀ GỐC
    // =========================================================================
    bindRapidClickEvents() {
      if (!this.stage) return;

      this.stage.addEventListener('click', (e) => {
        // Bỏ qua nếu đang kéo hoặc tương tác tai, má, mũi, bụng
        if (
          this.isGrabbed ||
          this.isEarPulling ||
          this.isCheekPinching ||
          e.target.closest('#Ear_Left') ||
          e.target.closest('#Ear_Right') ||
          e.target.closest('#Cheek_Left_Group') ||
          e.target.closest('#Cheek_Right_Group') ||
          e.target.closest('#Nose_Group') ||
          e.target.closest('#Tummy_Group')
        ) {
          return;
        }

        const now = performance.now();
        this.clickTimestamps.push(now);
        this.clickTimestamps = this.clickTimestamps.filter(t => now - t < 2200);
        const count = this.clickTimestamps.length;

        // Bấm 5 lần liên tục: Kích hoạt Easter egg giận dỗi phồng má cá nóc!
        if (count >= 5 && !this.isPuffed) {
          this.isPuffed = true;
          this.clickTimestamps = [];
          this.setFaceExpression('POUT');
          this.stage.classList.add('is-puffed');

          const puffReplies = [
            'Phồng má giận luôn! Bấm gì mà bấm dữ vậy hử!',
            'Tui là bạn đồng hành học tập chứ hông phải đồ bóp xả stress đâu nha!'
          ];
          this.say(puffReplies[Math.floor(Math.random() * puffReplies.length)], 2800);

          setTimeout(() => {
            this.stage.classList.remove('is-puffed');
            this.setFaceExpression('NEUTRAL');
            this.isPuffed = false;
            this.say('Phù... tha lỗi cho bạn đó!', 1800);
          }, 2600);
          return;
        }
      });
    }

    bindDoubleTapReturn() {
      // Đã loại bỏ hoàn toàn tính năng nhấp đúp về gốc theo yêu cầu của người dùng
    }

    // =========================================================================
    // 11. HỆ THỐNG BIỂU CẢM KHUÔN MẶT ĐA DẠNG & ĐIỀU KHIỂN MẮT
    // =========================================================================
    setEyeState(side, state, curveType = 'happy') {
      const ball = document.getElementById(side === 'left' ? 'Eye_Left_Ball' : 'Eye_Right_Ball');
      const arc = document.getElementById(side === 'left' ? 'Eye_Left_Arc' : 'Eye_Right_Arc');
      const catch1 = document.getElementById(side === 'left' ? 'Eye_Left_Catch' : 'Eye_Right_Catch');
      const catch2 = document.getElementById(side === 'left' ? 'Eye_Left_Catch2' : 'Eye_Right_Catch2');
      const pupil = document.getElementById(side === 'left' ? 'Eye_Left_Pupil' : 'Eye_Right_Pupil');
      if (!ball || !arc || !catch1 || !catch2) return;

      if (state === 'closed') {
        ball.style.opacity = '0';
        catch1.style.opacity = '0';
        catch2.style.opacity = '0';
        arc.style.opacity = '1';
        if (pupil) pupil.style.transform = 'none';

        if (side === 'left') {
          if (curveType === 'sleep') {
            arc.setAttribute('d', 'M 33 48.5 Q 38 52.5 43 48.5');
          } else if (curveType === 'squeeze') {
            arc.setAttribute('d', 'M 33 49.5 Q 38 49.5 43 49.5');
          } else {
            // happy curve ^
            arc.setAttribute('d', 'M 33 50 Q 38 46.5 43 50');
          }
        } else {
          if (curveType === 'sleep') {
            arc.setAttribute('d', 'M 57 48.5 Q 62 52.5 67 48.5');
          } else if (curveType === 'squeeze') {
            arc.setAttribute('d', 'M 57 49.5 Q 62 49.5 67 49.5');
          } else {
            // happy curve ^
            arc.setAttribute('d', 'M 57 50 Q 62 46.5 67 50');
          }
        }
      } else {
        ball.style.opacity = '1';
        catch1.style.opacity = '1';
        catch2.style.opacity = '0.85';
        arc.style.opacity = '0';

        if (state === 'wide') {
          ball.setAttribute('rx', '6.0');
          ball.setAttribute('ry', '6.6');
        } else if (state === 'dizzy') {
          ball.setAttribute('rx', '4.2');
          ball.setAttribute('ry', '4.2');
          if (pupil) pupil.style.transform = 'none';
        } else {
          ball.setAttribute('rx', '5.2');
          ball.setAttribute('ry', '5.8');
        }
      }
    }

    setFaceExpression(expr, meta = null) {
      this.currentFaceExpr = expr;
      const mouth = document.getElementById('Mouth_Smile');
      const mouthTongue = document.getElementById('Mouth_Tongue');
      const browL = document.getElementById('Brow_Left');
      const browR = document.getElementById('Brow_Right');
      const sneezeFX = document.getElementById('Sneeze_FX');
      const laughTears = document.getElementById('Laugh_Tears');

      if (!mouth || !browL || !browR) return;

      // Reset các hiệu ứng phụ nếu không ở trạng thái đặc thù
      if (sneezeFX && expr !== 'SNEEZE') sneezeFX.style.opacity = '0';
      if (laughTears && expr !== 'TICKLE_LAUGH' && expr !== 'YAWN') laughTears.style.opacity = '0';
      if (mouthTongue && expr !== 'YAWN') mouthTongue.style.opacity = '0';
      mouth.setAttribute('fill', 'none');
      mouth.setAttribute('stroke', '#78350f');
      mouth.setAttribute('stroke-width', '1.9');

      switch (expr) {
        case 'AIRBORNE':
          this.setEyeState('left', 'wide');
          this.setEyeState('right', 'wide');
          browL.setAttribute('d', 'M 33 37 Q 39 33 45 37');
          browR.setAttribute('d', 'M 55 37 Q 61 33 67 37');
          mouth.setAttribute('d', 'M 47.5 61 A 2.5 2.5 0 1 0 52.5 61 A 2.5 2.5 0 1 0 47.5 61');
          break;

        case 'EAR_PULLED':
          if (meta === 'left') {
            this.setEyeState('left', 'closed', 'squeeze');
            this.setEyeState('right', 'open');
          } else {
            this.setEyeState('left', 'open');
            this.setEyeState('right', 'closed', 'squeeze');
          }
          browL.setAttribute('d', 'M 34 43 Q 39 39 45 42');
          browR.setAttribute('d', 'M 55 42 Q 61 39 66 43');
          mouth.setAttribute('d', 'M 46 61.5 Q 49 59.5 54 62');
          break;

        case 'CHEEK_PINCH':
          if (meta === 'left') {
            this.setEyeState('left', 'closed', 'happy');
            this.setEyeState('right', 'open');
            mouth.setAttribute('d', 'M 43 62 Q 47 58 52 61');
          } else {
            this.setEyeState('left', 'open');
            this.setEyeState('right', 'closed', 'happy');
            mouth.setAttribute('d', 'M 48 61 Q 53 58 57 62');
          }
          break;

        case 'NOSE_WRINKLE':
          this.setEyeState('left', 'closed', 'squeeze');
          this.setEyeState('right', 'closed', 'squeeze');
          browL.setAttribute('d', 'M 34 43 Q 39 44 45 43');
          browR.setAttribute('d', 'M 55 43 Q 61 44 66 43');
          mouth.setAttribute('d', 'M 47 60 Q 50 60.5 53 60');
          break;

        case 'SNEEZE':
          this.setEyeState('left', 'closed', 'squeeze');
          this.setEyeState('right', 'closed', 'squeeze');
          browL.setAttribute('d', 'M 34 44 Q 39 46 45 44');
          browR.setAttribute('d', 'M 55 44 Q 61 46 66 44');
          mouth.setAttribute('d', 'M 45 61 Q 50 67 55 61 Q 50 59.5 45 61 Z');
          mouth.setAttribute('fill', '#991b1b');
          if (sneezeFX) sneezeFX.style.opacity = '1';
          break;

        case 'TICKLE_LAUGH':
          // Mắt cười tít hình vòng cung ^ ^
          this.setEyeState('left', 'closed', 'happy');
          this.setEyeState('right', 'closed', 'happy');
          browL.setAttribute('d', 'M 33 36 Q 39 32 45 36');
          browR.setAttribute('d', 'M 55 36 Q 61 32 67 36');
          mouth.setAttribute('d', 'M 43 59 Q 50 68 57 59 Z');
          mouth.setAttribute('fill', '#dc2626');
          if (laughTears) laughTears.style.opacity = '1';
          break;

        case 'DIZZY':
          this.setEyeState('left', 'dizzy');
          this.setEyeState('right', 'dizzy');
          browL.setAttribute('d', 'M 34 42 Q 39 45 45 42');
          browR.setAttribute('d', 'M 55 42 Q 61 45 66 42');
          mouth.setAttribute('d', 'M 44 60 Q 47 57 50 60 Q 53 63 56 60');
          break;

        case 'POUT':
          this.setEyeState('left', 'open');
          this.setEyeState('right', 'open');
          browL.setAttribute('d', 'M 34 42 Q 39 39 45 42');
          browR.setAttribute('d', 'M 55 42 Q 61 39 66 42');
          mouth.setAttribute('d', 'M 46 62 Q 50 59.5 54 62');
          break;

        case 'EAR_SNAP':
          this.setEyeState('left', 'closed', 'squeeze');
          this.setEyeState('right', 'closed', 'squeeze');
          mouth.setAttribute('d', 'M 45 59.5 Q 50 63.0 55 59.5');
          break;

        case 'HAPPY_LAND':
        case 'HAPPY':
          this.setEyeState('left', 'closed', 'happy');
          this.setEyeState('right', 'closed', 'happy');
          browL.setAttribute('d', 'M 34 38 Q 39 35 45 38');
          browR.setAttribute('d', 'M 55 38 Q 61 35 66 38');
          mouth.setAttribute('d', 'M 44.5 59 Q 50 64.0 55.5 59');
          break;

        case 'YAWN':
          // Mắt nhắm tít dễ chịu, mày nâng nhẹ vòm thư giãn
          this.setEyeState('left', 'closed', 'happy');
          this.setEyeState('right', 'closed', 'happy');
          browL.setAttribute('d', 'M 34 38 Q 39 35 45 38');
          browR.setAttribute('d', 'M 55 38 Q 61 35 66 38');
          // Miệng há to ngáp hình bầu dục đứng, đặt thấp dưới mũi 4px (không bao giờ che mũi)
          mouth.setAttribute('d', 'M 47.2 60.5 C 47.2 59.2, 52.8 59.2, 52.8 60.5 C 54.0 64.2, 53.6 68.2, 50 68.2 C 46.4 68.2, 46.0 64.2, 47.2 60.5 Z');
          mouth.setAttribute('fill', '#451a03');
          mouth.setAttribute('stroke', '#78350f');
          mouth.setAttribute('stroke-width', '1.4');
          if (mouthTongue) mouthTongue.style.opacity = '1';
          if (laughTears) laughTears.style.opacity = '0.85';
          break;

        case 'DROWSY':
          this.setEyeState('left', 'closed', 'sleep');
          this.setEyeState('right', 'closed', 'sleep');
          browL.setAttribute('d', 'M 34 42 Q 39 42 45 42');
          browR.setAttribute('d', 'M 55 42 Q 61 42 66 42');
          mouth.setAttribute('d', 'M 47 60 Q 50 60.5 53 60');
          break;

        case 'NEUTRAL':
        default:
          this.setEyeState('left', 'open');
          this.setEyeState('right', 'open');
          browL.setAttribute('d', 'M 34 40.5 Q 39 38 45 40.5');
          browR.setAttribute('d', 'M 55 40.5 Q 61 38 66 40.5');
          mouth.setAttribute('d', 'M 45.5 59.5 Q 50 61.5 54.5 59.5');
          mouth.setAttribute('fill', 'none');
          mouth.setAttribute('stroke', '#78350f');
          mouth.setAttribute('stroke-width', '1.9');
          if (mouthTongue) mouthTongue.style.opacity = '0';
          break;
      }
    }

    scheduleNextBlink() {
      if (this.blinkTimer) clearTimeout(this.blinkTimer);
      const nextInterval = 3200 + Math.random() * 2500;
      this.blinkTimer = setTimeout(() => {
        this.triggerNaturalBlink();
      }, nextInterval);
    }

    triggerNaturalBlink() {
      if (this.isGrabbed || this.isEarPulling || this.isCheekPinching || this.isTickling || this.isSneezing || this.isIdleAnimating) {
        this.scheduleNextBlink();
        return;
      }

      this.isBlinking = true;
      this.setEyeState('left', 'closed', 'happy');
      this.setEyeState('right', 'closed', 'happy');

      setTimeout(() => {
        if (!this.isGrabbed && !this.isEarPulling && !this.isCheekPinching && !this.isTickling && !this.isSneezing && !this.isIdleAnimating) {
          this.setEyeState('left', 'open');
          this.setEyeState('right', 'open');
          this.isBlinking = false;

          if (Math.random() < 0.15) {
            setTimeout(() => {
              if (!this.isGrabbed && !this.isEarPulling && !this.isCheekPinching && !this.isTickling && !this.isSneezing && !this.isIdleAnimating) {
                this.isBlinking = true;
                this.setEyeState('left', 'closed', 'happy');
                this.setEyeState('right', 'closed', 'happy');
                setTimeout(() => {
                  this.setEyeState('left', 'open');
                  this.setEyeState('right', 'open');
                  this.isBlinking = false;
                  this.scheduleNextBlink();
                }, 100);
              } else {
                this.isBlinking = false;
                this.scheduleNextBlink();
              }
            }, 90);
            return;
          }
        } else {
          this.isBlinking = false;
        }
        this.scheduleNextBlink();
      }, 110);
    }

    triggerYawn() {
      if (this.isGrabbed || this.isEarPulling || this.isCheekPinching || this.isDizzy || this.isPuffed) return;
      this.isIdleAnimating = true;
      this.resetIdleTimer();

      const pawL = document.getElementById('Paw_Left');
      const pawR = document.getElementById('Paw_Right');
      const earL = document.getElementById('Ear_Left');
      const earR = document.getElementById('Ear_Right');

      // Pha 1: Hít sâu, vươn vai cao và giơ tay che miệng ngáp lịch sự (650ms)
      this.stage.style.transition = 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)';
      this.stage.style.transform = 'scale(0.96, 1.08) translateY(-6px)';

      if (pawR) {
        pawR.style.transition = 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)';
        pawR.style.transform = 'translate(-4px, -9px) rotate(-28deg)';
      }
      if (pawL) {
        pawL.style.transition = 'transform 0.55s ease-out';
        pawL.style.transform = 'translateY(-4px) rotate(14deg)';
      }
      if (earL && earR) {
        earL.style.transition = 'transform 0.55s ease-out';
        earR.style.transition = 'transform 0.55s ease-out';
        earL.style.transform = 'rotate(-10deg)';
        earR.style.transform = 'rotate(10deg)';
      }

      this.setFaceExpression('YAWN');
      const yawnReplies = [
        'Oaaa, học căng thẳng quá, vươn vai xíu nhé!',
        'Oaaap, nghỉ tay một tí cho đỡ mỏi mắt nha!',
        'Ươm... ngáp một cái cho tỉnh táo giải tiếp nào!'
      ];
      this.say(yawnReplies[Math.floor(Math.random() * yawnReplies.length)], 2800);

      // Pha 2: Giữ nhịp ngáp sảng khoái (1400ms)
      setTimeout(() => {
        // Pha 3: Thở ra nhẹ nhõm, hạ tay và mỉm cười thư thái (750ms)
        this.stage.style.transition = 'transform 0.75s cubic-bezier(0.34, 1.25, 0.64, 1)';
        this.stage.style.transform = 'none';

        if (pawR) {
          pawR.style.transition = 'transform 0.5s ease-out';
          pawR.style.transform = 'none';
        }
        if (pawL) {
          pawL.style.transition = 'transform 0.5s ease-out';
          pawL.style.transform = 'none';
        }
        if (earL && earR) {
          earL.style.transition = 'transform 0.5s ease-out';
          earR.style.transition = 'transform 0.5s ease-out';
          earL.style.transform = 'none';
          earR.style.transform = 'none';
        }

        this.setFaceExpression('HAPPY');
        setTimeout(() => {
          this.setFaceExpression('NEUTRAL');
          if (pawR) pawR.style.transition = '';
          if (pawL) pawL.style.transition = '';
          if (earL) earL.style.transition = '';
          if (earR) earR.style.transition = '';
          this.stage.style.transition = '';
          this.isIdleAnimating = false;
          this.resetIdleTimer();
        }, 750);
      }, 1400);
    }

    // =========================================================================
    // 12. KHO IDLE ANIMATION FSM TỰ ĐỘNG
    // =========================================================================
    resetIdleTimer() {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.triggerRandomIdleAnimation();
      }, 9000 + Math.random() * 5000);
    }

    triggerRandomIdleAnimation() {
      if (this.isGrabbed || this.isEarPulling || this.isCheekPinching || this.isIdleAnimating || !this.container || this.container.style.display === 'none') {
        this.resetIdleTimer();
        return;
      }

      this.isIdleAnimating = true;
      const rand = Math.floor(Math.random() * 4);

      if (rand === 0) {
        this.stage.style.transition = 'transform 0.4s ease';
        this.stage.style.transform = 'rotate(8deg) translateY(-2px)';
        this.say('Alo, còn ở đó không?', 2200);

        setTimeout(() => {
          this.stage.style.transform = 'none';
          setTimeout(() => {
            this.stage.style.transition = '';
            this.isIdleAnimating = false;
            this.resetIdleTimer();
          }, 400);
        }, 1800);

      } else if (rand === 1) {
        const earL = document.getElementById('Ear_Left');
        const earR = document.getElementById('Ear_Right');
        if (earL && earR) {
          earL.style.transform = 'rotate(-16deg)';
          setTimeout(() => { earL.style.transform = 'none'; }, 200);
          setTimeout(() => {
            earR.style.transform = 'rotate(16deg)';
            setTimeout(() => { earR.style.transform = 'none'; }, 200);
          }, 300);
        }
        setTimeout(() => {
          this.isIdleAnimating = false;
          this.resetIdleTimer();
        }, 800);

      } else if (rand === 2) {
        this.triggerYawn();

      } else {
        this.setFaceExpression('DROWSY');
        this.stage.style.transition = 'transform 1.2s ease-in';
        this.stage.style.transform = 'translateY(4px) rotate(-4deg)';

        setTimeout(() => {
          this.stage.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
          this.stage.style.transform = 'translateY(-3px) rotate(2deg)';
          this.setFaceExpression('AIRBORNE');
          this.say('Giật cả mình!', 2400);

          setTimeout(() => {
            this.stage.style.transform = 'none';
            this.setFaceExpression('NEUTRAL');
            this.stage.style.transition = '';
            this.isIdleAnimating = false;
            this.resetIdleTimer();
          }, 1200);
        }, 1400);
      }
    }

    // =========================================================================
    // 13. VÒNG LẶP DÕI MẮT VÀ VI CHUYỂN ĐỘNG SUY TƯỞNG SINH HỌC (LIVING GAZE LOOP)
    // =========================================================================
    startGazeLoop() {
      if (this.gazeRafId) return;
      this.gazeRafId = requestAnimationFrame(this._boundGazeLoop);
    }

    stopGazeLoop() {
      if (this.gazeRafId) {
        cancelAnimationFrame(this.gazeRafId);
        this.gazeRafId = null;
      }
    }

    gazeLoop() {
      if (!this.container || this.container.style.display === 'none') {
        this.gazeRafId = null;
        return;
      }

      const now = performance.now();
      const tSec = now * 0.001;

      // 1. Vi chuyển động liếc mắt suy tưởng tự nhiên (tương tự viewer2D tại gốc tọa độ)
      const wanderX = Math.sin(tSec * 0.75) * 1.5;
      const wanderY = Math.cos(tSec * 0.55) * 0.9;

      let targetX = wanderX;
      let targetY = wanderY;

      // 2. Kiểm tra nếu Nori đang ở trạng thái nhắm mắt hoặc chóng mặt
      const isEyeClosed = this.isBlinking ||
        this.currentFaceExpr === 'DROWSY' ||
        this.currentFaceExpr === 'YAWN' ||
        this.currentFaceExpr === 'SNEEZE' ||
        this.currentFaceExpr === 'TICKLE_LAUGH' ||
        this.currentFaceExpr === 'DIZZY' ||
        this.currentFaceExpr === 'NOSE_WRINKLE';

      if (!isEyeClosed && this.currentFaceExpr !== 'DIZZY') {
        if (this.isGrabbed) {
          // Khi đang bị người dùng bưng hoặc kéo: liếc nhẹ theo quán tính di chuyển hoặc nhìn xuống
          const velX = Math.max(-1.8, Math.min(1.8, this.velocity.x * 0.12));
          const velY = Math.max(-1.2, Math.min(1.2, this.velocity.y * 0.12));
          targetX = velX + wanderX * 0.3;
          targetY = velY + wanderY * 0.3;
        } else if (this.mousePos && this.stage) {
          // Khi thả tự do: kết hợp dõi theo con trỏ chuột và vi chuyển động tự nhiên
          const stageRect = this.stage.getBoundingClientRect();
          const noriCenterX = stageRect.left + stageRect.width * 0.5;
          const noriCenterY = stageRect.top + stageRect.height * 0.45;

          const dx = this.mousePos.x - noriCenterX;
          const dy = this.mousePos.y - noriCenterY;
          const dist = Math.hypot(dx, dy);

          if (dist > 2) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            const trackDist = Math.min(1.85, dist / 80);
            const mouseGazeX = dirX * trackDist;
            const mouseGazeY = dirY * (trackDist * 0.75);

            // Hòa trộn 60% dõi theo con trỏ + 40% vi chuyển động suy tưởng
            targetX = mouseGazeX * 0.60 + wanderX * 0.40;
            targetY = mouseGazeY * 0.60 + wanderY * 0.40;
          }
        }

        // Giới hạn tầm mắt trong hốc mắt an toàn (clamp max radius 1.85px)
        const gazeRadius = Math.hypot(targetX, targetY);
        if (gazeRadius > 1.85) {
          targetX = (targetX / gazeRadius) * 1.85;
          targetY = (targetY / gazeRadius) * 1.85;
        }

        // Nội suy mượt mà 60 FPS (lerp damping 0.12)
        this.currentGaze.x += (targetX - this.currentGaze.x) * 0.12;
        this.currentGaze.y += (targetY - this.currentGaze.y) * 0.12;

        const pupilL = document.getElementById('Eye_Left_Pupil');
        const pupilR = document.getElementById('Eye_Right_Pupil');
        if (pupilL && pupilR) {
          const transformStr = `translate(${this.currentGaze.x.toFixed(2)}px, ${this.currentGaze.y.toFixed(2)}px)`;
          pupilL.style.transform = transformStr;
          pupilR.style.transform = transformStr;
        }
      }

      this.gazeRafId = requestAnimationFrame(this._boundGazeLoop);
    }

    destroy() {
      this.stopGazeLoop();
      window.removeEventListener('pointermove', this._onPointerTrack);
      window.removeEventListener('mouseleave', this._onPointerLeave);
      if (this.blinkTimer) clearTimeout(this.blinkTimer);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  }

  // Khởi tạo tự động khi trang tải xong hoặc sẵn sàng
  function initNoriFloatingCompanion() {
    global.App = global.App || {};
    if (!global.App.noriFloatingCompanion) {
      global.App.noriFloatingCompanion = new NoriFloatingCompanion();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNoriFloatingCompanion);
  } else {
    initNoriFloatingCompanion();
  }

  global.NoriFloatingCompanion = NoriFloatingCompanion;

})(typeof window !== 'undefined' ? window : this);
