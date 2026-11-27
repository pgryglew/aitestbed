const bikes = [
  {id:'stark',brand:'STARK FUTURE',name:'VARG MX 1.2',subtitle:'Pełnowymiarowy motocross · wyścigi',kind:'mx',label:'MX RACE',power:60,powerText:'60 / 80 KM',weight:118,battery:'7,2 kWh',range:'do 6 h*',charge:'ok. 2 h',price:'segment premium',color:'#e9e8e2',accent:'#a8cc2a',photo:'https://assets.starkfuture.com/frontend-assets/smx1-product/product_carousel_gray_3_mobile.webp',source:'https://www.starkfuture.com/products/stark-varg',sourceLabel:'STARK VARG MX 1.2'},
  {id:'sur-ron',brand:'SUR-RON',name:'Light Bee X',subtitle:'Lekki dirt bike · leśne trasy',kind:'trail',label:'TRAIL',power:8,powerText:'8 kW',weight:57,battery:'2,4 kWh',range:'do 75 km*',charge:'2–3,5 h',price:'sprawdź u dealera',color:'#e9e9e4',accent:'#e4f34b',photo:'https://ridepanther.com/cdn/shop/files/surron-light-bee-x-2026-white.jpg?v=1775081961&width=1600',fallback:'https://www.surronchile.cl/cdn/shop/files/DSCF8927_4a1c781d-e97d-480d-a52d-695ef3930659.png?v=1767450044&width=1200',source:'https://sur-ron.com/',sourceLabel:'SUR-RON Light Bee X'},
  {id:'talaria',brand:'TALARIA',name:'Sting R MX4',subtitle:'Kompaktowy off-road · MX / trail',kind:'trail',label:'MX / TRAIL',power:8,powerText:'8 kW',weight:66,battery:'2,7 kWh',range:'do 120 km*',charge:'ok. 3–4 h',price:'sprawdź u dealera',color:'#e9e9e4',accent:'#f08a48',photo:'https://ridethewind.ca/cdn/shop/files/talaria-sting-MX4-3-electric-motorcycle.jpg?v=1761764161&width=1946',source:'https://www.talaria-ebike.com/product/talaria-sting-r-mx4/',sourceLabel:'TALARIA Sting R MX4'},
  {id:'ktm',brand:'KTM',name:'Freeride E',subtitle:'Enduro · nowa generacja 2025',kind:'trail',label:'ENDURO',power:19.2,powerText:'19,2 kW',weight:112,battery:'5,5 kWh',range:'2–3 h*',charge:'1,5–8 h',price:'sprawdź u dealera',color:'#e9e9e4',accent:'#ff7028',photo:'https://www.motorrad-bilder.at/slideshows/291/023712/642682_MY25-KTM-FREERIDEE-EU-90-left_03_STUDIOIMAGES_EUROPEGLOBAL_STUDIO.jpg',source:'https://press.ktm.com/news-freshly-charged-2025-ktm-freeride-e-brings-new-energy-to-ktm-offroad-e-mobility?id=206881&l=uk&menueid=5904',sourceLabel:'KTM FREERIDE E 2025'}
];

const artwork = (bike) => `<img src="${bike.photo}" alt="${bike.brand} ${bike.name} — zdjęcie motocykla" data-bike-id="${bike.id}" loading="lazy" decoding="async">`;

const grid = document.getElementById('bike-grid');
const selected = new Set(['stark','sur-ron','talaria']);
let activeFilter = 'all';

function card(bike) {
  const on = selected.has(bike.id);
  return `<article class="bike-card" data-kind="${bike.kind}"><div class="bike-visual" style="--visual:${bike.color}">${artwork(bike)}<span class="model-code">VR—${String(bikes.indexOf(bike)+1).padStart(2,'0')}</span><span class="type-chip">${bike.label}</span></div><div class="bike-card-content"><span class="card-brand">${bike.brand}</span><h3>${bike.name}</h3><p class="subtitle">${bike.subtitle}</p><div class="mini-specs"><div><span>Moc max.</span><strong>${bike.powerText}</strong></div><div><span>Masa</span><strong>${bike.weight} kg</strong></div><div><span>Bateria</span><strong>${bike.battery}</strong></div><div><span>Zasięg / czas</span><strong>${bike.range}</strong></div></div><div class="card-bottom"><span class="price-note">${bike.price}</span><button type="button" class="compare-toggle ${on?'selected':''}" data-select="${bike.id}" aria-pressed="${on}">${on?'✓ Wybrano':'+ Porównaj'}</button></div></div></article>`;
}

function renderGrid() {
  const sort = document.getElementById('sort').value;
  let list = bikes.filter((b) => activeFilter === 'all' || b.kind === activeFilter);
  if (sort === 'power') list.sort((a,b) => b.power-a.power);
  if (sort === 'weight') list.sort((a,b) => a.weight-b.weight);
  grid.innerHTML = list.map(card).join('');
  grid.querySelectorAll('.bike-visual img').forEach((img) => {
    img.addEventListener('error', () => {
      const fallback = bikes.find((bike) => bike.id === img.dataset.bikeId);
      if (img.dataset.triedFallback !== 'true' && fallback?.fallback) {
        img.dataset.triedFallback = 'true';
        img.src = fallback.fallback;
        return;
      }
      img.parentElement.classList.add('image-fallback');
      img.remove();
    });
  });
  grid.querySelectorAll('[data-select]').forEach((button) => button.addEventListener('click', () => toggleBike(button.dataset.select)));
}

function renderCompare() {
  const chosen = bikes.filter((b) => selected.has(b.id));
  document.getElementById('selection-label').textContent = `${chosen.length} ${chosen.length === 1 ? 'model wybrany' : 'modele wybrane'} · możesz wybrać do 3`;
  const head = document.getElementById('compare-head');
  const body = document.getElementById('compare-body');
  head.innerHTML = `<tr><th>PARAMETR</th>${chosen.length ? chosen.map(b=>`<th><span class="th-brand">${b.brand}</span>${b.name}</th>`).join('') : '<th>Wybierz model powyżej, aby zobaczyć zestawienie</th>'}</tr>`;
  const rows = [['Moc maksymalna',b=>b.powerText],['Masa katalogowa',b=>`${b.weight} kg`],['Bateria',b=>b.battery],['Deklarowany zasięg / czas',b=>b.range],['Ładowanie',b=>b.charge],['Charakter',b=>b.subtitle],['Źródło danych',b=>`<a href="${b.source}" target="_blank" rel="noreferrer">${b.sourceLabel} ↗</a>`]];
  body.innerHTML = rows.map(([label,value])=>`<tr><td>${label}</td>${chosen.length?chosen.map(b=>`<td>${value(b)}</td>`).join(''):'<td>—</td>'}</tr>`).join('');
}

function toggleBike(id) {
  if (selected.has(id)) selected.delete(id);
  else if (selected.size < 3) selected.add(id);
  else { document.getElementById('selection-label').textContent = 'Wybierz maksymalnie 3 modele — usuń jeden z obecnych.'; return; }
  renderGrid(); renderCompare();
}

document.querySelectorAll('.filter').forEach((button)=>button.addEventListener('click',()=>{
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach((item)=>item.classList.toggle('active',item===button));
  renderGrid();
}));
document.getElementById('sort').addEventListener('change',renderGrid);
document.getElementById('reset-selection').addEventListener('click',()=>{selected.clear();renderGrid();renderCompare();});
renderGrid(); renderCompare();
