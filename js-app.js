// =========================================
//   DATA
// =========================================
let clients = JSON.parse(localStorage.getItem("clients") || "[]");
let projects = JSON.parse(localStorage.getItem("projects") || "[]");


// =========================================
//   RENDER CLIENTES
// =========================================
function renderClients(search = "") {
  const list = document.getElementById("clientList");
  const select = document.getElementById("projectClient");

  list.innerHTML = "";
  select.innerHTML = `<option value="">Selecciona un cliente</option>`;

  clients
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .forEach(c => {
      list.innerHTML += `
        <tr>
          <td>${c.name}</td>
          <td>${c.type}</td>
          <td><button onclick="deleteClient(${c.id})">Eliminar</button></td>
        </tr>
      `;
      select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}


// =========================================
//   RENDER PROYECTOS
// =========================================
function renderProjects(search = "", filter = "") {
  const list = document.getElementById("projectList");
  list.innerHTML = "";

  projects
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "" || p.status === filter)
    )
    .forEach(p => {
      const client = clients.find(c => c.id == p.clientId);

      list.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${client ? client.name : ""}</td>
          <td>$${p.amount}</td>
          <td>${p.status}</td>
          <td>${p.prob}%</td>
          <td>$${p.commission}</td>

          <td>${p.comments ? `<button onclick="alert('${p.comments.replace(/'/g," ")}')">Ver</button>` : "—"}</td>
          <td>${p.pdf ? `<a href="${p.pdf}" download="proyecto_${p.id}.pdf">PDF</a>` : "—"}</td>

          <td><button onclick="deleteProject(${p.id})">Eliminar</button></td>
        </tr>
      `;
    });
}


// =========================================
//   GUARDAR CLIENTE
// =========================================
document.getElementById("clientForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const name = clientName.value.trim();
  const type = clientType.value;

  if (!name) return;

  clients.push({ id: Date.now(), name, type });
  localStorage.setItem("clients", JSON.stringify(clients));

  clientForm.reset();
  renderClients();
});


// =========================================
//   GUARDAR PROYECTO
// =========================================
document.getElementById("projectForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const clientId = projectClient.value;
  const name = projectName.value.trim();
  const amount = Number(projectAmount.value);
  const status = projectStatus.value;
  const prob = Number(projectProb.value);
  const comments = projectComments.value.trim();
  const pdfFile = projectPDF.files[0];

  if (!clientId || !name || !amount) return;

  const client = clients.find(c => c.id == clientId);
  const commission = client.type == "1" ? amount * 0.01 : amount * 0.015;

  if (pdfFile) {
    const r = new FileReader();
    r.onload = e => saveProject(e.target.result);
    r.readAsDataURL(pdfFile);
  } else {
    saveProject(null);
  }

  function saveProject(pdfBase64) {
    projects.push({
      id: Date.now(),
      clientId,
      name,
      amount,
      status,
      prob,
      commission,
      comments,
      pdf: pdfBase64
    });

    localStorage.setItem("projects", JSON.stringify(projects));
    projectForm.reset();
    renderProjects();
  }
});


// =========================================
//   DELETE
// =========================================
function deleteClient(id) {
  clients = clients.filter(c => c.id !== id);
  localStorage.setItem("clients", JSON.stringify(clients));
  renderClients();
}

function deleteProject(id) {
  projects = projects.filter(p => p.id !== id);
  localStorage.setItem("projects", JSON.stringify(projects));
  renderProjects();
}


// =========================================
//   EXPORTAR A EXCEL
// =========================================
document.getElementById("exportAllBtn")?.addEventListener("click", () => {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), "Clientes");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projects), "Proyectos");

  XLSX.writeFile(wb, "crm_export.xlsx");
});


// =========================================
//   BUSQUEDAS
// =========================================
clientSearch?.addEventListener("input", e => {
  renderClients(e.target.value);
});

projectSearch?.addEventListener("input", e => {
  renderProjects(e.target.value, filterStatus.value);
});

globalSearch?.addEventListener("input", e => {
  renderClients(e.target.value);
  renderProjects(e.target.value, filterStatus.value);
});

filterStatus?.addEventListener("change", () => {
  renderProjects(projectSearch.value, filterStatus.value);
});


// =========================================
//   INIT
// =========================================
renderClients();
renderProjects();
