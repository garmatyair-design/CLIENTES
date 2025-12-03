// ======================================================
//   Cargar datos iniciales
// ======================================================
let clients = JSON.parse(localStorage.getItem("clients") || "[]");
let projects = JSON.parse(localStorage.getItem("projects") || "[]");

// ======================================================
//   Renderizar listas
// ======================================================
function renderClients() {
  const list = document.getElementById("clientList");
  const select = document.getElementById("projectClient");

  if (!list || !select) return;

  list.innerHTML = "";
  select.innerHTML = `<option value="">Selecciona un cliente</option>`;

  clients.forEach(c => {
    list.innerHTML += `
      <tr>
        <td style="padding:10px">${c.name}</td>
        <td style="padding:10px">${c.type}</td>
        <td style="padding:10px">
          <button onclick="deleteClient(${c.id})">Eliminar</button>
        </td>
      </tr>
    `;

    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function renderProjects() {
  const list = document.getElementById("projectList");
  if (!list) return;

  list.innerHTML = "";

  projects.forEach(p => {
    const client = clients.find(c => c.id == p.clientId);

    list.innerHTML += `
      <tr>
        <td style="padding:10px">${p.name}</td>
        <td style="padding:10px">${client ? client.name : ""}</td>
        <td style="padding:10px">$${p.amount}</td>
        <td style="padding:10px">${p.status}</td>
        <td style="padding:10px">${p.prob}%</td>
        <td style="padding:10px">$${p.commission}</td>

        <td style="padding:10px">
          ${p.comments ? `<button onclick="alert('${p.comments.replace(/'/g," ")}')">Ver</button>` : "—"}
        </td>

        <td style="padding:10px">
          ${p.pdf ? `<a href="${p.pdf}" download="proyecto_${p.id}.pdf">PDF</a>` : "—"}
        </td>

        <td style="padding:10px">
          <button onclick="deleteProject(${p.id})">Eliminar</button>
        </td>
      </tr>
    `;
  });
}

// ======================================================
//   Guardar Cliente
// ======================================================
document.getElementById("clientForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const name = document.getElementById("clientName").value.trim();
  const type = document.getElementById("clientType").value;

  if (!name) return;

  clients.push({
    id: Date.now(),
    name,
    type
  });

  localStorage.setItem("clients", JSON.stringify(clients));
  document.getElementById("clientForm").reset();
  renderClients();
});

// ======================================================
//   Guardar Proyecto
// ======================================================
document.getElementById("projectForm")?.addEventListener("submit", e => {
  e.preventDefault();

  const clientId = document.getElementById("projectClient").value;
  const name = document.getElementById("projectName").value.trim();
  const amount = Number(document.getElementById("projectAmount").value);
  const status = document.getElementById("projectStatus").value;
  const prob = Number(document.getElementById("projectProb").value);
  const comments = document.getElementById("projectComments").value.trim();
  const pdfFile = document.getElementById("projectPDF").files[0];

  if (!clientId || !name || !amount) return;

  const client = clients.find(c => c.id == clientId);
  const commission = client.type == "1" ? amount * 0.01 : amount * 0.015;

  if (pdfFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      saveProject(e.target.result);
    };
    reader.readAsDataURL(pdfFile);
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
    document.getElementById("projectForm").reset();
    renderProjects();
  }
});

// ======================================================
//   Eliminar
// ======================================================
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

// ======================================================
//   Exportar Excel
// ======================================================
document.getElementById("exportAllBtn")?.addEventListener("click", () => {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), "Clientes");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projects), "Proyectos");

  XLSX.writeFile(wb, "crm_export.xlsx");
});

// ======================================================
//   Inicializar
// ======================================================
renderClients();
renderProjects();
