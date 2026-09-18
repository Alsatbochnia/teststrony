        const LS_ORDERS = 'bzuk_orders';
        const LS_DEVICES = 'bzuk_devices';
        const LS_KEYS = 'bzuk_keys';
        const LS_WASTE = 'bzuk_waste';
        const LS_LIMITS = 'bzuk_limits';
        const WASTE_TYPES = [
            'Odpady zmieszane',
            'Papier i tektura',
            'Szkło',
            'Plastik i metal',
            'Odpady BIO',
            'Odpady wielkogabarytowe',
            'Odpady budowlane (gruz)',
            'Zużyte opony',
            'Elektroodpady',
            'Odpady zielone'
        ];
        const today = () => new Date().toISOString().split('T')[0];
        const formatDate = (d) => d ? new Date(d).toLocaleDateString('pl-PL') : '';
        
        // === NOWA FUNKCJA FORMATOWANIA NUMERU TELEFONU Z KRESKAMI ===
        const formatPhone = (num) => {
            if (!num) return '';
            // Usuń wszystkie znaki oprócz cyfr
            const digits = num.replace(/\D/g, '');
            // Wstaw kreski co 3 cyfry: 123-456-789
            if (digits.length <= 3) return digits;
            if (digits.length <= 6) return digits.slice(0,3) + '-' + digits.slice(3);
            return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6,9);
        };
        
        document.getElementById('curr-date').textContent = new Date().toLocaleDateString('pl-PL', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
        let orders = JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
        let devices = JSON.parse(localStorage.getItem(LS_DEVICES) || '[]');
        let keysData = JSON.parse(localStorage.getItem(LS_KEYS) || '[]');
        let wasteRecords = JSON.parse(localStorage.getItem(LS_WASTE) || '[]');
        let limits = JSON.parse(localStorage.getItem(LS_LIMITS) || '{}');
        const save = () => {
            localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
            localStorage.setItem(LS_DEVICES, JSON.stringify(devices));
            localStorage.setItem(LS_KEYS, JSON.stringify(keysData));
            localStorage.setItem(LS_WASTE, JSON.stringify(wasteRecords));
            localStorage.setItem(LS_LIMITS, JSON.stringify(limits));
        };
        const statusColors = {
            'Przyjęte': 'bg-indigo-100 text-indigo-800',
            'Zweryfikowane': 'bg-sky-100 text-sky-800',
            'W realizacji': 'bg-amber-100 text-amber-800',
            'Zaplanowane': 'bg-purple-100 text-purple-800',
            'Wykonane': 'bg-green-100 text-green-800',
            'Zamknięte': 'bg-gray-200 text-gray-800',
            'Zgłoszone': 'bg-indigo-100 text-indigo-800',
            'Oczekujące na dostawę': 'bg-purple-100 text-purple-800',
            'Gotowe do dostarczenia': 'bg-green-100 text-green-800',
            'Dostarczone': 'bg-gray-200 text-gray-800',
            'Zgłoszony': 'bg-indigo-100 text-indigo-800',
            'Aktywny': 'bg-green-100 text-green-800',
            'Zawieszony': 'bg-gray-200 text-gray-800'
        };
        const normalizeText = (text) => {
            if (!text) return '';
            return text.toString().toLowerCase()
                .replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e')
                .replace(/ł/g,'l').replace(/ń/g,'n').replace(/ó/g,'o')
                .replace(/ś/g,'s').replace(/ż/g,'z').replace(/ź/g,'z');
        };
        // === INICJALIZACJA FORMULARZA ODPADÓW ===
        const wasteTypeOptions = WASTE_TYPES.map(t=>`<option>${t}</option>`).join('');
        document.getElementById('waste-type').innerHTML = wasteTypeOptions;
        document.getElementById('edit-waste-type').innerHTML = wasteTypeOptions;
        document.getElementById('waste-date').value = today();
        document.getElementById('waste-month-filter').value = today().slice(0,7);
        // === SZABLON WYDRUKU ===
        const printStyles = `
<style>
.print-page { font-family: Arial, sans-serif; padding: 15px; max-width: 750px; margin: 0 auto; }
.print-header { text-align: center; border-bottom: 2px solid #15803D; padding-bottom:10px; margin-bottom:15px; }
.print-header h2 { margin:0; color:#15803D; font-size:18px; }
.print-row { display:flex; border-bottom:1px solid #eee; padding:6px 0; font-size:13px; }
.print-label { width:35%; font-weight:bold; }
.print-value { width:65%; }
.print-total { margin-top:15px; padding-top:10px; border-top:2px solid #15803D; font-size:16px; font-weight:bold; text-align:right; color:#15803D; }
.print-sign { margin-top:30px; display:flex; justify-content:space-between; font-size:12px; }
.print-sign .stamp-area { border: 2px dashed #aaa; width:45%; height:100px; display:flex; align-items:center; justify-content:center; color:#888; text-align:center; }
.print-sign .signature-area { border-top:1px solid #333; width:45%; text-align:center; padding-top:5px; align-self:flex-end; }
</style>`;
        // === OTWIERANIE EDYCJI ===
        const openOrderForEdit = (order) => {
            searchResults.classList.add('hidden'); searchInput.value = '';
            document.getElementById('edit-id').value = order.id;
            document.getElementById('edit-name').value = order.clientName;
            document.getElementById('edit-phone').value = formatPhone(order.clientPhone);
            document.getElementById('edit-dev').value = order.device;
            document.getElementById('edit-serial').value = order.serial||'';
            document.getElementById('edit-serv').value = order.serviceType;
            document.getElementById('edit-amount').value = order.amount||'';
            document.getElementById('edit-status').value = order.status;
            document.getElementById('edit-desc').value = order.description;
            document.getElementById('edit-modal').classList.remove('hidden');
        };
        const openDeviceForEdit = (dev) => {
            searchResults.classList.add('hidden'); searchInput.value = '';
            document.getElementById('edit-dev-id').value = dev.id;
            document.getElementById('edit-dev-client').value = dev.client;
            document.getElementById('edit-dev-phone').value = formatPhone(dev.phone);
            document.getElementById('edit-dev-type').value = dev.type;
            document.getElementById('edit-dev-car').value = dev.car || '';
            document.getElementById('edit-dev-desc').value = dev.description;
            document.getElementById('edit-dev-price').value = dev.price || '';
            document.getElementById('edit-dev-status').value = dev.status;
            document.getElementById('edit-device-modal').classList.remove('hidden');
        };
        const openKeyForEdit = (key) => {
            searchResults.classList.add('hidden'); searchInput.value = '';
            document.getElementById('edit-key-id').value = key.id;
            document.getElementById('edit-key-client').value = key.client;
            document.getElementById('edit-key-phone').value = formatPhone(key.phone);
            document.getElementById('edit-key-car').value = key.car;
            document.getElementById('edit-key-plate').value = key.plate || '';
            document.getElementById('edit-key-type').value = key.service;
            document.getElementById('edit-key-price').value = key.price || '';
            document.getElementById('edit-key-status').value = key.status;
            document.getElementById('edit-key-notes').value = key.notes || '';
            document.getElementById('edit-key-modal').classList.remove('hidden');        };
        const openWasteForEdit = (w) => {
            searchResults.classList.add('hidden'); searchInput.value = '';
            document.getElementById('edit-waste-id').value = w.id;
            document.getElementById('edit-waste-client').value = w.client;
            document.getElementById('edit-waste-phone').value = formatPhone(w.phone);
            document.getElementById('edit-waste-address').value = w.address;
            document.getElementById('edit-waste-type').value = w.wasteType;
            document.getElementById('edit-waste-kg').value = w.kg;
            document.getElementById('edit-waste-date').value = w.date;
            document.getElementById('edit-waste-modal').classList.remove('hidden');
        };
        // === WYSZUKIWARKA ===
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        const performSearch = () => {
            const phrase = normalizeText(searchInput.value.trim());
            if (!phrase) { searchResults.classList.add('hidden'); return; }
            const results = [];
            orders.forEach(o => {
                if (normalizeText(o.clientName).includes(phrase) || normalizeText(o.clientPhone).includes(phrase) ||
                    normalizeText(o.device).includes(phrase) || normalizeText(o.serial).includes(phrase) ||
                    normalizeText(o.serviceType).includes(phrase)) {
                    results.push({type:'Zgłoszenie', label:`${o.clientName} — ${o.device}`, sub:`📞 ${formatPhone(o.clientPhone)} | ${o.serviceType} | ${formatDate(o.date)}`, data:o, openFn:()=>openOrderForEdit(o)});
                }
            });
            devices.forEach(d => {
                if (normalizeText(d.client).includes(phrase) || normalizeText(d.phone).includes(phrase) ||
                    normalizeText(d.type).includes(phrase) || normalizeText(d.car).includes(phrase) ||
                    normalizeText(d.description).includes(phrase)) {
                    results.push({type:'Pojemnik', label:`${d.client} — ${d.type}`, sub:`📞 ${formatPhone(d.phone)} | ${d.car||'brak adresu'} | ${formatDate(d.date)}`, data:d, openFn:()=>openDeviceForEdit(d)});
                }
            });
            keysData.forEach(k => {
                if (normalizeText(k.client).includes(phrase) || normalizeText(k.phone).includes(phrase) ||
                    normalizeText(k.car).includes(phrase) || normalizeText(k.service).includes(phrase) ||
                    normalizeText(k.notes).includes(phrase)) {
                    results.push({type:'Harmonogram', label:`${k.client} — ${k.car}`, sub:`📞 ${formatPhone(k.phone)} | ${k.service} | ${formatDate(k.date)}`, data:k, openFn:()=>openKeyForEdit(k)});
                }
            });
            wasteRecords.forEach(w => {
                if (normalizeText(w.client).includes(phrase) || normalizeText(w.phone).includes(phrase) ||
                    normalizeText(w.address).includes(phrase) || normalizeText(w.wasteType).includes(phrase)) {
                    results.push({type:'Dostawa odpadów', label:`${w.client} — ${w.address}`, sub:`📞 ${formatPhone(w.phone)} | ${w.wasteType} — ${Number(w.kg||0).toFixed(1).replace('.',',')} kg | ${formatDate(w.date)}`, data:w, openFn:()=>openWasteForEdit(w)});
                }
            });
            if (results.length === 0) {
                searchResults.innerHTML = `<div class="p-4 text-center text-gray-500">Brak wyników</div>`;
            } else {
                searchResults.innerHTML = results.map(r=>`
                    <div class="search-result-item" data-open="${encodeURIComponent(r.type)}">
                        <span class="search-result-type">${r.type}</span>
                        <strong>${r.label}</strong>
                        <div class="text-sm text-gray-500 mt-1">${r.sub}</div>
                    </div>`).join('');
                searchResults.querySelectorAll('.search-result-item').forEach((el,idx)=>{
                    el.addEventListener('click', ()=>{
                        results[idx].openFn();
                        searchResults.classList.add('hidden');
                        searchInput.value = '';
                    });
                });
            }
            searchResults.classList.remove('hidden');
        };
        searchInput.addEventListener('input', performSearch);
        document.addEventListener('click', e=>{ if(!e.target.closest('.relative')) searchResults.classList.add('hidden'); });
        // === WYDRUK ZLECENIA — RÓŻNE SZABLONY ===
document.getElementById('print-btn').addEventListener('click', () => {
    const id = document.getElementById('edit-id').value;
    const order = orders.find(o=>o.id===id);
    if (!order) return;
    const template = document.getElementById('print-template').value;
    let content = '';

    if (template === 'accept') {
        // === SZABLON 1: POTWIERDZENIE PRZYJĘCIA ===
        content = `${printStyles}
<div class="print-page">
    <div class="print-header">
        <h2>Bocheński Zakład Usług Komunalnych</h2>
        <p><strong>POTWIERDZENIE PRZYJĘCIA ZGŁOSZENIA</strong></p>
        <p>Nr zgłoszenia: ${order.id.slice(-6)} | Data: ${formatDate(order.date)}</p>
    </div>
    <div class="print-row"><div class="print-label">Dane klienta:</div><div class="print-value">${order.clientName}<br>Tel: ${formatPhone(order.clientPhone)}</div></div>
    <div class="print-row"><div class="print-label">Adres nieruchomości:</div><div class="print-value">${order.device}${order.serial?'<br>Nr umowy/konta: '+order.serial:''}</div></div>
    <div class="print-row"><div class="print-label">Rodzaj zgłoszenia:</div><div class="print-value">${order.serviceType}</div></div>
    <div class="print-row"><div class="print-label">Opis zgłoszenia:</div><div class="print-value">${order.description.replace(/\n/g,'<br>')}</div></div>
    <div class="print-total">Szacowana opłata: ${Number(order.amount||0).toFixed(2).replace('.',',')} zł</div>
    <div class="print-sign">
        <div class="stamp-area">Miejsce na pieczątkę<br>i podpis przyjmującego</div>
        <div class="signature-area">Podpis klienta</div>
    </div>
</div>`;
    } else if (template === 'protocol') {
        // === SZABLON 2: PROTOKÓŁ NAPRAWY ===
        content = `${printStyles}
<div class="print-page">
    <div class="print-header">
        <h2>Bocheński Zakład Usług Komunalnych</h2>
        <p><strong>PROTOKÓŁ REALIZACJI</strong></p>
        <p>Nr protokołu: ${order.id.slice(-6)} | Data przyjęcia: ${formatDate(order.date)}</p>
    </div>
    <div class="print-row"><div class="print-label">Klient:</div><div class="print-value">${order.clientName}</div></div>
    <div class="print-row"><div class="print-label">Telefon:</div><div class="print-value">${formatPhone(order.clientPhone)}</div></div>
    <div class="print-row"><div class="print-label">Adres nieruchomości:</div><div class="print-value">${order.device}${order.serial?' ('+order.serial+')':''}</div></div>
    <div class="print-row"><div class="print-label">Rodzaj zgłoszenia:</div><div class="print-value">${order.serviceType}</div></div>
    <div class="print-row"><div class="print-label">Zgłoszony problem:</div><div class="print-value">${order.description.replace(/\n/g,'<br>')}</div></div>
    <div class="print-row"><div class="print-label">Wykonane czynności:</div><div class="print-value">________________________________________<br>________________________________________<br>________________________________________</div></div>
    <div class="print-row"><div class="print-label">Użyty sprzęt / materiały:</div><div class="print-value">________________________________________<br>________________________________________</div></div>
    <div class="print-row"><div class="print-label">Uwagi:</div><div class="print-value">________________________________________</div></div>
    <div class="print-total">Łączna opłata: ${Number(order.amount||0).toFixed(2).replace('.',',')} zł</div>
    <div class="print-sign">
        <div class="stamp-area">Pieczątka i podpis<br>wykonującego</div>
        <div class="signature-area">Podpis odbierającego</div>
    </div>
</div>`;
    } else if (template === 'receipt') {
        // SZABLON 3: DOWÓD ODBIORU
                content = `${printStyles}
<div class="print-page">
    <div class="print-header">
        <h2>Bocheński Zakład Usług Komunalnych</h2>
        <p><strong>DOWÓD ODBIORU</strong></p>
        <p>Nr zgłoszenia: ${order.id.slice(-6)} | Data: ${formatDate(order.date)}</p>
    </div>
    <div class="print-row"><div class="print-label">Odbierający:</div><div class="print-value">${order.clientName}</div></div>
    <div class="print-row"><div class="print-label">Telefon:</div><div class="print-value">${formatPhone(order.clientPhone)}</div></div>
    <div class="print-row"><div class="print-label">Adres nieruchomości:</div><div class="print-value">${order.device}</div></div>
    <div class="print-row"><div class="print-label">Wykonana usługa:</div><div class="print-value">${order.serviceType}</div></div>
    <div class="print-row"><div class="print-label">Stan realizacji:</div><div class="print-value">Zgłoszenie zrealizowano zgodnie z zakresem usługi.</div></div>
    <div class="print-row"><div class="print-label">Do zapłaty:</div><div class="print-value font-bold text-lg">${Number(order.amount||0).toFixed(2).replace('.',',')} zł</div></div>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
        <p>Przedmiot odbieram w dobrym stanie, bez zastrzeżeń.</p>
        <div class="flex justify-between mt-10">
            <div style="text-align: center; width: 45%;">
                <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
                Podpis odbierającego i data
            </div>
            <div style="text-align: center; width: 45%;">
                <div style="border: 2px dashed #aaa; height: 80px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; color: #888;">Pieczątka</div>
                Podpis wydającego
            </div>
        </div>
    </div>
</div>`;
            }

            document.getElementById('print-content').innerHTML = content;
            document.getElementById('print-modal').classList.remove('hidden');
        });
        // === WYDRUK URZĄDZENIA ===
        document.getElementById('print-dev-btn').addEventListener('click', () => {
            const id = document.getElementById('edit-dev-id').value;
            const dev = devices.find(d=>d.id===id);
            if (!dev) return;
            const content = `${printStyles}
<div class="print-page">
    <div class="print-header">
        <h2>Bocheński Zakład Usług Komunalnych</h2>
        <p>Potwierdzenie przyjęcia pojemnika nr ${dev.id.slice(-6)}</p>
        <p>Data: ${formatDate(dev.date)}</p>
    </div>
    <div class="print-row"><div class="print-label">Klient:</div><div class="print-value">${dev.client}</div></div>
    <div class="print-row"><div class="print-label">Telefon:</div><div class="print-value">${formatPhone(dev.phone)}</div></div>
    <div class="print-row"><div class="print-label">Typ pojemnika:</div><div class="print-value">${dev.type}</div></div>
    <div class="print-row"><div class="print-label">Adres nieruchomości:</div><div class="print-value">${dev.car || 'Nie podano'}</div></div>
    <div class="print-row"><div class="print-label">Opis zgłoszenia:</div><div class="print-value">${dev.description.replace(/\n/g,'<br>')}</div></div>
    <div class="print-total">Opłata: ${Number(dev.price||0).toFixed(2).replace('.',',')} zł</div>
    <div class="print-sign">
        <div class="stamp-area">Miejsce na pieczątkę<br>i podpis przyjmującego</div>
        <div class="signature-area">Podpis klienta</div>
    </div>
</div>`;
            document.getElementById('print-content').innerHTML = content;
            document.getElementById('print-modal').classList.remove('hidden');
        });
        // === WYDRUK HARMONOGRAMU ===
        document.getElementById('print-key-btn').addEventListener('click', () => {
            const id = document.getElementById('edit-key-id').value;
            const key = keysData.find(k=>k.id===id);
            if (!key) return;
            const content = `${printStyles}
<div class="print-page">
    <div class="print-header">
        <h2>Bocheński Zakład Usług Komunalnych</h2>
        <p>Potwierdzenie ustalenia harmonogramu nr ${key.id.slice(-6)}</p>
        <p>Data: ${formatDate(key.date)}</p>
    </div>
    <div class="print-row"><div class="print-label">Klient:</div><div class="print-value">${key.client}</div></div>
    <div class="print-row"><div class="print-label">Telefon:</div><div class="print-value">${formatPhone(key.phone)}</div></div>
    <div class="print-row"><div class="print-label">Adres nieruchomości:</div><div class="print-value">${key.car}${key.plate?' ('+key.plate+')':''}</div></div>
    <div class="print-row"><div class="print-label">Rodzaj odbioru:</div><div class="print-value">${key.service}</div></div>
    <div class="print-row"><div class="print-label">Uwagi:</div><div class="print-value">${key.notes || 'Brak uwag'}</div></div>
    <div class="print-total">Opłata: ${Number(key.price||0).toFixed(2).replace('.',',')} zł</div>
    <div class="print-sign">
        <div class="stamp-area">Miejsce na pieczątkę<br>i podpis przyjmującego</div>
        <div class="signature-area">Podpis klienta</div>
    </div>
</div>`;
            document.getElementById('print-content').innerHTML = content;
            document.getElementById('print-modal').classList.remove('hidden');
        });
        // === ZAMYKANIE OKNA WYDRUKU ===
        document.getElementById('close-print').addEventListener('click', ()=>{
            document.getElementById('print-modal').classList.add('hidden');
        });
        document.getElementById('do-print').addEventListener('click', ()=>{
            window.print();
        });
        // === PRZEŁĄCZANIE ZAKŁADEK ===
        document.querySelectorAll('.tab-btn').forEach(btn=>{
            btn.addEventListener('click', ()=>{
                document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('tab-active'); b.classList.add('text-gray-500');});
                btn.classList.add('tab-active'); btn.classList.remove('text-gray-500');
                const tabName = btn.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden'));
                document.getElementById('tab-'+tabName).classList.remove('hidden');
                renderAll();
            });
        });
// === AUTOUZUPEŁNIANIE KLIENTÓW I NUMERU TELEFONU ===
// Buduje listę unikalnych klientów z ich numerami telefonów
const getUniqueClients = () => {
    const clients = {};
    // Pobierz z zleceń
    orders.forEach(o => {
        const name = o.clientName.trim();
        const phone = o.clientPhone.replace(/\D/g, '');
        if (name && phone) {
            if (!clients[name]) clients[name] = phone;
        }
    });
    // Pobierz z urządzeń
    devices.forEach(d => {
        const name = d.client.trim();
        const phone = d.phone.replace(/\D/g, '');
        if (name && phone) {
            if (!clients[name]) clients[name] = phone;
        }
    });
    // Pobierz z harmonogramów
    keysData.forEach(k => {
        const name = k.client.trim();
        const phone = k.phone.replace(/\D/g, '');
        if (name && phone) {
            if (!clients[name]) clients[name] = phone;
        }
    });
    // Pobierz z dostaw odpadów
    wasteRecords.forEach(w => {
        const name = w.client.trim();
        const phone = w.phone.replace(/\D/g, '');
        if (name && phone) {
            if (!clients[name]) clients[name] = phone;
        }
    });
    return clients;
};

// Gdy wpisujesz nazwę klienta — automatycznie wypełnia numer telefonu
document.getElementById('client-name').addEventListener('input', e => {
    const nameInput = e.target.value.trim();
    const phoneInput = document.getElementById('client-phone');
    const clients = getUniqueClients();
    
    // Jeśli istnieje klient o dokładnie takiej nazwie — automatycznie wstaw numer
    if (clients[nameInput]) {
        phoneInput.value = formatPhone(clients[nameInput]);
    }
});

// To samo dla urządzeń
document.getElementById('dev-client').addEventListener('input', e => {
    const nameInput = e.target.value.trim();
    const phoneInput = document.getElementById('dev-phone');
    const clients = getUniqueClients();
    if (clients[nameInput]) {
        phoneInput.value = formatPhone(clients[nameInput]);
    }
});

// To samo dla harmonogramów
document.getElementById('key-client').addEventListener('input', e => {
    const nameInput = e.target.value.trim();
    const phoneInput = document.getElementById('key-phone');
    const clients = getUniqueClients();
    if (clients[nameInput]) {
        phoneInput.value = formatPhone(clients[nameInput]);
    }
});

// To samo dla dostaw odpadów
document.getElementById('waste-client').addEventListener('input', e => {
    const nameInput = e.target.value.trim();
    const phoneInput = document.getElementById('waste-phone');
    const clients = getUniqueClients();
    if (clients[nameInput]) {
        phoneInput.value = formatPhone(clients[nameInput]);
    }
});
        // === DODAJ ZLECENIE ===
        document.getElementById('order-form').addEventListener('submit', e=>{
            e.preventDefault();
            const order = {
                id: Date.now().toString(),
                clientName: document.getElementById('client-name').value,
                clientPhone: document.getElementById('client-phone').value.replace(/\D/g,''),
                device: document.getElementById('device').value,
                serial: document.getElementById('serial').value,
                serviceType: document.getElementById('service-type').value,
                amount: document.getElementById('order-amount').value,
                status: document.getElementById('status').value,
                description: document.getElementById('description').value,
                date: today()
            };
            orders.unshift(order);
            save(); e.target.reset(); renderAll();
        });
        // === DODAJ URZĄDZENIE ===
        document.getElementById('device-form').addEventListener('submit', e=>{
            e.preventDefault();
            const dev = {
                id: Date.now().toString(),
                client: document.getElementById('dev-client').value,
                phone: document.getElementById('dev-phone').value.replace(/\D/g,''),
                type: document.getElementById('dev-type').value,
                car: document.getElementById('dev-car').value,
                description: document.getElementById('dev-desc').value,
                price: document.getElementById('dev-price').value,
                status: document.getElementById('dev-status').value,
                date: today()
            };
            devices.unshift(dev);
            save(); e.target.reset(); renderAll();
        });
        // === DODAJ HARMONOGRAM ===
        document.getElementById('key-form').addEventListener('submit', e=>{
            e.preventDefault();
            const key = {
                id: Date.now().toString(),
                client: document.getElementById('key-client').value,
                phone: document.getElementById('key-phone').value.replace(/\D/g,''),
                car: document.getElementById('key-car').value,
                plate: document.getElementById('key-plate').value,
                service: document.getElementById('key-type').value,
                price: document.getElementById('key-price').value,
                status: document.getElementById('key-status').value,
                notes: document.getElementById('key-notes').value,
                date: today()
            };
            keysData.unshift(key);
            save(); e.target.reset(); renderAll();
        });
        // === DODAJ DOSTAWĘ ODPADÓW ===
        document.getElementById('waste-form').addEventListener('submit', e=>{
            e.preventDefault();
            const rec = {
                id: Date.now().toString(),
                client: document.getElementById('waste-client').value,
                phone: document.getElementById('waste-phone').value.replace(/\D/g,''),
                address: document.getElementById('waste-address').value,
                wasteType: document.getElementById('waste-type').value,
                kg: document.getElementById('waste-kg').value,
                date: document.getElementById('waste-date').value || today()
            };
            wasteRecords.unshift(rec);
            save(); e.target.reset();
            document.getElementById('waste-date').value = today();
            renderAll();
        });
        // === ZAPIS EDYCJI ZLECENIA ===
        document.getElementById('edit-form').addEventListener('submit', e=>{
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const idx = orders.findIndex(o=>o.id===id);
            if (idx !== -1) {
                orders[idx] = {
                    ...orders[idx],
                    clientName: document.getElementById('edit-name').value,
                    clientPhone: document.getElementById('edit-phone').value.replace(/\D/g,''),
                    device: document.getElementById('edit-dev').value,
                    serial: document.getElementById('edit-serial').value,
                    serviceType: document.getElementById('edit-serv').value,
                    amount: document.getElementById('edit-amount').value,
                    status: document.getElementById('edit-status').value,
                    description: document.getElementById('edit-desc').value
                };
                save(); renderAll();
            }
            document.getElementById('edit-modal').classList.add('hidden');
        });
        // === USUŃ ZLECENIE ===
        document.getElementById('delete-btn').addEventListener('click', ()=>{
            const id = document.getElementById('edit-id').value;
            if (confirm('Czy na pewno usunąć to zgłoszenie? Operacja jest nieodwracalna!')) {
                orders = orders.filter(o=>o.id !== id);
                save(); renderAll();
                document.getElementById('edit-modal').classList.add('hidden');
            }
        });
        // === ZAPIS EDYCJI URZĄDZENIA ===
        document.getElementById('edit-device-form').addEventListener('submit', e=>{
            e.preventDefault();
            const id = document.getElementById('edit-dev-id').value;
            const idx = devices.findIndex(d=>d.id===id);
            if (idx !== -1) {
                devices[idx] = {
                    ...devices[idx],
                    client: document.getElementById('edit-dev-client').value,
                    phone: document.getElementById('edit-dev-phone').value.replace(/\D/g,''),
                    type: document.getElementById('edit-dev-type').value,
                    car: document.getElementById('edit-dev-car').value,
                    description: document.getElementById('edit-dev-desc').value,
                    price: document.getElementById('edit-dev-price').value,
                    status: document.getElementById('edit-dev-status').value
                };
                save(); renderAll();
            }
            document.getElementById('edit-device-modal').classList.add('hidden');
        });
        // === USUŃ URZĄDZENIE ===
        document.getElementById('delete-dev-btn').addEventListener('click', ()=>{
            const id = document.getElementById('edit-dev-id').value;
            if (confirm('Czy na pewno usunąć ten pojemnik? Operacja jest nieodwracalna!')) {
                devices = devices.filter(d=>d.id !== id);
                save(); renderAll();
                document.getElementById('edit-device-modal').classList.add('hidden');
            }
        });
        // === ZAPIS EDYCJI HARMONOGRAMU ===
        document.getElementById('edit-key-form').addEventListener('submit', e=>{
            e.preventDefault();
            const id = document.getElementById('edit-key-id').value;
            const idx = keysData.findIndex(k=>k.id===id);
            if (idx !== -1) {
                keysData[idx] = {
                    ...keysData[idx],
                    client: document.getElementById('edit-key-client').value,
                    phone: document.getElementById('edit-key-phone').value.replace(/\D/g,''),
                    car: document.getElementById('edit-key-car').value,
                    plate: document.getElementById('edit-key-plate').value,
                    service: document.getElementById('edit-key-type').value,
                    price: document.getElementById('edit-key-price').value,
                    status: document.getElementById('edit-key-status').value,
                    notes: document.getElementById('edit-key-notes').value
                };
                save(); renderAll();
            }
            document.getElementById('edit-key-modal').classList.add('hidden');
        });
        // === USUŃ HARMONOGRAM ===
        document.getElementById('delete-key-btn').addEventListener('click', ()=>{
            const id = document.getElementById('edit-key-id').value;
            if (confirm('Czy na pewno usunąć ten harmonogram? Operacja jest nieodwracalna!')) {
                keysData = keysData.filter(k=>k.id !== id);
                save(); renderAll();
                document.getElementById('edit-key-modal').classList.add('hidden');
            }
        });
        // === ZAPIS EDYCJI DOSTAWY ODPADÓW ===
        document.getElementById('edit-waste-form').addEventListener('submit', e=>{
            e.preventDefault();
            const id = document.getElementById('edit-waste-id').value;
            const idx = wasteRecords.findIndex(w=>w.id===id);
            if (idx !== -1) {
                wasteRecords[idx] = {
                    ...wasteRecords[idx],
                    client: document.getElementById('edit-waste-client').value,
                    phone: document.getElementById('edit-waste-phone').value.replace(/\D/g,''),
                    address: document.getElementById('edit-waste-address').value,
                    wasteType: document.getElementById('edit-waste-type').value,
                    kg: document.getElementById('edit-waste-kg').value,
                    date: document.getElementById('edit-waste-date').value
                };
                save(); renderAll();
            }
            document.getElementById('edit-waste-modal').classList.add('hidden');
        });
        // === USUŃ DOSTAWĘ ODPADÓW ===
        document.getElementById('delete-waste-btn').addEventListener('click', ()=>{
            const id = document.getElementById('edit-waste-id').value;
            if (confirm('Czy na pewno usunąć tę dostawę odpadów? Operacja jest nieodwracalna!')) {
                wasteRecords = wasteRecords.filter(w=>w.id !== id);
                save(); renderAll();
                document.getElementById('edit-waste-modal').classList.add('hidden');
            }
        });
        document.getElementById('close-edit-waste-modal').addEventListener('click', ()=>document.getElementById('edit-waste-modal').classList.add('hidden'));
        document.getElementById('cancel-edit-waste-btn').addEventListener('click', ()=>document.getElementById('edit-waste-modal').classList.add('hidden'));
        // === ZAPIS LIMITÓW ODPADÓW ===
        document.getElementById('limits-form').addEventListener('submit', e=>{
            e.preventDefault();
            document.querySelectorAll('#limits-form .limit-input').forEach(inp=>{
                const type = decodeURIComponent(inp.dataset.type);
                limits[type] = Number(inp.value) || 0;
            });
            save(); renderAll();
        });
        // === FILTR MIESIĄCA W ZAKŁADCE ODPADY ===
        document.getElementById('waste-month-filter').addEventListener('change', ()=>renderAll());
        // === ZAMYKANIE OKIEN EDYCJI ===
        document.getElementById('close-edit').addEventListener('click', ()=>document.getElementById('edit-modal').classList.add('hidden'));
        document.getElementById('cancel-edit').addEventListener('click', ()=>document.getElementById('edit-modal').classList.add('hidden'));
        document.getElementById('close-device-edit').addEventListener('click', ()=>document.getElementById('edit-device-modal').classList.add('hidden'));
        document.getElementById('cancel-device-edit').addEventListener('click', ()=>document.getElementById('edit-device-modal').classList.add('hidden'));
        document.getElementById('close-key-edit').addEventListener('click', ()=>document.getElementById('edit-key-modal').classList.add('hidden'));
        document.getElementById('cancel-key-edit').addEventListener('click', ()=>document.getElementById('edit-key-modal').classList.add('hidden'));
        // === EKSPORT / IMPORT ===
        document.getElementById('export-btn').addEventListener('click', ()=>{
            const data = { exportedAt: new Date().toISOString(), orders, devices, keys: keysData, waste: wasteRecords, limits };
            const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `bzuk-kopia-${today()}.json`; a.click(); URL.revokeObjectURL(url);
        });
        document.getElementById('import-input').addEventListener('change', e=>{
            const f = e.target.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = ev=>{
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!imported.orders || !imported.devices || !imported.keys) throw new Error('Nieprawidłowy plik');
                    if (confirm('Zaimportowane dane zastąpią wszystkie obecne konta. Kontynuować?')) {
                        orders = imported.orders; devices = imported.devices; keysData = imported.keys;
                        wasteRecords = imported.waste || []; limits = imported.limits || {};
                        save(); renderAll(); alert('Dane zaimportowano pomyślnie!');
                    }
                } catch(err) { alert('Błąd importu: ' + err.message); }
            };
            r.readAsText(f);
        });
        // === SYNCHRONIZACJA Z GOOGLE DRIVE ===
        const GDRIVE_FILE_NAME = 'bzuk-dane.json';
        const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
        let gdriveTokenClient = null;
        let gdriveAccessToken = null;
        let gdriveFileId = localStorage.getItem('bzuk_gdrive_fileid') || null;

        const gdriveClientIdInput = document.getElementById('gdrive-client-id');
        const gdriveStatus = document.getElementById('gdrive-status');
        const gdriveConnectBtn = document.getElementById('gdrive-connect-btn');
        const gdriveUploadBtn = document.getElementById('gdrive-upload-btn');
        const gdriveDownloadBtn = document.getElementById('gdrive-download-btn');

        const savedClientId = localStorage.getItem('bzuk_gdrive_client_id');
        if (savedClientId) gdriveClientIdInput.value = savedClientId;

        document.getElementById('gdrive-save-client-id').addEventListener('click', () => {
            const id = gdriveClientIdInput.value.trim();
            if (!id) { alert('Wpisz Client ID.'); return; }
            localStorage.setItem('bzuk_gdrive_client_id', id);
            gdriveTokenClient = null;
            gdriveStatus.textContent = 'Zapisano Client ID. Kliknij "Połącz z Google".';
        });

        function gdriveInitTokenClient() {
            const clientId = localStorage.getItem('bzuk_gdrive_client_id');
            if (!clientId) { alert('Najpierw wpisz i zapisz Google Client ID (zobacz instrukcję poniżej).'); return null; }
            if (typeof google === 'undefined' || !google.accounts) {
                alert('Biblioteka Google nie została załadowana. Sprawdź połączenie z internetem i odśwież stronę.');
                return null;
            }
            return google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: GDRIVE_SCOPE,
                callback: (resp) => {
                    if (resp.error) {
                        gdriveStatus.textContent = 'Błąd autoryzacji: ' + resp.error;
                        return;
                    }
                    gdriveAccessToken = resp.access_token;
                    gdriveStatus.textContent = 'Połączono z Google Drive.';
                    gdriveUploadBtn.classList.remove('hidden'); gdriveUploadBtn.disabled = false;
                    gdriveDownloadBtn.classList.remove('hidden'); gdriveDownloadBtn.disabled = false;
                }
            });
        }

        gdriveConnectBtn.addEventListener('click', () => {
            gdriveTokenClient = gdriveInitTokenClient();
            if (!gdriveTokenClient) return;
            gdriveStatus.textContent = 'Łączenie...';
            gdriveTokenClient.requestAccessToken({ prompt: gdriveAccessToken ? '' : 'consent' });
        });

        async function gdriveFindFile() {
            const q = encodeURIComponent(`name='${GDRIVE_FILE_NAME}' and trashed=false`);
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`, {
                headers: { Authorization: `Bearer ${gdriveAccessToken}` }
            });
            if (!res.ok) throw new Error('Nie udało się wyszukać pliku (kod ' + res.status + ')');
            const data = await res.json();
            return data.files && data.files.length ? data.files[0] : null;
        }

        async function gdriveUpload() {
            if (!gdriveAccessToken) { alert('Najpierw połącz się z Google.'); return; }
            gdriveStatus.textContent = 'Zapisywanie...';
            try {
                const payload = { exportedAt: new Date().toISOString(), orders, devices, keys: keysData, waste: wasteRecords, limits };
                const content = JSON.stringify(payload, null, 2);
                let fileId = gdriveFileId;
                if (!fileId) {
                    const existing = await gdriveFindFile();
                    if (existing) fileId = existing.id;
                }
                const metadata = { name: GDRIVE_FILE_NAME, mimeType: 'application/json' };
                const boundary = 'bzukboundary';
                const body =
                    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
                    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
                const url = fileId
                    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
                    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
                const res = await fetch(url, {
                    method: fileId ? 'PATCH' : 'POST',
                    headers: { Authorization: `Bearer ${gdriveAccessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
                    body
                });
                if (!res.ok) throw new Error('Błąd zapisu (kod ' + res.status + ')');
                const result = await res.json();
                gdriveFileId = result.id;
                localStorage.setItem('bzuk_gdrive_fileid', gdriveFileId);
                gdriveStatus.textContent = 'Zapisano w Google Drive: ' + new Date().toLocaleTimeString('pl-PL');
            } catch (err) {
                gdriveStatus.textContent = 'Błąd: ' + err.message;
            }
        }

        async function gdriveDownload() {
            if (!gdriveAccessToken) { alert('Najpierw połącz się z Google.'); return; }
            gdriveStatus.textContent = 'Wczytywanie...';
            try {
                let fileId = gdriveFileId;
                if (!fileId) {
                    const existing = await gdriveFindFile();
                    if (!existing) { gdriveStatus.textContent = 'Nie znaleziono pliku kopii zapasowej w Google Drive. Najpierw zapisz dane na jakimś komputerze.'; return; }
                    fileId = existing.id;
                }
                const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: { Authorization: `Bearer ${gdriveAccessToken}` }
                });
                if (!res.ok) throw new Error('Błąd odczytu (kod ' + res.status + ')');
                const imported = await res.json();
                if (!imported.orders || !imported.devices || !imported.keys) throw new Error('Nieprawidłowy plik danych');
                if (confirm('Dane z Google Drive zastąpią wszystkie obecne dane w tej przeglądarce. Kontynuować?')) {
                    orders = imported.orders; devices = imported.devices; keysData = imported.keys;
                    wasteRecords = imported.waste || []; limits = imported.limits || {};
                    gdriveFileId = fileId; localStorage.setItem('bzuk_gdrive_fileid', gdriveFileId);
                    save(); renderAll();
                    gdriveStatus.textContent = 'Wczytano dane z Google Drive: ' + new Date().toLocaleTimeString('pl-PL');
                }
            } catch (err) {
                gdriveStatus.textContent = 'Błąd: ' + err.message;
            }
        }

        gdriveUploadBtn.addEventListener('click', gdriveUpload);
        gdriveDownloadBtn.addEventListener('click', gdriveDownload);
        // === FORMATOWANIE TELEFONU PODCZAS WPISYWANIA ===
        document.addEventListener('input', e => {
            const ids = ['client-phone','dev-phone','key-phone','edit-phone','edit-dev-phone','edit-key-phone'];
            if (ids.includes(e.target.id)) {
                e.target.value = formatPhone(e.target.value);
            }
        });
        // === RENDEROWANIE WSZYSTKICH LIST ===
        const renderAll = () => {
// Aktualizuj listę sugestii klientów
const clientsList = getUniqueClients();
const clientNames = Object.keys(clientsList).sort();
document.getElementById('client-suggestions').innerHTML = clientNames.map(n=>`<option value="${n}">`).join('');
document.getElementById('client-suggestions-dev').innerHTML = clientNames.map(n=>`<option value="${n}">`).join('');
document.getElementById('client-suggestions-key').innerHTML = clientNames.map(n=>`<option value="${n}">`).join('');
document.getElementById('client-suggestions-waste').innerHTML = clientNames.map(n=>`<option value="${n}">`).join('');
            // === FILTROWANIE PO ZAKRESIE DAT ===
const dateFrom = document.getElementById('filter-date-from')?.value;
const dateTo = document.getElementById('filter-date-to')?.value;

let filteredOrders = [...orders];
if (dateFrom) {
  filteredOrders = filteredOrders.filter(o => o.date >= dateFrom);
}
if (dateTo) {
  filteredOrders = filteredOrders.filter(o => o.date <= dateTo);
}

document.getElementById('orders-list').innerHTML = filteredOrders.length === 0
    ? '<div class="p-4 text-center text-gray-500">Brak zgłoszeń w wybranym zakresie dat</div>'
    : filteredOrders.map(o => `
                    <div class="clickable-row p-3 border rounded-lg cursor-pointer hover:shadow-md transition" data-id="${o.id}">
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-bold text-green-700">${o.clientName}</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]||'bg-gray-100'}">${o.status}</span>
                        </div>
                        <div class="text-sm"><strong>Adres:</strong> ${o.device}${o.serial?' ('+o.serial+')':''}</div>
                        <div class="text-sm"><strong>Usługa:</strong> ${o.serviceType}</div>
                        <div class="flex justify-between items-center text-sm text-gray-500 mt-1">
                            <span>📞 ${formatPhone(o.clientPhone)} | 📅 ${formatDate(o.date)}</span>
                            <span class="font-bold text-green-700">${Number(o.amount||0).toFixed(2).replace('.',',')} zł</span>
                        </div>
                    </div>`).join('');
            document.querySelectorAll('#orders-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openOrderForEdit(orders.find(o=>o.id===el.dataset.id)));
            });
            document.getElementById('devices-list').innerHTML = devices.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak pojemników</div>'
                : devices.map(d=>`
                    <div class="clickable-row grid grid-cols-5 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${d.id}">
                        <div class="font-medium">${d.client}</div>
                        <div>${d.type}</div>
                        <div><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status]||'bg-gray-100'}">${d.status}</span></div>
                        <div class="text-right font-bold text-green-700">${Number(d.price||0).toFixed(2).replace('.',',')} zł</div>
                        <div class="text-center text-sm text-gray-500">${formatDate(d.date)}</div>
                    </div>`).join('');
            document.querySelectorAll('#devices-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openDeviceForEdit(devices.find(d=>d.id===el.dataset.id)));
            });
            document.getElementById('keys-list').innerHTML = keysData.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak harmonogramów</div>'
                : keysData.map(k=>`
                    <div class="clickable-row grid grid-cols-6 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${k.id}">
                        <div class="font-medium">${k.client}</div>
                        <div>${k.car}</div>
                        <div class="text-sm">${k.service}</div>
                        <div><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[k.status]||'bg-gray-100'}">${k.status}</span></div>
                        <div class="text-right font-bold text-green-700">${Number(k.price||0).toFixed(2).replace('.',',')} zł</div>
                        <div class="text-center text-sm text-gray-500">${formatDate(k.date)}</div>
                    </div>`).join('');
            document.querySelectorAll('#keys-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openKeyForEdit(keysData.find(x=>x.id===el.dataset.id)));
            });
            // Statystyki zgłoszeń
            document.getElementById('stat-all').textContent = orders.length;
            document.getElementById('stat-prog').textContent = orders.filter(o=>['Przyjęte','Zweryfikowane','W realizacji','Zaplanowane'].includes(o.status)).length;
            document.getElementById('stat-ready').textContent = orders.filter(o=>['Wykonane','Zamknięte'].includes(o.status)).length;
            document.getElementById('stat-today').textContent = orders.filter(o=>o.date===today()).length;
            // Statystyki pojemników
            document.getElementById('dev-new').textContent = devices.filter(d=>['Zgłoszone'].includes(d.status)).length;
            document.getElementById('dev-prog').textContent = devices.filter(d=>['W realizacji','Oczekujące na dostawę'].includes(d.status)).length;
            document.getElementById('dev-ready').textContent = devices.filter(d=>['Gotowe do dostarczenia','Dostarczone'].includes(d.status)).length;
            // Statystyki harmonogramów
            document.getElementById('key-new').textContent = keysData.filter(k=>k.status==='Zgłoszony').length;
            document.getElementById('key-prog').textContent = keysData.filter(k=>k.status==='W realizacji').length;
            document.getElementById('key-ready').textContent = keysData.filter(k=>['Aktywny','Zawieszony'].includes(k.status)).length;
            // === ZAKŁADKA ODPADY ===
            // Formularz limitów
            document.getElementById('limits-form').innerHTML = WASTE_TYPES.map(t=>`
                <div class="flex items-center justify-between gap-3">
                    <label class="text-sm flex-1">${t}</label>
                    <input type="number" min="0" step="1" data-type="${encodeURIComponent(t)}" class="limit-input w-24 px-2 py-1 border border-gray-300 rounded-lg input-focus text-right" value="${limits[t] || 0}">
                    <span class="text-xs text-gray-400 w-8">kg</span>
                </div>`).join('');
            // Rejestr dostaw dla wybranego miesiąca
            const wasteMonth = document.getElementById('waste-month-filter').value || today().slice(0,7);
            const monthWaste = wasteRecords.filter(w=>w.date && w.date.startsWith(wasteMonth));
            document.getElementById('waste-list').innerHTML = monthWaste.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak dostaw w wybranym miesiącu</div>'
                : monthWaste.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(w=>`
                    <div class="clickable-row grid grid-cols-5 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${w.id}">
                        <div class="font-medium">${w.client}</div>
                        <div class="text-sm">${w.address}</div>
                        <div class="text-sm">${w.wasteType}</div>
                        <div class="text-right font-bold text-green-700">${Number(w.kg||0).toFixed(1).replace('.',',')} kg</div>
                        <div class="text-center text-sm text-gray-500">${formatDate(w.date)}</div>
                    </div>`).join('');
            document.querySelectorAll('#waste-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openWasteForEdit(wasteRecords.find(w=>w.id===el.dataset.id)));
            });
            // Podsumowanie wg adresu i typu odpadu + wykrywanie przekroczeń limitu
            const wasteSummary = {};
            monthWaste.forEach(w=>{
                const sk = w.address+'||'+w.wasteType;
                if (!wasteSummary[sk]) wasteSummary[sk] = {address:w.address, wasteType:w.wasteType, sum:0};
                wasteSummary[sk].sum += Number(w.kg)||0;
            });
            const wasteSummaryArr = Object.values(wasteSummary).sort((a,b)=>b.sum-a.sum);
            const exceededList = wasteSummaryArr.filter(s=>{
                const limit = Number(limits[s.wasteType])||0;
                return limit>0 && s.sum>limit;
            });
            document.getElementById('waste-summary-list').innerHTML = wasteSummaryArr.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak danych dla wybranego miesiąca</div>'
                : wasteSummaryArr.map(s=>{
                    const limit = Number(limits[s.wasteType])||0;
                    const hasLimit = limit > 0;
                    const exceeded = hasLimit && s.sum > limit;
                    const statusHtml = !hasLimit
                        ? '<span class="text-gray-400 text-xs">Bez limitu</span>'
                        : exceeded
                            ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Nadwyżka ${(s.sum-limit).toFixed(1).replace('.',',')} kg</span>`
                            : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">OK</span>';
                    return `<div class="grid grid-cols-5 p-3 border-b ${exceeded?'limit-exceeded':''}">
                        <div class="font-medium">${s.address}</div>
                        <div class="text-sm">${s.wasteType}</div>
                        <div class="text-right font-bold">${s.sum.toFixed(1).replace('.',',')} kg</div>
                        <div class="text-right text-gray-500">${hasLimit ? limit.toFixed(0)+' kg' : '—'}</div>
                        <div class="text-center">${statusHtml}</div>
                    </div>`;
                }).join('');
            // Statystyki zakładki Odpady
            document.getElementById('waste-stat-total').textContent = monthWaste.reduce((s,w)=>s+(Number(w.kg)||0),0).toFixed(1).replace('.',',')+' kg';
            document.getElementById('waste-stat-count').textContent = monthWaste.length;
            document.getElementById('waste-stat-exceeded').textContent = exceededList.length;
            // Baner ostrzegawczy o nadwyżce odpadów
            const wasteBanner = document.getElementById('waste-alert-banner');
            wasteBanner.innerHTML = exceededList.length === 0 ? '' : `
                <div class="bg-red-50 border-l-4 border-red-600 text-red-800 p-4 rounded-lg">
                    <p class="font-bold mb-1"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Nadwyżka odpadów — przekroczono limit na ${exceededList.length} ${exceededList.length===1?'adresie':'adresach'} w miesiącu ${wasteMonth}:</p>
                    <ul class="list-disc list-inside text-sm">
                        ${exceededList.map(s=>{const limit=Number(limits[s.wasteType])||0; return `<li>${s.address} — ${s.wasteType}: ${s.sum.toFixed(1).replace('.',',')} kg (limit ${limit} kg, nadwyżka ${(s.sum-limit).toFixed(1).replace('.',',')} kg)</li>`;}).join('')}
                    </ul>
                </div>`;
            // Zakładka Nieruchomości
            const vehOrders = {};
            orders.forEach(o=>{const k=(o.device+'||'+(o.serial||'')).trim(); if(!vehOrders[k])vehOrders[k]={name:o.device,serial:o.serial,customer:o.clientName,count:0}; vehOrders[k].count++; vehOrders[k].customer=o.clientName;});
            document.getElementById('vehicles-orders-list').innerHTML = Object.values(vehOrders).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehOrders).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium">${v.name}</div><div>${v.serial||'—'}</div><div>${v.customer}</div><div class="text-center font-bold text-green-600">${v.count}</div></div>`).join('');
            const vehDevs = {};
            devices.forEach(d=>{const k=(d.type+'||'+(d.car||'')).trim(); if(!vehDevs[k])vehDevs[k]={type:d.type,car:d.car,client:d.client,count:0}; vehDevs[k].count++;});
            document.getElementById('vehicles-devices-list').innerHTML = Object.values(vehDevs).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehDevs).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium">${v.type}</div><div>${v.car||'—'}</div><div>${v.client}</div><div class="text-center font-bold text-amber-600">${v.count}</div></div>`).join('');
            const vehKeys = {};
            keysData.forEach(k=>{const k2=(k.car+'||'+k.service).trim(); if(!vehKeys[k2])vehKeys[k2]={car:k.car,service:k.service,client:k.client,count:0}; vehKeys[k2].count++;});
            document.getElementById('vehicles-keys-list').innerHTML = Object.values(vehKeys).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehKeys).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium">${v.car}</div><div>${v.service}</div><div>${v.client}</div><div class="text-center font-bold text-green-600">${v.count}</div></div>`).join('');
            // Zakładka Klienci
            const cli = {};
            [...orders,...devices,...keysData].forEach(x=>{const name=x.clientName||x.client; const phone=x.clientPhone||x.phone; const k=(name+'||'+phone).trim(); if(!cli[k])cli[k]={name,phone,count:0}; cli[k].count++;});
            document.getElementById('clients-list').innerHTML = Object.values(cli).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-3">Brak danych</div>'
                : Object.values(cli).sort((a,b)=>b.count-a.count).map(c=>`<div class="grid grid-cols-3 p-3 border-b"><div class="font-medium">${c.name}</div><div>${formatPhone(c.phone)}</div><div class="text-center font-bold text-green-600">${c.count}</div></div>`).join('');
            // Zakładka Statystyki
            const month = new Date().toISOString().slice(0,7);
            const monthOrders = orders.filter(o=>o.date&&o.date.startsWith(month));
            const monthDevs = devices.filter(d=>d.date&&d.date.startsWith(month));
            const monthKeys = keysData.filter(k=>k.date&&k.date.startsWith(month));
            const allMonth = [...monthOrders.map(x=>({...x,amount:Number(x.amount||0)})), ...monthDevs.map(x=>({...x,service:x.type,amount:Number(x.price||0)})), ...monthKeys.map(x=>({...x,amount:Number(x.price||0)}))];
            document.getElementById('stat-num').textContent = allMonth.length;
            document.getElementById('stat-sum').textContent = allMonth.reduce((s,x)=>s+(x.amount||0),0).toFixed(2).replace('.',',')+' zł';
            const byType = {};
            allMonth.forEach(x=>{const t=x.service||'Inne'; if(!byType[t])byType[t]={count:0,sum:0}; byType[t].count++; byType[t].sum+=x.amount||0;});
            document.getElementById('stat-by-type').innerHTML = Object.entries(byType).sort((a,b)=>b[1].sum-a[1].sum).map(([t,v])=>`<p class="mb-1">${t}: <strong>${v.count}</strong> szt. — ${v.sum.toFixed(2).replace('.',',')} zł</p>`).join('') || '<p>Brak danych</p>';
        };
// === OBSŁUGA PRZYCISKÓW FILTRA DAT ===
document.addEventListener('click', e => {
  if (e.target.id === 'filter-reset') {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    renderAll();
  }
});

// Automatyczne filtrowanie po zmianie daty
document.addEventListener('change', e => {
  if (e.target.id === 'filter-date-from' || e.target.id === 'filter-date-to') {
    renderAll();
  }
});
        renderAll();
