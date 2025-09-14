
    function angleBetween() {
      callAPI("angle_between", {
        v1: JSON.parse(document.getElementById("v1_angle").value),
        v2: JSON.parse(document.getElementById("v2_angle").value)
      }, "result_angle");
    }