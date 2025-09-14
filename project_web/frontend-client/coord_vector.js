function coordinates() {
    fetch(`${BASE_URL}/coordinates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            vector: JSON.parse(document.getElementById("coord_vector").value),
            basis: JSON.parse(document.getElementById("coord_basis").value)
        })
    })
    .then(res => res.json())
    .then(data => {
        let coords = data.coordinates;
        let basis = JSON.parse(document.getElementById("coord_basis").value);

        // Tạo chuỗi dạng linear combination
        let terms = coords.map((c, i) => `${c} [${basis[i].join(",")}]`);
        document.getElementById("result_coord").innerText =
            `[${coords.join(",")}] = ` + terms.join(" + ");
    })
    .catch(err => {
        document.getElementById("result_coord").innerText = "Lỗi: " + err;
    });
}
