        const LS_ORDERS = 'bzuk_orders';
        const LS_DEVICES = 'bzuk_devices';
        const LS_KEYS = 'bzuk_keys';
        const LS_WASTE = 'bzuk_waste';
        const LS_LIMITS = 'bzuk_limits';
        const LS_FLEET = 'bzuk_fleet';
        const LS_ADMIN = 'bzuk_admin';
        const LS_USERS = 'bzuk_users';
        const LS_SESSION = 'bzuk_session';
        const LS_LOGS = 'bzuk_logs';
        // Hash SHA-256 kodu zabezpieczającego do odzyskiwania hasła administratora.
        // Sam kod nigdy nie jest zapisany w kodzie źródłowym — tylko jego nieodwracalny skrót.
        const RECOVERY_CODE_HASH = '7447ccd36501f1275b58fa5cbd1bae77f4bbb50a31610fc18322d16224fdad18';
        let adminTabUnlocked = false;
        const TAB_PERMISSIONS = [
            {key:'orders', label:'Zgłoszenia'},
            {key:'devices', label:'Pojemniki'},
            {key:'keys', label:'Harmonogramy'},
            {key:'waste', label:'Odpady'}
        ];
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
        let fleetVehicles = JSON.parse(localStorage.getItem(LS_FLEET) || '[]');
        let adminAccount = JSON.parse(localStorage.getItem(LS_ADMIN) || 'null');
        let employees = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
        let logs = JSON.parse(localStorage.getItem(LS_LOGS) || '[]');
        const save = () => {
            localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
            localStorage.setItem(LS_DEVICES, JSON.stringify(devices));
            localStorage.setItem(LS_KEYS, JSON.stringify(keysData));
            localStorage.setItem(LS_WASTE, JSON.stringify(wasteRecords));
            localStorage.setItem(LS_LIMITS, JSON.stringify(limits));
            localStorage.setItem(LS_FLEET, JSON.stringify(fleetVehicles));
        };
        const saveAuth = () => {
            localStorage.setItem(LS_ADMIN, JSON.stringify(adminAccount));
            localStorage.setItem(LS_USERS, JSON.stringify(employees));
            localStorage.setItem(LS_LOGS, JSON.stringify(logs));
        };
        const addLog = (actor, action) => {
            logs.unshift({ts: new Date().toISOString(), actor, action});
            if (logs.length > 300) logs = logs.slice(0, 300);
            saveAuth();
        };
        const hashPassword = async (pwd) => {
            const enc = new TextEncoder().encode(pwd);
            const buf = await crypto.subtle.digest('SHA-256', enc);
            return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
        };
        // Wszystkie tożsamości do wyboru (administrator + pracownicy)
        const getAllIdentities = () => {
            const list = [];
            if (adminAccount) list.push({id:'admin', login:adminAccount.login, name:adminAccount.login+' (Administrator)', type:'admin'});
            employees.forEach(u=>list.push({id:u.id, login:u.login, name:u.name, type:'user'}));
            return list;
        };
        // Weryfikuje hasło podanego identyfikatora; category (opcjonalnie) sprawdza czy pracownik ma uprawnienia do danej kategorii
        // action: 'add' | 'edit' | 'delete' — sprawdza czy pracownik ma zarówno "przeglądanie" jak i daną operację w danej kategorii
        const verifySignerPassword = async (signerId, password, category, action) => {
            const hash = await hashPassword(password || '');
            if (signerId === 'admin') {
                return (adminAccount && hash === adminAccount.passwordHash) ? {ok:true, name: adminAccount.login+' (Administrator)'} : {ok:false, reason:'password'};
            }
            const u = employees.find(e=>e.id === signerId);
            if (!u) return {ok:false, reason:'notfound'};
            if (hash !== u.passwordHash) return {ok:false, reason:'password'};
            if (category) {
                const p = (u.permissions && u.permissions[category]) || {};
                if (!p.view) return {ok:false, reason:'view'};
                if (action && !p[action]) return {ok:false, reason:'action', action};
            }
            return {ok:true, name:u.name};
        };
        // Weryfikuje samo hasło administratora (do akcji w panelu Administratora)
        const verifyAdminPassword = async (password) => {
            if (!adminAccount) return false;
            const hash = await hashPassword(password || '');
            return hash === adminAccount.passwordHash;
        };
        const ACTION_LABELS = {add:'dodawania', edit:'edycji', delete:'usuwania'};
        const signerErrorMessage = (check) => {
            if (check.reason === 'view') return 'Ten identyfikator nie ma uprawnień do tej kategorii.';
            if (check.reason === 'action') return `Ten identyfikator nie ma uprawnień do ${ACTION_LABELS[check.action]||'tej operacji'} w tej kategorii.`;
            return 'Nieprawidłowy identyfikator lub hasło.';
        };
        // === BRAMKA HASŁA DLA ZAKŁADKI ADMINISTRATOR ===
        const unlockAdminTab = () => {
            adminTabUnlocked = true;
            document.getElementById('admin-gate').classList.add('hidden');
            document.getElementById('admin-content').classList.remove('hidden');
            renderAll();
        };
        document.getElementById('admin-gate-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('admin-gate-error');
            errEl.classList.add('hidden');
            const pwd = document.getElementById('admin-gate-password').value;
            if (!(await verifyAdminPassword(pwd))) { errEl.textContent = 'Nieprawidłowe hasło.'; errEl.classList.remove('hidden'); return; }
            document.getElementById('admin-gate-password').value = '';
            unlockAdminTab();
        });
        document.getElementById('show-recovery-btn').addEventListener('click', ()=>{
            document.getElementById('recovery-form').classList.toggle('hidden');
        });
        document.getElementById('recovery-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('recovery-error');
            errEl.classList.add('hidden');
            const code = document.getElementById('recovery-code').value.trim();
            const pwd = document.getElementById('recovery-new-password').value;
            const pwd2 = document.getElementById('recovery-new-password2').value;
            const codeHash = await hashPassword(code);
            if (codeHash !== RECOVERY_CODE_HASH) { errEl.textContent = 'Nieprawidłowy kod zabezpieczający.'; errEl.classList.remove('hidden'); return; }
            if (pwd !== pwd2) { errEl.textContent = 'Nowe hasła nie są identyczne.'; errEl.classList.remove('hidden'); return; }
            adminAccount.passwordHash = await hashPassword(pwd);
            saveAuth();
            addLog(adminAccount.login+' (Administrator)', 'Odzyskano dostęp administratora kodem zabezpieczającym i ustawiono nowe hasło');
            e.target.reset();
            e.target.classList.add('hidden');
            alert('Hasło administratora zostało zresetowane. Zalogowano do panelu.');
            unlockAdminTab();
        });
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
        // Normalizacja adresu do porównań — ignoruje wielkość liter i nadmiarowe spacje,
        // ale zachowuje polskie znaki, żeby nie łączyć różnych nazw ulic
        const normalizeAddress = (addr) => (addr || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
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
            document.getElementById('edit-signer-password').value = '';
            document.getElementById('edit-signer-error').classList.add('hidden');
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
            document.getElementById('edit-dev-signer-password').value = '';
            document.getElementById('edit-dev-signer-error').classList.add('hidden');
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
            document.getElementById('edit-key-signer-password').value = '';
            document.getElementById('edit-key-signer-error').classList.add('hidden');
            document.getElementById('edit-key-modal').classList.remove('hidden');        };
        // Generyczna odmiana polskich liczebników: [1, 2-4, 5+]
        const pluralPL = (n, forms) => {
            if (n === 1) return forms[0];
            const lastDigit = n % 10, lastTwo = n % 100;
            if (lastDigit>=2 && lastDigit<=4 && !(lastTwo>=12 && lastTwo<=14)) return forms[1];
            return forms[2];
        };
        const pluralDostawy = (n) => pluralPL(n, ['dostawa','dostawy','dostaw']);

        // === PIERWSZA KONFIGURACJA ADMINISTRATORA (jednorazowa, nie wymaga logowania do przeglądania) ===
        const renderAuthScreen = () => {
            const authScreen = document.getElementById('auth-screen');
            const authContent = document.getElementById('auth-content');
            if (adminAccount) { authScreen.classList.add('hidden'); return; }
            authScreen.classList.remove('hidden');
            authContent.innerHTML = `
                <h2 class="text-lg font-bold mb-2">Konfiguracja konta administratora</h2>
                <p class="text-sm text-gray-500 mb-4">To pierwsze uruchomienie systemu. Utwórz konto administratora — te dane zostaną zapamiętane na stałe w tej przeglądarce. Ten krok wykonuje się tylko raz; później strona nie będzie wymagać logowania do przeglądania — hasło będzie potrzebne tylko przy dodawaniu lub zmianie danych.</p>
                <form id="setup-form" class="space-y-4">
                    <div><label class="block text-sm font-medium mb-1">Login administratora *</label><input type="text" id="setup-login" required class="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"></div>
                    <div><label class="block text-sm font-medium mb-1">Hasło *</label><input type="password" id="setup-password" required minlength="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"></div>
                    <div><label class="block text-sm font-medium mb-1">Powtórz hasło *</label><input type="password" id="setup-password2" required minlength="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg input-focus"></div>
                    <div id="setup-error" class="text-red-600 text-sm hidden"></div>
                    <button type="submit" class="w-full bg-green-700 text-white py-2 rounded-lg font-medium hover:bg-green-800 transition">Utwórz konto</button>
                </form>`;
            document.getElementById('setup-form').addEventListener('submit', async e=>{
                e.preventDefault();
                const login = document.getElementById('setup-login').value.trim();
                const pwd = document.getElementById('setup-password').value;
                const pwd2 = document.getElementById('setup-password2').value;
                const errEl = document.getElementById('setup-error');
                if (pwd !== pwd2) { errEl.textContent = 'Hasła nie są identyczne.'; errEl.classList.remove('hidden'); return; }
                const hash = await hashPassword(pwd);
                adminAccount = {login, passwordHash: hash};
                saveAuth();
                addLog(login+' (Administrator)', 'Utworzono konto administratora');
                authScreen.classList.add('hidden');
                renderAll();
            });
        };
        // Uzupełnia listy identyfikatorów w formularzach dodawania/edycji rekordów
        const populateSignerSelects = () => {
            const identities = getAllIdentities();
            const opts = identities.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
            ['order-signer','dev-signer','key-signer','waste-signer','edit-signer','edit-dev-signer','edit-key-signer','edit-waste-signer'].forEach(id=>{
                const el = document.getElementById(id);
                if (!el) return;
                const prev = el.value;
                el.innerHTML = opts;
                if (prev && identities.some(i=>i.id===prev)) el.value = prev;
            });
        };

        // === WSZYSTKIE DOSTAWY ODPADÓW DLA DANEGO ADRESU ===
        const openAddressWaste = (address) => {
            const norm = normalizeAddress(address);
            const matches = wasteRecords.filter(w => normalizeAddress(w.address) === norm);
            const totalKg = matches.reduce((s,w)=>s+(Number(w.kg)||0),0);
            document.getElementById('address-orders-title').textContent = address;
            document.getElementById('address-orders-count').textContent = `${matches.length} ${pluralDostawy(matches.length)} odpadów na tym adresie — łącznie ${totalKg.toFixed(1).replace('.',',')} kg`;
            // Sprawdź przekroczenie limitu w miesiącu wybranym w zakładce Odpady
            const selMonth = document.getElementById('waste-month-filter').value || today().slice(0,7);
            const monthSums = {};
            matches.filter(w=>w.date && w.date.startsWith(selMonth)).forEach(w=>{
                monthSums[w.wasteType] = (monthSums[w.wasteType]||0) + (Number(w.kg)||0);
            });
            const exceededTypes = Object.entries(monthSums).filter(([type,sum])=>{
                const limit = Number(limits[type])||0;
                return limit>0 && sum>limit;
            });
            const addrAlertEl = document.getElementById('address-orders-alert');
            addrAlertEl.innerHTML = exceededTypes.length === 0 ? '' : `
                <div class="bg-red-50 border-l-4 border-red-600 text-red-800 p-4 rounded-lg">
                    <p class="font-bold mb-1"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Nadwyżka odpadów — przekroczono limit na tym adresie w miesiącu ${selMonth}:</p>
                    <ul class="list-disc list-inside text-sm">
                        ${exceededTypes.map(([type,sum])=>{const limit=Number(limits[type])||0; return `<li>${type}: ${sum.toFixed(1).replace('.',',')} kg (limit ${limit} kg, nadwyżka ${(sum-limit).toFixed(1).replace('.',',')} kg)</li>`;}).join('')}
                    </ul>
                </div>`;
            document.getElementById('address-orders-list').innerHTML = matches.length === 0
                ? '<div class="p-4 text-center text-gray-500">Brak dostaw odpadów dla tego adresu</div>'
                : matches.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(w=>`
                    <div class="clickable-row p-3 border rounded-lg cursor-pointer hover:shadow-md transition mb-2" data-id="${w.id}">
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-bold text-green-700">${w.client}</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">${w.wasteType}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm text-gray-500 mt-1">
                            <span><i class="fa-solid fa-phone"></i> ${formatPhone(w.phone)} | <i class="fa-solid fa-calendar-days"></i> ${formatDate(w.date)}</span>
                            <span class="font-bold text-green-700">${Number(w.kg||0).toFixed(1).replace('.',',')} kg</span>
                        </div>
                        ${w.addedBy ? `<div class="text-xs text-gray-400 mt-1"><i class="fa-solid fa-user-pen mr-1"></i>Dodał: ${w.addedBy}</div>` : ''}
                    </div>`).join('');
            document.querySelectorAll('#address-orders-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>{
                    document.getElementById('address-orders-modal').classList.add('hidden');
                    openWasteForEdit(wasteRecords.find(w=>w.id===el.dataset.id));
                });
            });
            document.getElementById('address-orders-modal').classList.remove('hidden');
        };
        document.getElementById('close-address-orders-modal').addEventListener('click', ()=>document.getElementById('address-orders-modal').classList.add('hidden'));
        document.getElementById('close-address-orders-btn').addEventListener('click', ()=>document.getElementById('address-orders-modal').classList.add('hidden'));
        // Oblicza status przeglądu technicznego na podstawie liczby dni do terminu
        const INSPECTION_WARN_DAYS = 30;
        const getInspectionStatus = (dateStr) => {
            if (!dateStr) return {status:'ok', days:null};
            const msPerDay = 24*60*60*1000;
            const todayMid = new Date(today()+'T00:00:00');
            const insp = new Date(dateStr+'T00:00:00');
            const days = Math.round((insp - todayMid) / msPerDay);
            if (days < 0) return {status:'overdue', days};
            if (days <= INSPECTION_WARN_DAYS) return {status:'soon', days};
            return {status:'ok', days};
        };
        const openFleetForEdit = (v) => {
            searchResults.classList.add('hidden'); searchInput.value = '';
            document.getElementById('edit-fleet-id').value = v.id;
            document.getElementById('edit-fleet-model').value = v.model;
            document.getElementById('edit-fleet-plate').value = v.plate;
            document.getElementById('edit-fleet-vin').value = v.vin || '';
            document.getElementById('edit-fleet-driver').value = v.driver || '';
            document.getElementById('edit-fleet-inspection').value = v.inspection;
            document.getElementById('edit-fleet-notes').value = v.notes || '';
            document.getElementById('edit-fleet-modal').classList.remove('hidden');
        };
        const openUserForEdit = (u) => {
            document.getElementById('edit-user-id').value = u.id;
            document.getElementById('edit-user-login').value = u.login;
            document.getElementById('edit-user-name').value = u.name;
            document.getElementById('edit-user-password').value = '';
            document.getElementById('edit-user-admin-password').value = '';
            renderPermissionCheckboxes('edit-user-permissions-checkboxes', u.permissions||{});
            document.getElementById('edit-user-error').classList.add('hidden');
            document.getElementById('edit-user-modal').classList.remove('hidden');
        };
        const openWasteForEdit = (w) => {
            searchResults.classList.add('hidden'); searchInput.value = '';
            document.getElementById('edit-waste-id').value = w.id;
            document.getElementById('edit-waste-client').value = w.client;
            document.getElementById('edit-waste-phone').value = formatPhone(w.phone);
            document.getElementById('edit-waste-address').value = w.address;
            document.getElementById('edit-waste-type').value = w.wasteType;
            document.getElementById('edit-waste-kg').value = w.kg;
            document.getElementById('edit-waste-date').value = w.date;
            document.getElementById('edit-waste-signer-password').value = '';
            document.getElementById('edit-waste-signer-error').classList.add('hidden');
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
                    results.push({type:'Zgłoszenie', label:`${o.clientName} — ${o.device}`, sub:`<i class="fa-solid fa-phone"></i> ${formatPhone(o.clientPhone)} | ${o.serviceType} | ${formatDate(o.date)}`, data:o, openFn:()=>openOrderForEdit(o)});
                }
            });
            devices.forEach(d => {
                if (normalizeText(d.client).includes(phrase) || normalizeText(d.phone).includes(phrase) ||
                    normalizeText(d.type).includes(phrase) || normalizeText(d.car).includes(phrase) ||
                    normalizeText(d.description).includes(phrase)) {
                    results.push({type:'Pojemnik', label:`${d.client} — ${d.type}`, sub:`<i class="fa-solid fa-phone"></i> ${formatPhone(d.phone)} | ${d.car||'brak adresu'} | ${formatDate(d.date)}`, data:d, openFn:()=>openDeviceForEdit(d)});
                }
            });
            keysData.forEach(k => {
                if (normalizeText(k.client).includes(phrase) || normalizeText(k.phone).includes(phrase) ||
                    normalizeText(k.car).includes(phrase) || normalizeText(k.service).includes(phrase) ||
                    normalizeText(k.notes).includes(phrase)) {
                    results.push({type:'Harmonogram', label:`${k.client} — ${k.car}`, sub:`<i class="fa-solid fa-phone"></i> ${formatPhone(k.phone)} | ${k.service} | ${formatDate(k.date)}`, data:k, openFn:()=>openKeyForEdit(k)});
                }
            });
            wasteRecords.forEach(w => {
                if (normalizeText(w.client).includes(phrase) || normalizeText(w.phone).includes(phrase) ||
                    normalizeText(w.address).includes(phrase) || normalizeText(w.wasteType).includes(phrase)) {
                    results.push({type:'Dostawa odpadów', label:`${w.client} — ${w.address}`, sub:`<i class="fa-solid fa-phone"></i> ${formatPhone(w.phone)} | ${w.wasteType} — ${Number(w.kg||0).toFixed(1).replace('.',',')} kg | ${formatDate(w.date)}`, data:w, openFn:()=>openWasteForEdit(w)});
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
        document.getElementById('order-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('order-signer-error');
            errEl.classList.add('hidden');
            const signerId = document.getElementById('order-signer').value;
            const signerPwd = document.getElementById('order-signer-password').value;
            const check = await verifySignerPassword(signerId, signerPwd, 'orders', 'add');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
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
                date: today(),
                addedBy: check.name
            };
            orders.unshift(order);
            save(); e.target.reset(); populateSignerSelects();
            addLog(check.name, `Dodano zgłoszenie: ${order.clientName} — ${order.device}`);
            renderAll();
        });
        // === DODAJ URZĄDZENIE ===
        document.getElementById('device-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('dev-signer-error');
            errEl.classList.add('hidden');
            const signerId = document.getElementById('dev-signer').value;
            const signerPwd = document.getElementById('dev-signer-password').value;
            const check = await verifySignerPassword(signerId, signerPwd, 'devices', 'add');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
            const dev = {
                id: Date.now().toString(),
                client: document.getElementById('dev-client').value,
                phone: document.getElementById('dev-phone').value.replace(/\D/g,''),
                type: document.getElementById('dev-type').value,
                car: document.getElementById('dev-car').value,
                description: document.getElementById('dev-desc').value,
                price: document.getElementById('dev-price').value,
                status: document.getElementById('dev-status').value,
                date: today(),
                addedBy: check.name
            };
            devices.unshift(dev);
            save(); e.target.reset(); populateSignerSelects();
            addLog(check.name, `Dodano pojemnik: ${dev.client} — ${dev.type}`);
            renderAll();
        });
        // === DODAJ HARMONOGRAM ===
        document.getElementById('key-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('key-signer-error');
            errEl.classList.add('hidden');
            const signerId = document.getElementById('key-signer').value;
            const signerPwd = document.getElementById('key-signer-password').value;
            const check = await verifySignerPassword(signerId, signerPwd, 'keys', 'add');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
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
                date: today(),
                addedBy: check.name
            };
            keysData.unshift(key);
            save(); e.target.reset(); populateSignerSelects();
            addLog(check.name, `Dodano harmonogram: ${key.client} — ${key.car}`);
            renderAll();
        });
        // === DODAJ DOSTAWĘ ODPADÓW ===
        document.getElementById('waste-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('waste-signer-error');
            errEl.classList.add('hidden');
            const signerId = document.getElementById('waste-signer').value;
            const signerPwd = document.getElementById('waste-signer-password').value;
            const check = await verifySignerPassword(signerId, signerPwd, 'waste', 'add');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
            const rec = {
                id: Date.now().toString(),
                client: document.getElementById('waste-client').value,
                phone: document.getElementById('waste-phone').value.replace(/\D/g,''),
                address: document.getElementById('waste-address').value,
                wasteType: document.getElementById('waste-type').value,
                kg: document.getElementById('waste-kg').value,
                date: document.getElementById('waste-date').value || today(),
                addedBy: check.name
            };
            wasteRecords.unshift(rec);
            save(); e.target.reset();
            document.getElementById('waste-date').value = today();
            populateSignerSelects();
            addLog(check.name, `Dodano dostawę odpadów: ${rec.client} — ${rec.address} (${rec.kg} kg)`);
            renderAll();
        });
        // === DODAJ PRACOWNIKA ===
        const PERM_ACTIONS = ['view','add','edit','delete'];
        const renderPermissionCheckboxes = (containerId, permsObj={}) => {
            document.getElementById(containerId).innerHTML = TAB_PERMISSIONS.map(t=>{
                const p = permsObj[t.key] || {};
                return `<tr class="border-t">
                    <td class="py-1.5 px-2 font-medium">${t.label}</td>
                    ${PERM_ACTIONS.map(a=>`<td class="text-center py-1.5 px-1"><input type="checkbox" class="perm-checkbox" data-cat="${t.key}" data-action="${a}" ${p[a]?'checked':''}></td>`).join('')}
                </tr>`;
            }).join('');
        };
        // Odczytuje macierz uprawnień z checkboxów w danym kontenerze
        const readPermissionCheckboxes = (containerId) => {
            const perms = {};
            document.querySelectorAll(`#${containerId} .perm-checkbox`).forEach(cb=>{
                const cat = cb.dataset.cat, action = cb.dataset.action;
                if (!perms[cat]) perms[cat] = {view:false, add:false, edit:false, delete:false};
                perms[cat][action] = cb.checked;
            });
            return perms;
        };
        // Czytelne podsumowanie macierzy uprawnień do wyświetlenia na liście pracowników
        const formatPermSummary = (permsObj) => {
            if (!permsObj) return '<span class="text-gray-400">Brak dostępu</span>';
            const parts = TAB_PERMISSIONS.filter(t => permsObj[t.key] && permsObj[t.key].view).map(t=>{
                const p = permsObj[t.key];
                const acts = [];
                if (p.add) acts.push('Dodaj');
                if (p.edit) acts.push('Edytuj');
                if (p.delete) acts.push('Usuń');
                return `${t.label}${acts.length ? ' ('+acts.join(', ')+')' : ' (tylko podgląd)'}`;
            });
            return parts.length ? parts.join('; ') : '<span class="text-gray-400">Brak dostępu</span>';
        };
        renderPermissionCheckboxes('user-permissions-checkboxes');
        document.getElementById('user-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('user-form-error');
            errEl.classList.add('hidden');
            const login = document.getElementById('user-login').value.trim();
            const name = document.getElementById('user-name').value.trim();
            const password = document.getElementById('user-password').value;
            const adminPwd = document.getElementById('user-form-admin-password').value;
            const permissions = readPermissionCheckboxes('user-permissions-checkboxes');
            if (!(await verifyAdminPassword(adminPwd))) { errEl.textContent = 'Nieprawidłowe hasło administratora.'; errEl.classList.remove('hidden'); return; }
            const loginTaken = (adminAccount && adminAccount.login.toLowerCase()===login.toLowerCase()) ||
                employees.some(u=>u.login.toLowerCase()===login.toLowerCase());
            if (loginTaken) { errEl.textContent = 'Ten identyfikator jest już zajęty.'; errEl.classList.remove('hidden'); return; }
            const passwordHash = await hashPassword(password);
            const user = {id: Date.now().toString(), login, name, passwordHash, permissions};
            employees.push(user);
            saveAuth(); e.target.reset(); renderPermissionCheckboxes('user-permissions-checkboxes');
            addLog(adminAccount.login+' (Administrator)', `Dodano pracownika: ${name} (${login})`);
            renderAll();
        });
        // === ZMIANA HASŁA ADMINISTRATORA ===
        document.getElementById('admin-password-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('admin-password-error');
            errEl.classList.add('hidden');
            const currentPwd = document.getElementById('admin-current-password').value;
            const pwd = document.getElementById('admin-new-password').value;
            const pwd2 = document.getElementById('admin-new-password2').value;
            if (!(await verifyAdminPassword(currentPwd))) { errEl.textContent = 'Obecne hasło jest nieprawidłowe.'; errEl.classList.remove('hidden'); return; }
            if (pwd !== pwd2) { errEl.textContent = 'Nowe hasła nie są identyczne.'; errEl.classList.remove('hidden'); return; }
            adminAccount.passwordHash = await hashPassword(pwd);
            saveAuth(); e.target.reset();
            addLog(adminAccount.login+' (Administrator)', 'Zmieniono hasło administratora');
            alert('Hasło administratora zostało zmienione.');
        });
        // === DODAJ POJAZD DO FLOTY ===
        document.getElementById('fleet-form').addEventListener('submit', e=>{
            e.preventDefault();
            const v = {
                id: Date.now().toString(),
                model: document.getElementById('fleet-model').value,
                plate: document.getElementById('fleet-plate').value,
                vin: document.getElementById('fleet-vin').value,
                driver: document.getElementById('fleet-driver').value,
                inspection: document.getElementById('fleet-inspection').value,
                notes: document.getElementById('fleet-notes').value
            };
            fleetVehicles.unshift(v);
            save(); e.target.reset(); renderAll();
        });
        // === ZAPIS EDYCJI ZLECENIA ===
        document.getElementById('edit-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('edit-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-signer').value, document.getElementById('edit-signer-password').value, 'orders', 'edit');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
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
                save();
                addLog(check.name, `Zmieniono zgłoszenie: ${orders[idx].clientName} — ${orders[idx].device}`);
                renderAll();
            }
            document.getElementById('edit-modal').classList.add('hidden');
        });
        // === USUŃ ZLECENIE ===
        document.getElementById('delete-btn').addEventListener('click', async ()=>{
            const errEl = document.getElementById('edit-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-signer').value, document.getElementById('edit-signer-password').value, 'orders', 'delete');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
            const id = document.getElementById('edit-id').value;
            const o = orders.find(x=>x.id===id);
            if (confirm('Czy na pewno usunąć to zgłoszenie? Operacja jest nieodwracalna!')) {
                orders = orders.filter(o=>o.id !== id);
                save();
                if (o) addLog(check.name, `Usunięto zgłoszenie: ${o.clientName} — ${o.device}`);
                renderAll();
                document.getElementById('edit-modal').classList.add('hidden');
            }
        });
        // === ZAPIS EDYCJI URZĄDZENIA ===
        document.getElementById('edit-device-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('edit-dev-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-dev-signer').value, document.getElementById('edit-dev-signer-password').value, 'devices', 'edit');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
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
                save();
                addLog(check.name, `Zmieniono pojemnik: ${devices[idx].client} — ${devices[idx].type}`);
                renderAll();
            }
            document.getElementById('edit-device-modal').classList.add('hidden');
        });
        // === USUŃ URZĄDZENIE ===
        document.getElementById('delete-dev-btn').addEventListener('click', async ()=>{
            const errEl = document.getElementById('edit-dev-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-dev-signer').value, document.getElementById('edit-dev-signer-password').value, 'devices', 'delete');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
            const id = document.getElementById('edit-dev-id').value;
            const d = devices.find(x=>x.id===id);
            if (confirm('Czy na pewno usunąć ten pojemnik? Operacja jest nieodwracalna!')) {
                devices = devices.filter(d=>d.id !== id);
                save();
                if (d) addLog(check.name, `Usunięto pojemnik: ${d.client} — ${d.type}`);
                renderAll();
                document.getElementById('edit-device-modal').classList.add('hidden');
            }
        });
        // === ZAPIS EDYCJI HARMONOGRAMU ===
        document.getElementById('edit-key-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('edit-key-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-key-signer').value, document.getElementById('edit-key-signer-password').value, 'keys', 'edit');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
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
                save();
                addLog(check.name, `Zmieniono harmonogram: ${keysData[idx].client} — ${keysData[idx].car}`);
                renderAll();
            }
            document.getElementById('edit-key-modal').classList.add('hidden');
        });
        // === USUŃ HARMONOGRAM ===
        document.getElementById('delete-key-btn').addEventListener('click', async ()=>{
            const errEl = document.getElementById('edit-key-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-key-signer').value, document.getElementById('edit-key-signer-password').value, 'keys', 'delete');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
            const id = document.getElementById('edit-key-id').value;
            const k = keysData.find(x=>x.id===id);
            if (confirm('Czy na pewno usunąć ten harmonogram? Operacja jest nieodwracalna!')) {
                keysData = keysData.filter(k=>k.id !== id);
                save();
                if (k) addLog(check.name, `Usunięto harmonogram: ${k.client} — ${k.car}`);
                renderAll();
                document.getElementById('edit-key-modal').classList.add('hidden');
            }
        });
        // === ZAPIS EDYCJI DOSTAWY ODPADÓW ===
        document.getElementById('edit-waste-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('edit-waste-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-waste-signer').value, document.getElementById('edit-waste-signer-password').value, 'waste', 'edit');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
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
                save();
                addLog(check.name, `Zmieniono dostawę odpadów: ${wasteRecords[idx].client} — ${wasteRecords[idx].address}`);
                renderAll();
            }
            document.getElementById('edit-waste-modal').classList.add('hidden');
        });
        // === USUŃ DOSTAWĘ ODPADÓW ===
        document.getElementById('delete-waste-btn').addEventListener('click', async ()=>{
            const errEl = document.getElementById('edit-waste-signer-error');
            errEl.classList.add('hidden');
            const check = await verifySignerPassword(document.getElementById('edit-waste-signer').value, document.getElementById('edit-waste-signer-password').value, 'waste', 'delete');
            if (!check.ok) { errEl.textContent = signerErrorMessage(check); errEl.classList.remove('hidden'); return; }
            const id = document.getElementById('edit-waste-id').value;
            const w = wasteRecords.find(x=>x.id===id);
            if (confirm('Czy na pewno usunąć tę dostawę odpadów? Operacja jest nieodwracalna!')) {
                wasteRecords = wasteRecords.filter(w=>w.id !== id);
                save();
                if (w) addLog(check.name, `Usunięto dostawę odpadów: ${w.client} — ${w.address}`);
                renderAll();
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
        // === ZAPIS EDYCJI POJAZDU FLOTY ===
        document.getElementById('edit-fleet-form').addEventListener('submit', e=>{
            e.preventDefault();
            const id = document.getElementById('edit-fleet-id').value;
            const idx = fleetVehicles.findIndex(v=>v.id===id);
            if (idx !== -1) {
                fleetVehicles[idx] = {
                    ...fleetVehicles[idx],
                    model: document.getElementById('edit-fleet-model').value,
                    plate: document.getElementById('edit-fleet-plate').value,
                    vin: document.getElementById('edit-fleet-vin').value,
                    driver: document.getElementById('edit-fleet-driver').value,
                    inspection: document.getElementById('edit-fleet-inspection').value,
                    notes: document.getElementById('edit-fleet-notes').value
                };
                save(); renderAll();
            }
            document.getElementById('edit-fleet-modal').classList.add('hidden');
        });
        // === USUŃ POJAZD Z FLOTY ===
        document.getElementById('delete-fleet-btn').addEventListener('click', ()=>{
            const id = document.getElementById('edit-fleet-id').value;
            if (confirm('Czy na pewno usunąć ten pojazd z rejestru floty? Operacja jest nieodwracalna!')) {
                fleetVehicles = fleetVehicles.filter(v=>v.id !== id);
                save(); renderAll();
                document.getElementById('edit-fleet-modal').classList.add('hidden');
            }
        });
        document.getElementById('close-edit-fleet-modal').addEventListener('click', ()=>document.getElementById('edit-fleet-modal').classList.add('hidden'));
        document.getElementById('cancel-edit-fleet-btn').addEventListener('click', ()=>document.getElementById('edit-fleet-modal').classList.add('hidden'));
        // === ZAPIS EDYCJI PRACOWNIKA ===
        document.getElementById('edit-user-form').addEventListener('submit', async e=>{
            e.preventDefault();
            const errEl = document.getElementById('edit-user-error');
            errEl.classList.add('hidden');
            const id = document.getElementById('edit-user-id').value;
            const idx = employees.findIndex(u=>u.id===id);
            if (idx === -1) return;
            const login = document.getElementById('edit-user-login').value.trim();
            const name = document.getElementById('edit-user-name').value.trim();
            const newPassword = document.getElementById('edit-user-password').value;
            const adminPwd = document.getElementById('edit-user-admin-password').value;
            const permissions = readPermissionCheckboxes('edit-user-permissions-checkboxes');
            if (!(await verifyAdminPassword(adminPwd))) { errEl.textContent = 'Nieprawidłowe hasło administratora.'; errEl.classList.remove('hidden'); return; }
            const loginTaken = (adminAccount && adminAccount.login.toLowerCase()===login.toLowerCase()) ||
                employees.some(u=>u.id!==id && u.login.toLowerCase()===login.toLowerCase());
            if (loginTaken) { errEl.textContent = 'Ten identyfikator jest już zajęty.'; errEl.classList.remove('hidden'); return; }
            employees[idx].login = login;
            employees[idx].name = name;
            employees[idx].permissions = permissions;
            if (newPassword) employees[idx].passwordHash = await hashPassword(newPassword);
            saveAuth();
            addLog(adminAccount.login+' (Administrator)', `Zmieniono dane pracownika: ${name} (${login})`);
            document.getElementById('edit-user-modal').classList.add('hidden');
            renderAll();
        });
        document.getElementById('delete-user-btn').addEventListener('click', async ()=>{
            const errEl = document.getElementById('edit-user-error');
            errEl.classList.add('hidden');
            const id = document.getElementById('edit-user-id').value;
            const u = employees.find(x=>x.id===id);
            const adminPwd = document.getElementById('edit-user-admin-password').value;
            if (!(await verifyAdminPassword(adminPwd))) { errEl.textContent = 'Podaj poprawne hasło administratora, aby usunąć pracownika.'; errEl.classList.remove('hidden'); return; }
            if (confirm('Czy na pewno usunąć tego pracownika? Operacja jest nieodwracalna!')) {
                employees = employees.filter(x=>x.id !== id);
                saveAuth();
                if (u) addLog(adminAccount.login+' (Administrator)', `Usunięto pracownika: ${u.name} (${u.login})`);
                document.getElementById('edit-user-modal').classList.add('hidden');
                renderAll();
            }
        });
        document.getElementById('close-edit-user-modal').addEventListener('click', ()=>document.getElementById('edit-user-modal').classList.add('hidden'));
        document.getElementById('cancel-edit-user-btn').addEventListener('click', ()=>document.getElementById('edit-user-modal').classList.add('hidden'));
        // === ZAMYKANIE OKIEN EDYCJI ===
        document.getElementById('close-edit').addEventListener('click', ()=>document.getElementById('edit-modal').classList.add('hidden'));
        document.getElementById('cancel-edit').addEventListener('click', ()=>document.getElementById('edit-modal').classList.add('hidden'));
        document.getElementById('close-device-edit').addEventListener('click', ()=>document.getElementById('edit-device-modal').classList.add('hidden'));
        document.getElementById('cancel-device-edit').addEventListener('click', ()=>document.getElementById('edit-device-modal').classList.add('hidden'));
        document.getElementById('close-key-edit').addEventListener('click', ()=>document.getElementById('edit-key-modal').classList.add('hidden'));
        document.getElementById('cancel-key-edit').addEventListener('click', ()=>document.getElementById('edit-key-modal').classList.add('hidden'));
        // === EKSPORT / IMPORT ===
        document.getElementById('export-btn').addEventListener('click', ()=>{
            const data = { exportedAt: new Date().toISOString(), orders, devices, keys: keysData, waste: wasteRecords, limits, fleet: fleetVehicles };
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
                        wasteRecords = imported.waste || []; limits = imported.limits || {}; fleetVehicles = imported.fleet || [];
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
                const payload = { exportedAt: new Date().toISOString(), orders, devices, keys: keysData, waste: wasteRecords, limits, fleet: fleetVehicles };
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
                    wasteRecords = imported.waste || []; limits = imported.limits || {}; fleetVehicles = imported.fleet || [];
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
            const ids = ['client-phone','dev-phone','key-phone','waste-phone','edit-phone','edit-dev-phone','edit-key-phone','edit-waste-phone'];
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
                            <span><i class="fa-solid fa-phone"></i> ${formatPhone(o.clientPhone)} | <i class="fa-solid fa-calendar-days"></i> ${formatDate(o.date)}</span>
                            <span class="font-bold text-green-700">${Number(o.amount||0).toFixed(2).replace('.',',')} zł</span>
                        </div>
                        ${o.addedBy ? `<div class="text-xs text-gray-400 mt-1"><i class="fa-solid fa-user-pen mr-1"></i>Dodał: ${o.addedBy}</div>` : ''}
                    </div>`).join('');
            document.querySelectorAll('#orders-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openOrderForEdit(orders.find(o=>o.id===el.dataset.id)));
            });
            document.getElementById('devices-list').innerHTML = devices.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak pojemników</div>'
                : devices.map(d=>`
                    <div class="clickable-row grid grid-cols-6 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${d.id}">
                        <div class="font-medium">${d.client}</div>
                        <div>${d.type}</div>
                        <div><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status]||'bg-gray-100'}">${d.status}</span></div>
                        <div class="text-right font-bold text-green-700">${Number(d.price||0).toFixed(2).replace('.',',')} zł</div>
                        <div class="text-center text-sm text-gray-500">${formatDate(d.date)}</div>
                        <div class="text-center text-xs text-gray-500">${d.addedBy||'—'}</div>
                    </div>`).join('');
            document.querySelectorAll('#devices-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openDeviceForEdit(devices.find(d=>d.id===el.dataset.id)));
            });
            document.getElementById('keys-list').innerHTML = keysData.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak harmonogramów</div>'
                : keysData.map(k=>`
                    <div class="clickable-row grid grid-cols-7 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${k.id}">
                        <div class="font-medium">${k.client}</div>
                        <div>${k.car}</div>
                        <div class="text-sm">${k.service}</div>
                        <div><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[k.status]||'bg-gray-100'}">${k.status}</span></div>
                        <div class="text-right font-bold text-green-700">${Number(k.price||0).toFixed(2).replace('.',',')} zł</div>
                        <div class="text-center text-sm text-gray-500">${formatDate(k.date)}</div>
                        <div class="text-center text-xs text-gray-500">${k.addedBy||'—'}</div>
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
                    <div class="clickable-row grid grid-cols-6 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${w.id}">
                        <div class="font-medium">${w.client}</div>
                        <div class="text-sm">${w.address}</div>
                        <div class="text-sm">${w.wasteType}</div>
                        <div class="text-right font-bold text-green-700">${Number(w.kg||0).toFixed(1).replace('.',',')} kg</div>
                        <div class="text-center text-sm text-gray-500">${formatDate(w.date)}</div>
                        <div class="text-center text-xs text-gray-500">${w.addedBy||'—'}</div>
                    </div>`).join('');
            document.querySelectorAll('#waste-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openWasteForEdit(wasteRecords.find(w=>w.id===el.dataset.id)));
            });
            // Podsumowanie wg adresu i typu odpadu + wykrywanie przekroczeń limitu
            const wasteSummary = {};
            monthWaste.forEach(w=>{
                const sk = normalizeAddress(w.address)+'||'+w.wasteType;
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
                        <div class="font-medium text-green-700 hover:underline cursor-pointer address-link" data-address="${encodeURIComponent(s.address)}">${s.address}</div>
                        <div class="text-sm">${s.wasteType}</div>
                        <div class="text-right font-bold">${s.sum.toFixed(1).replace('.',',')} kg</div>
                        <div class="text-right text-gray-500">${hasLimit ? limit.toFixed(0)+' kg' : '—'}</div>
                        <div class="text-center">${statusHtml}</div>
                    </div>`;
                }).join('');
            document.querySelectorAll('#waste-summary-list .address-link').forEach(el=>{
                el.addEventListener('click', ()=>openAddressWaste(decodeURIComponent(el.dataset.address)));
            });
            // Statystyki zakładki Odpady
            document.getElementById('waste-stat-total').textContent = monthWaste.reduce((s,w)=>s+(Number(w.kg)||0),0).toFixed(1).replace('.',',')+' kg';
            document.getElementById('waste-stat-count').textContent = monthWaste.length;
            document.getElementById('waste-stat-exceeded').textContent = exceededList.length;
            const wasteBadge = document.getElementById('waste-badge');
            if (exceededList.length > 0) { wasteBadge.textContent = exceededList.length; wasteBadge.classList.remove('hidden'); }
            else { wasteBadge.classList.add('hidden'); }
            // Baner ostrzegawczy o nadwyżce odpadów
            const wasteBanner = document.getElementById('waste-alert-banner');
            wasteBanner.innerHTML = exceededList.length === 0 ? '' : `
                <div class="bg-red-50 border-l-4 border-red-600 text-red-800 p-4 rounded-lg">
                    <p class="font-bold mb-1"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Nadwyżka odpadów — przekroczono limit na ${exceededList.length} ${exceededList.length===1?'adresie':'adresach'} w miesiącu ${wasteMonth}:</p>
                    <ul class="list-disc list-inside text-sm">
                        ${exceededList.map(s=>{const limit=Number(limits[s.wasteType])||0; return `<li>${s.address} — ${s.wasteType}: ${s.sum.toFixed(1).replace('.',',')} kg (limit ${limit} kg, nadwyżka ${(s.sum-limit).toFixed(1).replace('.',',')} kg)</li>`;}).join('')}
                    </ul>
                </div>`;
            // === ZAKŁADKA FLOTA ===
            document.getElementById('fleet-list').innerHTML = fleetVehicles.length===0
                ? '<div class="p-4 text-center text-gray-500">Brak pojazdów w rejestrze</div>'
                : fleetVehicles.slice().sort((a,b)=>(a.inspection||'').localeCompare(b.inspection||'')).map(v=>{
                    const insp = getInspectionStatus(v.inspection);
                    const badge = insp.status==='overdue'
                        ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Przeterminowany o ${Math.abs(insp.days)} dni</span>`
                        : insp.status==='soon'
                            ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Za ${insp.days} dni</span>`
                            : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">OK</span>';
                    return `<div class="clickable-row grid grid-cols-5 p-3 border-b cursor-pointer hover:bg-green-50 transition ${insp.status==='overdue'?'limit-exceeded':''}" data-id="${v.id}">
                        <div class="font-medium">${v.model}</div>
                        <div class="text-sm">${v.plate}</div>
                        <div class="text-sm">${v.driver || '—'}</div>
                        <div class="text-center text-sm">${formatDate(v.inspection)}</div>
                        <div class="text-center">${badge}</div>
                    </div>`;
                }).join('');
            document.querySelectorAll('#fleet-list .clickable-row').forEach(el=>{
                el.addEventListener('click', ()=>openFleetForEdit(fleetVehicles.find(v=>v.id===el.dataset.id)));
            });
            const fleetOverdue = fleetVehicles.filter(v=>getInspectionStatus(v.inspection).status==='overdue');
            const fleetSoon = fleetVehicles.filter(v=>getInspectionStatus(v.inspection).status==='soon');
            document.getElementById('fleet-stat-total').textContent = fleetVehicles.length;
            document.getElementById('fleet-stat-soon').textContent = fleetSoon.length;
            document.getElementById('fleet-stat-overdue').textContent = fleetOverdue.length;
            const fleetAttention = fleetOverdue.length + fleetSoon.length;
            const fleetBadge = document.getElementById('fleet-badge');
            if (fleetAttention > 0) { fleetBadge.textContent = fleetAttention; fleetBadge.classList.remove('hidden'); }
            else { fleetBadge.classList.add('hidden'); }
            const fleetBanner = document.getElementById('fleet-alert-banner');
            fleetBanner.innerHTML = fleetAttention === 0 ? '' : `
                <div class="bg-red-50 border-l-4 border-red-600 text-red-800 p-4 rounded-lg">
                    <p class="font-bold mb-1"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Zbliżający się lub przeterminowany przegląd techniczny — ${fleetAttention} ${pluralPL(fleetAttention, ['pojazd','pojazdy','pojazdów'])}:</p>
                    <ul class="list-disc list-inside text-sm">
                        ${[...fleetOverdue, ...fleetSoon].map(v=>{const insp=getInspectionStatus(v.inspection); return `<li>${v.model} (${v.plate}) — ${insp.status==='overdue' ? 'przegląd przeterminowany o '+Math.abs(insp.days)+' dni' : 'przegląd za '+insp.days+' dni'} (${formatDate(v.inspection)})</li>`;}).join('')}
                    </ul>
                </div>`;
            // === ZAKŁADKA ADMINISTRATOR ===
            if (adminAccount && adminTabUnlocked) {
                document.getElementById('users-list').innerHTML = employees.length===0
                    ? '<div class="p-4 text-center text-gray-500 col-span-3">Brak pracowników</div>'
                    : employees.map(u=>`<div class="clickable-row grid grid-cols-3 p-3 border-b cursor-pointer hover:bg-green-50 transition" data-id="${u.id}"><div class="font-medium">${u.login}</div><div>${u.name}</div><div class="text-sm">${formatPermSummary(u.permissions)}</div></div>`).join('');
                document.querySelectorAll('#users-list .clickable-row').forEach(el=>{
                    el.addEventListener('click', ()=>openUserForEdit(employees.find(u=>u.id===el.dataset.id)));
                });
                document.getElementById('logs-list').innerHTML = logs.length===0
                    ? '<div class="p-4 text-center text-gray-500 col-span-3">Brak zdarzeń</div>'
                    : logs.map(l=>`<div class="grid grid-cols-3 p-3 border-b text-sm"><div class="text-gray-500">${new Date(l.ts).toLocaleString('pl-PL')}</div><div class="font-medium">${l.actor}</div><div>${l.action}</div></div>`).join('');
            }
            populateSignerSelects();
            const vehOrders = {};
            orders.forEach(o=>{const k=(normalizeAddress(o.device)+'||'+(o.serial||'')).trim(); if(!vehOrders[k])vehOrders[k]={name:o.device,serial:o.serial,customer:o.clientName,count:0}; vehOrders[k].count++; vehOrders[k].customer=o.clientName;});
            document.getElementById('vehicles-orders-list').innerHTML = Object.values(vehOrders).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehOrders).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium text-green-700 hover:underline cursor-pointer address-link" data-address="${encodeURIComponent(v.name)}">${v.name}</div><div>${v.serial||'—'}</div><div>${v.customer}</div><div class="text-center font-bold text-green-600">${v.count}</div></div>`).join('');
            document.querySelectorAll('#vehicles-orders-list .address-link').forEach(el=>{
                el.addEventListener('click', ()=>openAddressWaste(decodeURIComponent(el.dataset.address)));
            });
            const vehDevs = {};
            devices.forEach(d=>{const k=(d.type+'||'+normalizeAddress(d.car||'')).trim(); if(!vehDevs[k])vehDevs[k]={type:d.type,car:d.car,client:d.client,count:0}; vehDevs[k].count++;});
            document.getElementById('vehicles-devices-list').innerHTML = Object.values(vehDevs).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehDevs).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium">${v.type}</div><div class="hover:underline cursor-pointer address-link ${v.car?'text-green-700':'text-gray-400'}" data-address="${encodeURIComponent(v.car||'')}">${v.car||'—'}</div><div>${v.client}</div><div class="text-center font-bold text-amber-600">${v.count}</div></div>`).join('');
            document.querySelectorAll('#vehicles-devices-list .address-link').forEach(el=>{
                if (el.dataset.address) el.addEventListener('click', ()=>openAddressWaste(decodeURIComponent(el.dataset.address)));
            });
            const vehKeys = {};
            keysData.forEach(k=>{const k2=(normalizeAddress(k.car)+'||'+k.service).trim(); if(!vehKeys[k2])vehKeys[k2]={car:k.car,service:k.service,client:k.client,count:0}; vehKeys[k2].count++;});
            document.getElementById('vehicles-keys-list').innerHTML = Object.values(vehKeys).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehKeys).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium text-green-700 hover:underline cursor-pointer address-link" data-address="${encodeURIComponent(v.car)}">${v.car}</div><div>${v.service}</div><div>${v.client}</div><div class="text-center font-bold text-green-600">${v.count}</div></div>`).join('');
            document.querySelectorAll('#vehicles-keys-list .address-link').forEach(el=>{
                el.addEventListener('click', ()=>openAddressWaste(decodeURIComponent(el.dataset.address)));
            });
            const vehWaste = {};
            wasteRecords.forEach(w=>{const k=normalizeAddress(w.address); if(!vehWaste[k])vehWaste[k]={address:w.address,client:w.client,kg:0,count:0}; vehWaste[k].kg+=Number(w.kg)||0; vehWaste[k].count++; vehWaste[k].client=w.client;});
            document.getElementById('vehicles-waste-list').innerHTML = Object.values(vehWaste).length===0
                ? '<div class="p-4 text-center text-gray-500 col-span-4">Brak danych</div>'
                : Object.values(vehWaste).sort((a,b)=>b.kg-a.kg).map(v=>`<div class="grid grid-cols-4 p-3 border-b"><div class="font-medium text-green-700 hover:underline cursor-pointer address-link" data-address="${encodeURIComponent(v.address)}">${v.address}</div><div>${v.client}</div><div class="text-right font-bold">${v.kg.toFixed(1).replace('.',',')} kg</div><div class="text-center font-bold text-amber-600">${v.count}</div></div>`).join('');
            document.querySelectorAll('#vehicles-waste-list .address-link').forEach(el=>{
                el.addEventListener('click', ()=>openAddressWaste(decodeURIComponent(el.dataset.address)));
            });
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
        if (adminAccount) {
            document.getElementById('auth-screen').classList.add('hidden');
            renderAll();
        } else {
            renderAuthScreen();
        }
