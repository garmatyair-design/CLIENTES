const KEY_CLIENTS = 'crm_clients_v3';
const KEY_PROJECTS = 'crm_projects_v3';

let clients = JSON.parse(localStorage.getItem(KEY_CLIENTS) || '[]');
let projects = JSON.parse(localStorage.getItem(KEY_PROJECTS) || '[]');

function money(v){ return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2}); }

function calcKPIs(){
  document.getElementById('k_clients').innerText = clients.length;
  document.getElementById('k_projects').innerText = projects.length;

  const won = projects.filter(p=>['ganado','cerrado'].includes(p.estatus));
  const sales = won.reduce((s,p)=>s+Number(p.amount||0),0);
  document.getElementById('k_sales').innerText = '$'+money(sales);

  const ticket = projects.length ? sales / projects.length : 0;
  document.getElementById('k_ticket').innerText = '$'+money(ticket);

  const conversion = projects.length ? (won.length / projects.length)*100 : 0;
  document.getElementById('k_conversion').innerText = conversion.toFixed(1)+'%';

  let ct=0,cw=0;
  projects.forEach(p=>{
    const c = clients.find(x=>x.id===p.clientId);
    const rate = c?.tipo==='2'?0.015:0.01;
    const com = Number(p.amount||0)*rate;
    ct+=com;
    if(won.includes(p)) cw+=com;
  });

  document.getElementById('k_commission_total').innerText='$'+money(ct);
  document.getElementById('k_commission_won').innerText='$'+money(cw);
}

/* ===== GRÁFICAS ===== */
function drawCharts(){
  const statuses=['activo','proceso','negociacion','ganado','cerrado','cancelado','perdido'];
  const amounts=statuses.map(s=>projects.filter(p=>p.estatus===s).reduce((a,p)=>a+Number(p.amount||0),0));

  new Chart(chart_status,{
    type:'pie',
    data:{ labels:statuses, datasets:[{ data:amounts }] },
    options:{responsive:true}
  });

  const byClient={};
  projects.forEach(p=>byClient[p.clientId]=(byClient[p.clientId]||0)+Number(p.amount||0));
  new Chart(chart_clients,{
    type:'pie',
    data:{ labels:Object.keys(byClient).map(id=>clients.find(c=>c.id===id)?.nombre||''), datasets:[{ data:Object.values(byClient) }] }
  });
}

/* ===== HISTÓRICO ===== */
function drawHistory(){
  const years=[...new Set(projects.map(p=>new Date(p.openedAt).getFullYear()))];
  yearFilter.innerHTML=years.map(y=>`<option>${y}</option>`).join('');

  const year=Number(yearFilter.value);
  const month=monthFilter.value;

  const map={};
  projects.forEach(p=>{
    if(!p.openedAt) return;
    const d=new Date(p.openedAt);
    if(d.getFullYear()!==year) return;
    if(month!==''&&d.getMonth()!=month) return;
    const k=d.getMonth()+1;
    map[k]=(map[k]||0)+Number(p.amount||0);
  });

  new Chart(chart_history,{
    type:'line',
    data:{ labels:Object.keys(map), datasets:[{ data:Object.values(map), label:'Ventas' }] }
  });
}

yearFilter.onchange=drawHistory;
monthFilter.onchange=drawHistory;

calcKPIs();
drawCharts();
drawHistory();

document.getElementById('dashExport').onclick=()=>{
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(clients),'Clientes');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(projects),'Proyectos');
  XLSX.writeFile(wb,'crm_dashboard.xlsx');
};
