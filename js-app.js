/* js-app.js
   Final unificado: CRUD clientes/proyectos, comisiones, export a excel.
   Storage keys: crm_clients_v2, crm_projects_v2
   No listeners duplicados. Safe for index.html + dashboard.html (same origin).
*/
(function(){
  const KEY_CLIENTS = 'crm_clients_v2';
  const KEY_PROJECTS = 'crm_projects_v2';

  // state
  let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
  let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');

  // DOM
  const clientForm = document.getElementById('clientForm');
  const clientName = document.getElementById('clientName');
  const clientType = document.getElementById('clientType');
  const clientList = document.getElementById('clientList');

  const projectForm = document.getElementById('projectForm');
  const projectClient = document.getElementById('projectClient');
  const projectName = document.getElementById('projectName');
  const projectAmount = document.getElementById('projectAmount');
  const projectStatus = document.getElementById('projectStatus');
  const projectProb = document.getElementById('projectProb');
  const projectList = document.getElementById('projectList');

  const exportAllBtn = document.getElementById('exportAllBtn');

  // helpers
  function saveClients(){ localStorage.setItem(KEY_CLIENTS, JSON.stringify(clients)); window.dispatchEvent(new Event('storage')); }
  function saveProjects(){ localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects)); window.dispatchEvent(new Event('storage')); }

  function formatMoney(n){ return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function calcCommission(project){
    const client = clients.find(c=>c.id===project.clientId);
    const pct = client && client.tipo==='2' ? 0.015 : 0.01;
    return Number(project.amount||0) * pct;
  }

  function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // render
  function renderClientOptions(){
    if(!projectClient) return;
    projectClient.innerHTML = '<option value="">Selecciona un cliente</option>';
    clients.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.nombre;
      projectClient.appendChild(opt);
    });
  }

  function renderClients(){
    if(!clientList) return;
    clientList.innerHTML = '';
    clients.forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="padding:10px">${escapeHtml(c.nombre)}</td>
                      <td style="padding:10px">${escapeHtml(c.tipo)}</td>
                      <td style="padding:10px">
                        <button data-id="${c.id}" class="edit-client" style="margin-right:8px;padding:6px 8px;background:#2563EB;color:#fff;border-radius:6px;border:0;cursor:pointer">Editar</button>
                        <button data-id="${c.id}" class="del-client" style="padding:6px 8px;background:#ef4444;color:#fff;border-radius:6px;border:0;cursor:pointer">Eliminar</button>
                      </td>`;
      clientList.appendChild(tr);
    });
  }

  function renderProjects(){
    if(!projectList) return;
    projectList.innerHTML = '';
    projects.forEach(p=>{
      const client = clients.find(c=>c.id===p.clientId) || {nombre:'Sin cliente'};
      const commission = calcCommission(p);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="padding:10px">${escapeHtml(p.nombre)}</td>
                      <td style="padding:10px">${escapeHtml(client.nombre)}</td>
                      <td style="padding:10px">$${formatMoney(p.amount)}</td>
                      <td style="padding:10px">${escapeHtml(p.estatus)}</td>
                      <td style="padding:10px">${p.probabilidad}%</td>
                      <td style="padding:10px">$${formatMoney(commission)}</td>
                      <td style="padding:10px">
                        <button data-id="${p.id}" class="edit-project" style="margin-right:8px;padding:6px 8px;background:#2563EB;color:#fff;border-radius:6px;border:0;cursor:pointer">Editar</button>
                        <button data-id="${p.id}" class="del-project" style="padding:6px 8px;background:#ef4444;color:#fff;border-radius:6px;border:0;cursor:pointer">Eliminar</button>
                      </td>`;
      projectList.appendChild(tr);
    });
  }

  // add client
  function handleAddClient(e){
    e.preventDefault();
    const name = (clientName && clientName.value.trim()) || '';
    const tipo = (clientType && clientType.value) || '1';
    if(!name){ alert('Nombre requerido'); return; }
    const newClient = { id:'c'+Date.now(), nombre:name, tipo };
    clients.push(newClient);
    saveClients();
    clientForm.reset();
    renderClientOptions(); renderClients(); renderProjects();
  }

  // add project
  function handleAddProject(e){
    e.preventDefault();
    const cid = projectClient && projectClient.value;
    const name = projectName && projectName.value.trim();
    const amount = Number(projectAmount && projectAmount.value || 0);
    const estatus = projectStatus && projectStatus.value || 'activo';
    const prob = Number(projectProb && projectProb.value || 0);
    if(!cid){ alert('Selecciona un cliente'); return; }
    if(!name){ alert('Nombre del proyecto requerido'); return; }
    const newProject = { id:'p'+Date.now(), clientId:cid, nombre:name, amount, estatus, probabilidad:prob, createdAt:new Date().toISOString() };
    projects.push(newProject);
    saveProjects();
    projectForm.reset();
    renderProjects();
  }

  // delegated handlers
  function clientListHandler(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const id = btn.dataset.id;
    if(btn.classList.contains('del-client')){
      if(!confirm('Eliminar cliente y sus proyectos?')) return;
      projects = projects.filter(p => p.clientId !== id);
      clients = clients.filter(c => c.id !== id);
      saveClients(); saveProjects();
      renderClientOptions(); renderClients(); renderProjects();
    } else if(btn.classList.contains('edit-client')){
      const client = clients.find(c=>c.id===id);
      if(!client) return;
      const newName = prompt('Editar nombre del cliente', client.nombre);
      if(newName === null) return;
      client.nombre = newName.trim() || client.nombre;
      const newTipo = prompt('Editar tipo (1 o 2)', client.tipo) || client.tipo;
      client.tipo = (newTipo === '2') ? '2' : '1';
      saveClients(); renderClientOptions(); renderClients(); renderProjects();
    }
  }

  function projectListHandler(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const id = btn.dataset.id;
    if(btn.classList.contains('del-project')){
      if(!confirm('Eliminar proyecto?')) return;
      projects = projects.filter(p => p.id !== id);
      saveProjects(); renderProjects();
    } else if(btn.classList.contains('edit-project')){
      const project = projects.find(p=>p.id===id);
      if(!project) return;
      const newName = prompt('Editar nombre proyecto', project.nombre);
      if(newName === null) return;
      project.nombre = newName.trim() || project.nombre;
      const newAmount = prompt('Editar monto', project.amount);
      if(newAmount !== null) project.amount = Number(newAmount) || project.amount;
      const newStatus = prompt('Editar estatus', project.estatus);
      if(newStatus !== null) project.estatus = newStatus || project.estatus;
      const newProb = prompt('Editar probabilidad (%)', project.probabilidad);
      if(newProb !== null) project.probabilidad = Number(newProb) || project.probabilidad;
      saveProjects(); renderProjects();
    }
  }

  // export all to excel (multiple sheets)
  function exportAllToExcel(){
    if(typeof XLSX === 'undefined'){ alert('XLSX library no cargada'); return; }
    const wb = XLSX.utils.book_new();
    const clientsData = clients.map(c => ({ ID: c.id, Nombre: c.nombre, Tipo: c.tipo }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientsData), 'Clientes');

    const projectsData = projects.map(p => {
      const client = clients.find(c=>c.id===p.clientId) || { nombre:'Sin cliente', tipo:'1' };
      return { ID:p.id, ClienteID:p.clientId, Cliente:client.nombre, Proyecto:p.nombre, Monto:p.amount, Estatus:p.estatus, Probabilidad:p.probabilidad, Comision: calcCommission(p) };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectsData), 'Proyectos');

    const ventas = projects.filter(p=>p.estatus==='ganado' || p.estatus==='cerrado').reduce((s,p)=>s+Number(p.amount||0),0);
    const kpi = [{ TotalClientes: clients.length, TotalProyectos: projects.length, VentasGanadas:ventas, TicketPromedio: projects.length ? (projects.reduce((s,p)=>s+Number(p.amount||0),0)/projects.length):0, FechaExport: new Date().toISOString() }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpi), 'KPIs');

    XLSX.writeFile(wb, 'crm_proyectos_export.xlsx');
  }

  // init listeners (avoid dupes)
  function initListeners(){
    if(clientForm) { clientForm.removeEventListener('submit', handleAddClient); clientForm.addEventListener('submit', handleAddClient); }
    if(projectForm) { projectForm.removeEventListener('submit', handleAddProject); projectForm.addEventListener('submit', handleAddProject); }
    if(clientList) { clientList.removeEventListener('click', clientListHandler); clientList.addEventListener('click', clientListHandler); }
    if(projectList) { projectList.removeEventListener('click', projectListHandler); projectList.addEventListener('click', projectListHandler); }
    if(exportAllBtn) { exportAllBtn.removeEventListener('click', exportAllToExcel); exportAllBtn.addEventListener('click', exportAllToExcel); }

    // expose to window for dashboard to call if needed
    window.exportAllToExcel = exportAllToExcel;
    window.getCRMClients = () => JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
    window.getCRMProjects = () => JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
  }

  // boot
  function boot(){
    renderClientOptions(); renderClients(); renderProjects(); initListeners();
  }

  boot();

  // helper used in export
  function calcCommission(p){
    const client = clients.find(c=>c.id===p.clientId);
    const pct = client && client.tipo==='2' ? 0.015 : 0.01;
    return Number(p.amount||0) * pct;
  }

  // listen storage changes (in case dashboard updates)
  window.addEventListener('storage', ()=>{
    clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
    projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
    renderClientOptions(); renderClients(); renderProjects();
  });

})(); // IIFE end

