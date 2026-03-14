/**
 * ==================================================================================
 * OPERATION ANIMATION CONTROLLER (FINAL DETAILED VERSION)
 * ==================================================================================
 * Module xử lý hiệu ứng hình ảnh (VFX) cho các phép toán Vector.
 */

(function () {
  window.App = window.App || {};

  // --- 1. CẤU HÌNH (CONFIG) ---
  const CONFIG = {
    DURATION: {
      PRE_FADE: 300, // Thời gian ẩn các vector không liên quan
      POPUP: 600, // Thời gian đèn pin hiện ra
      BEAM_ON: 300, // Thời gian bật sáng
      SHADOW_GROW: 800, // Thời gian bóng đổ dài ra
      CLEANUP: 600, // Thời gian dọn dẹp và hiện kết quả thật
      SLIDE: 1000, // Thời gian trượt cho phép cộng
    },
    COLOR: {
      BEAM: 0xffeb3b,
      BEAM_2D_START: "rgba(255, 235, 59, 0.1)",
      BEAM_2D_END: "rgba(255, 235, 59, 0.0)",
      SHADOW: 0x111111,
      LAMP_BODY: 0x212121,
      LAMP_RING: 0xffc107,
      LAMP_GLASS: 0xffffff,
    },
    GEOMETRY: {
      LAMP_OFFSET_3D: 3.5, // Khoảng cách đèn 3D
      LAMP_OFFSET_2D: 160, // Khoảng cách đèn 2D (px)
      BEAM_SCALE: 1.2, // Hệ số mở rộng bán kính chùm sáng
    },
  };

  const Easing = {
    linear: function (t) {
      return t;
    },
    easeInOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeOutBack: function (t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    elasticOut: function (t) {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return (
        Math.pow(2, -3 * t) * Math.sin(((t * 15 - 0.75) * (2 * Math.PI)) / 3) +
        1
      );
    },
  };

  // ==================================================================================
  // 2. CÁC HÀM TIỆN ÍCH CỐT LÕI (CORE UTILS)
  // ==================================================================================

  // Hàm vẽ lại màn hình (Hỗ trợ cả 2D và 3D)
  function requestRedraw() {
    if (App.mode === "3D" && window.Vec3D) {
      if (typeof Vec3D.renderOnce === "function") {
        Vec3D.renderOnce();
      } else if (typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D(false);
      }
    } else if (App.mode === "2D" && window.Vec2D) {
      Vec2D.draw2DAllVectors();
    }
  }

  // Hàm chạy Tween Animation
  function runTween(duration, easing, onUpdate, onComplete) {
    const start = performance.now();
    function loop(now) {
      const p = Math.min((now - start) / duration, 1);
      onUpdate(easing(p));
      requestRedraw();
      if (p < 1) {
        requestAnimationFrame(loop);
      } else if (onComplete) {
        onComplete();
      }
    }
    requestAnimationFrame(loop);
  }

  // Hàm ẩn các vector không liên quan (Fade Out)
  // keepIds: Danh sách ID các vector cần GIỮ LẠI (không ẩn)
  function fadeUnrelatedVectors(keepIds, targetAlpha, callback) {
    if (!App.vectorList) {
      if (callback) callback();
      return;
    }

    // Chuyển ID sang String để so sánh chính xác
    const safeKeepIds = keepIds.map(String);

    // Lọc các vector KHÔNG nằm trong danh sách giữ lại
    const targetVectors = App.vectorList.filter(function (v) {
      return !safeKeepIds.includes(String(v.id)) && v.visible !== false;
    });

    if (targetVectors.length === 0) {
      if (callback) callback();
      return;
    }

    const startAlpha =
      targetVectors[0].alpha !== undefined ? targetVectors[0].alpha : 1;

    runTween(
      CONFIG.DURATION.PRE_FADE,
      Easing.linear,
      function (v) {
        const currentAlpha = startAlpha + (targetAlpha - startAlpha) * v;

        targetVectors.forEach(function (item) {
          item.alpha = currentAlpha;
          // Nếu đang ở 3D, cập nhật trực tiếp Mesh Opacity
          if (window.Vec3D && Vec3D.threeVecMap) {
            const group = Vec3D.threeVecMap.get(item.id);
            if (group) setOpacity3D(group, currentAlpha);
          }
        });
      },
      callback,
    );
  }

  // ==================================================================================
  // 3. XỬ LÝ 3D (3D IMPLEMENTATION)
  // ==================================================================================

  function get3DGroup(id) {
    return window.Vec3D && Vec3D.threeVecMap ? Vec3D.threeVecMap.get(id) : null;
  }

  function setOpacity3D(group, val) {
    if (!group) return;
    group.traverse(function (c) {
      if (c.isMesh && c.material) {
        c.material.transparent = true;
        c.material.opacity = val;
        c.material.depthWrite = val > 0.5;
        c.visible = val > 0.01;
      }
      if (c.isCSS2DObject && c.element) {
        c.element.style.opacity = val;
        c.visible = val > 0.01;
      }
    });
  }

  // Tạo Model Đèn Pin 3D (Hướng về trục +Z để lookAt hoạt động đúng)
  function buildFlashlight3D() {
    const group = new THREE.Group();
    const matBody = new THREE.MeshPhongMaterial({
      color: CONFIG.COLOR.LAMP_BODY,
      shininess: 40,
    });
    const matRing = new THREE.MeshPhongMaterial({
      color: CONFIG.COLOR.LAMP_RING,
      shininess: 80,
    });
    const matGlass = new THREE.MeshBasicMaterial({
      color: CONFIG.COLOR.LAMP_GLASS,
    });

    // 1. Thân đèn (Cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 32);
    bodyGeo.rotateX(Math.PI / 2); // Nằm ngang
    bodyGeo.translate(0, 0, -0.4); // Đẩy lùi về phía -Z (đuôi đèn)
    const body = new THREE.Mesh(bodyGeo, matBody);
    group.add(body);

    // 2. Đầu đèn (Cone)
    const headGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.3, 32);
    headGeo.rotateX(Math.PI / 2);
    headGeo.translate(0, 0, 0.15); // Đẩy về phía +Z (đầu đèn)
    const head = new THREE.Mesh(headGeo, matRing);
    group.add(head);

    // 3. Mặt kính
    const glassGeo = new THREE.CircleGeometry(0.22, 32);
    glassGeo.translate(0, 0, 0.31); // Mặt kính ở đầu +Z
    const glass = new THREE.Mesh(glassGeo, matGlass);
    group.add(glass);

    // 4. Nguồn sáng (SpotLight) hướng về +Z
    const spot = new THREE.SpotLight(CONFIG.COLOR.BEAM, 0, 20, 0.6, 0.5, 1);
    spot.position.set(0, 0, 0.2);
    spot.target.position.set(0, 0, 5); // Target ở phía trước (+Z)
    group.add(spot);
    group.add(spot.target);
    group.userData.light = spot;

    return group;
  }

  // Tạo chùm sáng hình nón
  function buildBeam3D(length, radiusEnd) {
    // Hình nón: Đỉnh tại 0, Đáy tại +length (hướng +Z)
    const geo = new THREE.CylinderGeometry(0.2, radiusEnd, length, 32, 1, true);
    geo.translate(0, -length / 2, 0); // Dịch để đỉnh nằm ở gốc
    geo.rotateX(-Math.PI / 2); // Quay hướng về +Z
    geo.translate(0, 0, 0.31); // Mặt kính đèn nằm ở z = -0.31. Ta dịch toàn bộ chùm sáng ra đó.
    const mat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLOR.BEAM,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  }

  // [ĐÃ SỬA] Hàm chiếu 3D: Ẩn vector thật, hiện bóng đen giả, sau đó tráo lại
  function runAnimProj3D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const res = App.vectorList.find((v) => v.id === resId); // res.alpha đang là 0
    if (!v1 || !res) return;

    const v1G = get3DGroup(v1Id);
    const resG = get3DGroup(resId);
    if (!v1G) return;

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const v1Tip = v1G.userData.tipLocal.clone();
      const resTip = resG
        ? resG.userData.tipLocal.clone()
        : new THREE.Vector3(
            res.vec[0],
            res.vec[1],
            res.vec[2] || 0,
          ).multiplyScalar(Vec3D.S3D.unitsPerWorld);
      const normal = new THREE.Vector3().subVectors(v1Tip, resTip);
      let dist = normal.length();
      if (dist < 0.01) {
        normal.set(0, 0, 1);
        dist = 3;
      }

      const lampPos = v1Tip
        .clone()
        .add(normal.normalize().multiplyScalar(CONFIG.GEOMETRY.LAMP_OFFSET_3D));
      const beamLen = dist + CONFIG.GEOMETRY.LAMP_OFFSET_3D;
      const beamRad = Math.max(1.5, resTip.length() * 1.0);

      // 1. Setup Đèn
      const flashlight = buildFlashlight3D();
      const beam = buildBeam3D(beamLen, beamRad);
      flashlight.add(beam);
      if (window.Vec3D && Vec3D._mathGroup) Vec3D._mathGroup.add(flashlight);
      flashlight.position.copy(lampPos);
      flashlight.lookAt(resTip);
      flashlight.scale.set(0, 0, 0);

      // 2. Tạo Bóng Đen (Clone từ resG)
      // Lưu ý: resG lúc này đang tàng hình (alpha=0, visible=false) do Controller chỉnh
      const shadow = resG ? resG.clone() : null;
      if (shadow) {
        // Phải bật visible cho bóng, vì bản gốc đang bị tắt
        shadow.visible = true;

        shadow.traverse(function (c) {
          if (c.isMesh) {
            // Ép màu đen tuyền bằng BasicMaterial
            c.material = new THREE.MeshBasicMaterial({
              color: 0x111111,
              transparent: true,
              opacity: 0,
              depthTest: false, // Vẽ đè lên tất cả
              depthWrite: false,
            });
            c.renderOrder = 99999;
          }
          if (c.isCSS2DObject) c.visible = false;
        });
        if (window.Vec3D) Vec3D._mathGroup.add(shadow);
        shadow.scale.set(1, 1, 1);
      }

      // 3. Animation
      runTween(
        CONFIG.DURATION.POPUP,
        Easing.easeOutBack,
        function (v) {
          flashlight.scale.setScalar(v);
        },
        function () {
          const lit = flashlight.userData.light;
          runTween(
            CONFIG.DURATION.BEAM_ON,
            Easing.linear,
            function (v) {
              beam.material.opacity = 0.15 * v;
              if (lit) lit.intensity = 2 * v;
              if (shadow) {
                setOpacity3D(shadow, v);
              }
            },
            function () {
              // Bóng mọc ra
              runTween(
                CONFIG.DURATION.SHADOW_GROW,
                Easing.easeInOutCubic,
                function (v) {},
                function () {
                  // Kết thúc: Tắt đèn, Bóng mờ, Thật hiện
                  runTween(
                    CONFIG.DURATION.CLEANUP,
                    Easing.linear,
                    function (v) {
                      beam.material.opacity = 0.15 * (1 - v);
                      if (lit) lit.intensity = 2 * (1 - v);
                      flashlight.scale.setScalar(1 - v);

                      // Bóng giả mờ đi
                      if (shadow) setOpacity3D(shadow, 1.0 * (1 - v));

                      // Vector thật hiện lên (thông qua biến alpha của data)
                      // Controller sẽ tự vẽ lại dựa trên alpha này
                      res.alpha = v;
                      if (resG) {
                        resG.visible = true; // Bật lại visible cho bản gốc
                        setOpacity3D(resG, v);
                      }
                    },
                    function () {
                      if (flashlight.parent)
                        flashlight.parent.remove(flashlight);
                      if (shadow && shadow.parent) shadow.parent.remove(shadow);

                      res.alpha = 1;
                      if (resG) {
                        resG.visible = true;
                        setOpacity3D(resG, 1);
                      }

                      fadeUnrelatedVectors([v1Id, v2Id, resId], 1, function () {
                        requestRedraw();
                      });
                    },
                  );
                },
              );
            },
          );
        },
      );
    });
  }

  // ==================================================================================
  // 4. XỬ LÝ 2D (2D IMPLEMENTATION)
  // ==================================================================================

  // Lấy tọa độ tuyệt đối (Absolute Coordinates) trên trang web
  function getAbsoluteCoords(vecX, vecY) {
    const cvs = document.getElementById("canvas2d");
    // Nếu không tìm thấy canvas hoặc Vec2D chưa sẵn sàng, trả về toạ độ 0 tạm thời
    if (!cvs || !window.Vec2D || !Vec2D.S2D) {
      console.warn("Vec2D hoặc Canvas chưa sẵn sàng!");
      return { x: 0, y: 0 };
    }

    const rect = cvs.getBoundingClientRect();
    const s = Vec2D.S2D;

    // Đảm bảo các thông số unit, offX, offY là số, nếu không thì mặc định là 0 hoặc 1
    const unit = Number(s.unit) || 20;
    const offX = Number(s.offX) || 0;
    const offY = Number(s.offY) || 0;

    // Tính toạ độ tâm Canvas so với Viewport
    const centerX = rect.left + rect.width / 2 + offX;
    const centerY = rect.top + rect.height / 2 + offY;

    // Chuyển toạ độ toán học sang Pixel màn hình
    const px = centerX + (Number(vecX) || 0) * unit;
    const py = centerY - (Number(vecY) || 0) * unit;

    return { x: px, y: py };
  }

  // Chạy Animation Chiếu 2D
  function runAnimProj2D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const res = App.vectorList.find((v) => v.id === resId);
    if (!v1 || !res) return;

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      // 1. Khởi tạo đối tượng đèn pin ảo (Ghost)
      // Đối tượng này chứa mọi thông số cần thiết để vẽ
      const flashlightGhost = {
        isFlashlight: true, // Cờ hiệu để renderer nhận biết
        v1: [...v1.vec], // Vector cản sáng
        res: [...res.vec], // Vector bóng đổ
        opacity: 0,
        beamOpacity: 0,
        shadowAlpha: 0,
        scale: 0,
      };

      // Đưa vào danh sách vẽ tạm thời của App
      App.tempGhosts = [flashlightGhost];
      res.alpha = 0; // Ẩn vector thật

      // 2. CHUỖI ANIMATION (CHỈ ĐIỀU KHIỂN CHỈ SỐ)
      // Đèn hiện ra (scale 0 -> 1)
      runTween(
        CONFIG.DURATION.POPUP,
        Easing.easeOutBack,
        function (v) {
          flashlightGhost.scale = v;
        },
        function () {
          // Bật sáng beam và hiện bóng đen cùng lúc
          runTween(
            CONFIG.DURATION.BEAM_ON,
            Easing.linear,
            function (v) {
              flashlightGhost.beamOpacity = v;
              flashlightGhost.shadowAlpha = v;
            },
            function () {
              // Chờ một nhịp cho người ta nhìn (giống 3D)
              setTimeout(() => {
                runTween(
                  CONFIG.DURATION.CLEANUP,
                  Easing.linear,
                  function (v) {
                    flashlightGhost.beamOpacity = 1 - v;
                    flashlightGhost.scale = 1 - v;
                    flashlightGhost.shadowAlpha = 1 - v;
                    res.alpha = v; // Hiện vector thật
                  },
                  function () {
                    App.tempGhosts = []; // Xóa đèn sau khi xong
                    res.alpha = 1;
                    fadeUnrelatedVectors([v1Id, v2Id, resId], 1, () =>
                      requestRedraw(),
                    );
                  },
                );
              }, 1000);
            },
          );
        },
      );
    });
  }

  // ==================================================================================
  // 5. PHÉP CỘNG (ADDITION)
  // ==================================================================================

  function createGhost3D(src, col) {
    if (!src) return null;
    const g = src.clone();
    g.userData.isGhost = true;
    setOpacity3D(g, 0.6);
    g.traverse(function (c) {
      if (c.isMesh) c.material.color.setHex(col);
      if (c.isCSS2DObject) c.visible = false;
    });
    return g;
  }

  function runAnimAdd3D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    if (!v1 || !v2) return;
    const v1G = get3DGroup(v1Id);
    const v2G = get3DGroup(v2Id);

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const ghost = createGhost3D(v2G, 0xffaa00);
      if (window.Vec3D) Vec3D._mathGroup.add(ghost);

      const start = new THREE.Vector3(0, 0, 0);
      const end = v1G.userData.tipLocal.clone();
      ghost.position.copy(start);

      const tRes = get3DGroup(resId);
      if (tRes) {
        tRes.visible = true;
        tRes.scale.set(1, 1, 1);
        setOpacity3D(tRes, 0);
      }

      runTween(
        CONFIG.DURATION.SLIDE,
        Easing.easeInOutCubic,
        function (v) {
          ghost.position.lerpVectors(start, end, v);
        },
        function () {
          if (tRes) {
            const dat = App.vectorList.find((x) => x.id === resId);
            runTween(
              CONFIG.DURATION.CLEANUP,
              Easing.linear,
              function (v) {
                setOpacity3D(tRes, v);
                if (dat) dat.alpha = v;
              },
              function () {
                if (dat) dat.alpha = 1;
                runTween(
                  400,
                  Easing.linear,
                  function (v) {
                    setOpacity3D(ghost, 0.6 * (1 - v));
                  },
                  function () {
                    if (ghost.parent) ghost.parent.remove(ghost);
                    fadeUnrelatedVectors([v1Id, v2Id, resId], 1, function () {
                      requestRedraw();
                    });
                  },
                );
              },
            );
          } else {
            ghost.parent.remove(ghost);
          }
        },
      );
    });
  }

  function runAnimAdd2D(v1Id, v2Id, resId) {
    const v1 = App.vectorList.find((v) => v.id === v1Id);
    const v2 = App.vectorList.find((v) => v.id === v2Id);
    const res = App.vectorList.find((v) => v.id === resId);
    if (!v1 || !v2 || !res) return;

    fadeUnrelatedVectors([v1Id, v2Id, resId], 0.1, function () {
      const g = {
        vec: v2.vec,
        colorCss: "#ffaa00",
        alpha: 0.6,
        isGhost: true,
        offset: [0, 0],
      };
      App.tempGhosts = [g];
      res.alpha = 0;
      const ex = v1.vec[0];
      const ey = v1.vec[1];

      runTween(
        CONFIG.DURATION.SLIDE,
        Easing.easeInOutCubic,
        function (v) {
          g.offset = [ex * v, ey * v];
        },
        function () {
          runTween(
            CONFIG.DURATION.CLEANUP,
            Easing.linear,
            function (v) {
              res.alpha = v;
            },
            function () {
              res.alpha = 1;
              runTween(
                400,
                Easing.linear,
                function (v) {
                  g.alpha = 0.6 * (1 - v);
                },
                function () {
                  App.tempGhosts = [];
                  fadeUnrelatedVectors([v1Id, v2Id, resId], 1, function () {
                    requestRedraw();
                  });
                },
              );
            },
          );
        },
      );
    });
  }

  // ==================================================================================
  // 6. MAIN EXPORT (API)
  // ==================================================================================

  App.animateOperation = function (op, ids, resId) {
    if (op === "add") {
      if (App.mode === "3D") {
        runAnimAdd3D(ids[0], ids[1], resId);
      } else {
        runAnimAdd2D(ids[0], ids[1], resId);
      }
    } else if (op === "projection") {
      if (App.mode === "3D") {
        runAnimProj3D(ids[0], ids[1], resId);
      } else {
        runAnimProj2D(ids[0], ids[1], resId);
      }
    }
  };
})();
