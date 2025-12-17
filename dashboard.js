const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

let clients = [];
let projects = [];

function loadData(){
  clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
  projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');
}

function renderKPIs(){
  document.getElementById('d_total_clients').innerText = clients.length;
  document.getElementById('d_total_projects').innerText = projects.length;

  const ventas = projects
    .filter(p => p.estatus === 'ganado' || p.estatus === 'cerrado')
    .reduce((s,p)=> s + Number(p.amount || 0), 0);

  document.getElementById('d_ventas').innerText =
    '$' + ventas.toLocaleString(undefined,{minimumFractionDigits:2});
}

let chartStatus = null;
let chartClients = null;

function drawCharts(){
  loadData();
  renderKPIs();

  const statuses = ['activo','proceso','negociacion','ganado','cerrado','cancelado','perdido'];
  const amounts = statuses.map(
    s => projects.filter(p=>p.estatus===s).reduce((a,p)=>a+Number(p.amount||0),0)
  );

  /* ===== GRÁFICA ESTATUS (PASTEL) ===== */
  const ctx1 = document.getElementById('d_status');
  if(chartStatus) chartStatus.destroy();

  chartStatus = new Chart(ctx1,{
    type:'pie',
    data:{
      labels:statuses.map(s=>s.toUpperCase()),
      datasets:[{
        data:amounts,
        backgroundColor:[
          '#2563EB','#1D4ED8','#60A5FA',
          '#FBBF24','#F59E0B','#9CA3AF','#EF4444'
        ]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom' } }
    }
  });

  /* ===== GRÁFICA CLIENTES (PASTEL) ===== */
  const byClient = {};
  projects.forEach(p=>{
    byClient[p.clientId] = (byClient[p.clientId]||0) + Number(p.amount||0);
  });

  const arr = Object.entries(byClient)
    .map(([id,total])=>({
      name: clients.find(c=>c.id===id)?.nombre || 'Sin cliente',
      total
    }))
    .sort((a,b)=>b.total-a.total)
    .slice(0,8);

  const ctx2 = document.getElementById('d_clients');
  if(chartClients) chartClients.destroy();

  chartClients = new Chart(ctx2,{
    type:'pie',
    data:{
      labels:arr.map(a=>a.name),
      datasets:[{
        data:arr.map(a=>a.total),
        backgroundColor:[
          '#2563EB','#1D4ED8','#60A5FA',
          '#93C5FD','#FBBF24','#F59E0B','#9CA3AF'
        ]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom' } }
    }
  });

  /* ===== TABLA ===== */
  const table = document.getElementById('tableSummary');
  let html = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th>Estatus</th>
          <th>Cantidad</th>
          <th>Monto</th>
        </tr>
      </thead>
      <tbody>
  `;

  statuses.forEach(s=>{
    const list = projects.filter(p=>p.estatus===s);
    const total = list.reduce((a,p)=>a+Number(p.amount||0),0);
    html += `
      <tr>
        <td style="padding:8px">${s}</td>
        <td style="padding:8px">${list.length}</td>
        <td style="padding:8px">$${total.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  table.innerHTML = html;
}

/* ===== EXPORT ===== */
document.getElementById('dashExport').addEventListener('click', ()=>{
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(clients),
    'Clientes'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(projects),
    'Proyectos'
  );

  XLSX.writeFile(wb,'crm_dashboard_export.xlsx');
});

window.addEventListener('storage', drawCharts);
drawCharts();
