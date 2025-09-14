function basisAndDim() {
    fetch(`${BASE_URL}/basis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: JSON.parse(document.getElementById("vectors_basis").value) })
    })
    .then(res => res.json())
    .then(data => {
        // Hiển thị cơ sở và số chiều
        document.getElementById("result_basis").innerText =
            `Cơ sở:\n${JSON.stringify(data.basis, null, 2)}\nSố chiều: ${data.dimension}`;
    })
    .catch(err => {
        document.getElementById("result_basis").innerText = "Lỗi: " + err;
    });
}
