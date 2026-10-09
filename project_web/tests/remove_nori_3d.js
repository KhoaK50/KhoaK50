const fs = require('fs');
let content = fs.readFileSync('frontend_v2/js/viewers/viewer3D.js', 'utf8');

const target1Start = '    // [NORI 3D HAMSTER ENTITY HOOK]';
const target1End = 'Vec3D.setNori3DExpression(stateKey);\r\n  };';
const idx1Start = content.indexOf(target1Start);
const idx1End = content.indexOf(target1End);

if (idx1Start === -1 || idx1End === -1) {
  console.error('Target 1 not found! idx1Start:', idx1Start, 'idx1End:', idx1End);
  process.exit(1);
}

const replacement1 = `    // Dẹp sạch hoàn toàn Nori khỏi 3D: Nori chỉ hoạt động ở mặt phẳng 2D
    if (Vec3D._nori3DGroup) {
      Vec3D.removeNoriHamsterEntity3D();
    }
  };

  // --- THỰC THỂ LINH VẬT NORI: ĐÃ DẸP KHỎI KHÔNG GIAN 3D (CHỈ HOẠT ĐỘNG Ở 2D CHUẨN MỰC) ---
  Vec3D._nori3DGroup = null;
  Vec3D._noriTextureCache = {};

  Vec3D.removeNoriHamsterEntity3D = function () {
    if (!Vec3D._nori3DGroup) return;
    if (Vec3D._nori3DGroup.parent) {
      Vec3D._nori3DGroup.parent.remove(Vec3D._nori3DGroup);
    }
    Vec3D._nori3DGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m?.dispose?.());
      } else {
        obj.material?.dispose?.();
      }
    });
    Vec3D._nori3DGroup = null;
  };

  Vec3D.renderNoriHamsterEntity3D = function () {
    if (Vec3D._nori3DGroup) {
      Vec3D.removeNoriHamsterEntity3D();
    }
  };

  Vec3D.setNori3DExpression = function () {};
  Vec3D.applyTransformToNori3D = function () {
    if (Vec3D._nori3DGroup) {
      Vec3D.removeNoriHamsterEntity3D();
    }
  };`;

content = content.slice(0, idx1Start) + replacement1 + content.slice(idx1End + target1End.length);

const target2 = '    // [NORI 3D MATRIX TRANSFORMATION HOOK]\r\n    if (App.noriEntityActive && Vec3D._nori3DGroup) {\r\n      Vec3D.applyTransformToNori3D(M, u);\r\n    }\r\n';
if (!content.includes(target2)) {
  console.error('Target 2 not found!');
  process.exit(1);
}

content = content.replace(target2, '');

fs.writeFileSync('frontend_v2/js/viewers/viewer3D.js', content, 'utf8');
console.log('Successfully updated viewer3D.js!');
