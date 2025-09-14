let mode = "2D";
let draw2d, draw3d;
let currentVector = null;

window.addEventListener("DOMContentLoaded", () => {
  const canvas2d = document.getElementById("plot2d");
  const container3d = document.getElementById("plot3d");

  draw2d = new Draw2D(canvas2d);
  draw2d.render();

  document.getElementById("drawBtn").addEventListener("click", () => {
    let v = JSON.parse(document.getElementById("vectorInput").value);
    currentVector = v;

    if (mode === "2D") {
      if (v.length === 2) draw2d.render(v);
      else if (v.length === 3) draw2d.render([v[0], v[1]]);
    } else {
      if (v.length === 2) v = [v[0], v[1], 0];
      draw3d.drawVector(v);
    }
  });

  document.getElementById("modeBtn").addEventListener("click", () => {
    if (mode === "2D") {
      mode = "3D";
      canvas2d.style.display = "none";
      container3d.style.display = "block";
      draw3d = new Draw3D(container3d);
      document.getElementById("modeBtn").innerText = "Chuyển sang 2D";

      if (currentVector) {
        let v = [...currentVector];
        if (v.length === 2) v = [v[0], v[1], 0];
        draw3d.drawVector(v);
      }
    } else {
      mode = "2D";
      canvas2d.style.display = "block";
      container3d.style.display = "none";
      document.getElementById("modeBtn").innerText = "Chuyển sang 3D";

      if (currentVector) {
        let v = [...currentVector];
        if (v.length === 3) v = [v[0], v[1]];
        draw2d.render(v);
      }
    }
  });
});
