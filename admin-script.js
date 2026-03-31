const ADMIN_PIN = '1521';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAukepNrTr6OASGO-Jt0_LmWhr5lOzRqKK1mHuiY4cASMIGQRsz0YAQz98hYGHUFGv/exec';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// Dynamic employee list stored in localStorage
function getEmployees() {
    const stored = localStorage.getItem('employeeList');
    if (stored) return JSON.parse(stored);
    // Default list
    const defaults = [
        'Anas Amrulloh','Dinda Ayu Putri','Evi Nurmala Dewi','Farid Kurniadi',
        'Rendy Revaldy','Christian Winata','Ikhwan Syafii','Lia Rahmah',
        'Faisal','Riyanto','Annisa Novitasari','Fatur Rohman',
        'Ananda Aditya Gunawan','M. Rizal Fahreji','Agus'
    ];
    localStorage.setItem('employeeList', JSON.stringify(defaults));
    return defaults;
}

let employeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');

// Monthly settings stored per month key: "YYYY-MM"
function getMonthKey(month, year) {
    return `${year}-${String(month).padStart(2,'0')}`;
}

function getMonthlySettings(name, month, year) {
    const key = getMonthKey(month, year);
    const all = JSON.parse(localStorage.getItem('monthlySettings') || '{}');
    return (all[key] && all[key][name]) || { additionalBonus: 0, advancePay: 0 };
}

function saveMonthlySettings(name, month, year, data) {
    const key = getMonthKey(month, year);
    const all = JSON.parse(localStorage.getItem('monthlySettings') || '{}');
    if (!all[key]) all[key] = {};
    all[key][name] = data;
    localStorage.setItem('monthlySettings', JSON.stringify(all));
}

function checkAdminSession() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        setupMonthSelector();
        loadAllFromSheets();
    }
}

function adminLogin() {
    const pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        setupMonthSelector();
        loadAllFromSheets();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

async function loadAllFromSheets() {
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?type=all`);
        const data = await res.json();

        // Sync to localStorage
        if (data.attendance) localStorage.setItem('attendance', JSON.stringify(data.attendance));
        if (data.settings) {
            employeeSettings = data.settings;
            localStorage.setItem('employeeSettings', JSON.stringify(data.settings));
        }
        if (data.monthlySettings) localStorage.setItem('monthlySettings', JSON.stringify(data.monthlySettings));
        if (data.employeeList && data.employeeList.length > 0) localStorage.setItem('employeeList', JSON.stringify(data.employeeList));
        if (data.holidays) localStorage.setItem('holidays', JSON.stringify(data.holidays));

    } catch (e) {
        console.log('Could not load from Sheets, using localStorage:', e);
    }

    renderEmployeeSettings();
    renderCalendar();
    loadAttendance();
}

function setupMonthSelector() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const now = new Date();

    MONTH_NAMES.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = m;
        if (i === now.getMonth()) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === now.getFullYear()) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

function renderCalendar() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    let workDays = 0;
    let html = `
        <div class="calendar-header">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span>
            <span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="calendar-grid">
    `;

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toLocaleDateString('en-GB');
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.includes(dateStr);
        const isToday = dateStr === new Date().toLocaleDateString('en-GB');

        let cls = 'cal-day';
        let label = '';

        if (isHoliday) { cls += ' holiday'; label = '<span class="cal-label">Holiday</span>'; }
        else if (isWeekend) { cls += ' weekend'; }
        else { cls += ' workday'; workDays++; }

        if (isToday) cls += ' today';

        html += `<div class="${cls}" onclick="toggleHoliday('${dateStr}', ${isWeekend})">
            <span class="cal-num">${d}</span>${label}
        </div>`;
    }

    html += `</div>
        <p class="workdays-count">Work days this month: <strong>${workDays}</strong></p>
        <p class="cal-hint">Click any weekday to mark/unmark as holiday</p>`;

    document.getElementById('calendarContainer').innerHTML = html;
}

function toggleHoliday(dateStr, isWeekend) {
    if (isWeekend) return;
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const idx = holidays.indexOf(dateStr);
    if (idx >= 0) holidays.splice(idx, 1);
    else holidays.push(dateStr);
    localStorage.setItem('holidays', JSON.stringify(holidays));

    // Sync to Google Sheets
    fetch(APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveHolidays', holidays })
    }).catch(() => {});

    renderCalendar();
    loadAttendance();
}

function renderEmployeeSettings() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const container = document.getElementById('employeeSettings');
    const employees = getEmployees();
    container.innerHTML = `
        <div class="add-employee-row">
            <input type="text" id="newEmployeeName" placeholder="New employee name">
            <button onclick="addEmployee()" class="add-emp-btn">+ Add Employee</button>
        </div>
    `;

    employees.forEach(name => {
        const s = employeeSettings[name] || { position: '', salary: 0, dailyBonus: 0, overtimeBonus: 0, shiftBonus: 0, paidLeave: 0 };
        const ms = getMonthlySettings(name, month, year);
        const key = name.replace(/ /g, '_').replace(/\./g, '');

        container.innerHTML += `
            <div class="employee-setting-card">
                <div class="emp-setting-header" onclick="toggleEmpSettings('${key}')">
                    <h4>${name}</h4>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="remove-emp-btn" onclick="event.stopPropagation(); removeEmployee('${name}')">✕ Remove</button>
                        <button class="hide-btn" id="emp_toggle_${key}">Hide ▲</button>
                    </div>
                </div>
                <div id="emp_settings_${key}">
                    <div class="settings-section-label">Section A — Permanent Settings</div>
                    <div class="setting-grid">
                        <div class="setting-row">
                            <label>Job Position</label>
                            <input type="text" id="pos_${key}" value="${s.position}" placeholder="e.g. Teller">
                        </div>
                        <div class="setting-row">
                            <label>Monthly Salary (Rp)</label>
                            <input type="number" id="sal_${key}" value="${s.salary}" placeholder="0">
                        </div>
                        <div class="setting-row">
                            <label>Daily Bonus (Rp)</label>
                            <input type="number" id="bon_${key}" value="${s.dailyBonus}" placeholder="0">
                        </div>
                        <div class="setting-row">
                            <label>Overtime/hour after 5PM (Rp)</label>
                            <input type="number" id="ot_${key}" value="${s.overtimeBonus}" placeholder="0">
                        </div>
                        <div class="setting-row">
                            <label>Shift Pay/day (Rp)</label>
                            <input type="number" id="sh_${key}" value="${s.shiftBonus}" placeholder="0">
                        </div>
                        <div class="setting-row">
                            <label>Paid Leave (days/month)</label>
                            <input type="number" id="pl_${key}" value="${s.paidLeave || 0}" placeholder="0">
                        </div>
                    </div>
                    <div class="settings-section-label monthly-label">Section B — Monthly Settings (${MONTH_NAMES[month]} ${year} only)</div>
                    <div class="setting-grid">
                        <div class="setting-row">
                            <label>Additional Bonus (Rp)</label>
                            <input type="number" id="add_${key}" value="${ms.additionalBonus}" placeholder="0">
                        </div>
                        <div class="setting-row">
                            <label>Advance Pay (Rp)</label>
                            <input type="number" id="adv_${key}" value="${ms.advancePay}" placeholder="0">
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function addEmployee() {
    const input = document.getElementById('newEmployeeName');
    const name = input.value.trim();
    if (!name) { alert('Please enter a name.'); return; }

    const employees = getEmployees();
    if (employees.includes(name)) { alert('Employee already exists.'); return; }

    employees.push(name);
    localStorage.setItem('employeeList', JSON.stringify(employees));
    syncEmployeeList(employees);
    input.value = '';
    renderEmployeeSettings();
    loadAttendance();
}

function removeEmployee(name) {
    if (!confirm(`Remove ${name} from the list? Their attendance records will not be deleted.`)) return;

    const employees = getEmployees().filter(e => e !== name);
    localStorage.setItem('employeeList', JSON.stringify(employees));
    syncEmployeeList(employees);
    renderEmployeeSettings();
    loadAttendance();
}

function syncEmployeeList(employees) {
    fetch(APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveEmployeeList', employees })
    }).catch(() => {});
}

function toggleEmpSettings(key) {
    const section = document.getElementById(`emp_settings_${key}`);
    const btn = document.getElementById(`emp_toggle_${key}`);
    if (section.style.display === 'none') {
        section.style.display = '';
        btn.textContent = 'Hide ▲';
    } else {
        section.style.display = 'none';
        btn.textContent = 'Show ▼';
    }
}

function saveEmployeeSettings() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);

    getEmployees().forEach(name => {
        const key = name.replace(/ /g, '_').replace(/\./g, '');
        
        const pos = document.getElementById(`pos_${key}`);
        const sal = document.getElementById(`sal_${key}`);
        const bon = document.getElementById(`bon_${key}`);
        const ot = document.getElementById(`ot_${key}`);
        const sh = document.getElementById(`sh_${key}`);
        const pl = document.getElementById(`pl_${key}`);
        const add = document.getElementById(`add_${key}`);
        const adv = document.getElementById(`adv_${key}`);

        // Skip if fields not rendered
        if (!sal) return;

        employeeSettings[name] = {
            position: pos ? pos.value : (employeeSettings[name]?.position || ''),
            salary: parseFloat(sal.value) || 0,
            dailyBonus: parseFloat(bon?.value) || 0,
            overtimeBonus: parseFloat(ot?.value) || 0,
            shiftBonus: parseFloat(sh?.value) || 0,
            paidLeave: parseFloat(pl?.value) || 0
        };

        if (add && adv) {
            saveMonthlySettings(name, month, year, {
                additionalBonus: parseFloat(add.value) || 0,
                advancePay: parseFloat(adv.value) || 0
            });
        }
    });

    localStorage.setItem('employeeSettings', JSON.stringify(employeeSettings));

    // Sync to Google Sheets
    fetch(APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveSettings', settings: employeeSettings })
    }).catch(() => {});

    fetch(APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveMonthlySettings', monthlySettings: JSON.parse(localStorage.getItem('monthlySettings') || '{}') })
    }).catch(() => {});

    alert('Settings saved!');
    loadAttendance();
}

function loadAttendance() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');

    const filtered = records.filter(r => {
        const parts = r.date.split('/');
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    renderSummary(filtered, month, year);
    renderEmployeeSettings();
}

function getWorkDaysInMonth(month, year) {
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const day = date.getDay();
        const dateStr = date.toLocaleDateString('en-GB');
        if (day !== 0 && day !== 6 && !holidays.includes(dateStr)) count++;
    }
    return count;
}

function renderSummary(records, month, year) {
    const container = document.getElementById('summaryTable');
    const workDays = getWorkDaysInMonth(month, year);
    let totalPayroll = 0;

    let html = `
        <p class="workdays-info">Expected work days this month: <strong>${workDays}</strong></p>
        <div class="table-scroll">
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Shifts</th>
                    <th>Salary</th>
                    <th>Bonuses</th>
                    <th>Deduction</th>
                    <th>Advance</th>
                    <th>Total Earning</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    getEmployees().forEach(name => {
        const s = employeeSettings[name] || { salary: 0, dailyBonus: 0, overtimeBonus: 0, shiftBonus: 0, paidLeave: 0 };
        const ms = getMonthlySettings(name, month, year);
        const empRecords = records.filter(r => r.name === name);
        const regularDays = empRecords.filter(r => !r.isShift).length;
        const shiftDays = empRecords.filter(r => r.isShift).length;
        const absent = Math.max(0, workDays - regularDays);

        // Paid leave deduction calculation
        const paidLeave = s.paidLeave || 0;
        const unpaidAbsent = Math.max(0, absent - paidLeave);
        const dailyRate = workDays > 0 ? s.salary / workDays : 0;
        const absenceDeduction = Math.round(unpaidAbsent * dailyRate);

        let totalOvertimeMinutes = 0;
        empRecords.forEach(r => { if (r.overtimeMinutes) totalOvertimeMinutes += r.overtimeMinutes; });

        const overtimeHours = totalOvertimeMinutes / 60;
        const overtimeBonus = Math.floor(overtimeHours * s.overtimeBonus);
        const dailyBonusTotal = regularDays * s.dailyBonus;
        const shiftBonusTotal = shiftDays * s.shiftBonus;
        const totalBonuses = dailyBonusTotal + overtimeBonus + shiftBonusTotal + ms.additionalBonus;
        const totalEarning = s.salary + totalBonuses - absenceDeduction;
        const remaining = totalEarning - ms.advancePay;
        totalPayroll += remaining;

        const fmt = n => n.toLocaleString('id-ID');

        html += `
            <tr>
                <td><strong>${name}</strong></td>
                <td class="present">${regularDays}</td>
                <td class="absent">${absent}</td>
                <td class="shift">${shiftDays}</td>
                <td>Rp ${fmt(s.salary)}</td>
                <td>Rp ${fmt(totalBonuses)}</td>
                <td class="deduction">${absenceDeduction > 0 ? '-Rp '+fmt(absenceDeduction) : '-'}</td>
                <td class="advance">-Rp ${fmt(ms.advancePay)}</td>
                <td><strong>Rp ${fmt(totalEarning)}</strong></td>
                <td><button class="detail-btn" onclick="openDetail('${name}')">View</button></td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="8"><strong>Total Payroll (after advance)</strong></td>
                    <td colspan="2"><strong>Rp ${totalPayroll.toLocaleString('id-ID')}</strong></td>
                </tr>
            </tfoot>
        </table>
        </div>
    `;

    container.innerHTML = html;
}

function openDetail(name) {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    window.location.href = `employee-detail.html?name=${encodeURIComponent(name)}&month=${month}&year=${year}`;
}

function exportCSV() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');

    const filtered = records.filter(r => {
        const parts = r.date.split('/');
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    let csv = 'Employee,Date,Check-In,Check-Out,Shift,Overtime (mins)\n';
    filtered.forEach(r => {
        csv += `${r.name},${r.date},${r.checkIn || ''},${r.checkOut || ''},${r.isShift ? 'Yes' : 'No'},${r.overtimeMinutes || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${MONTH_NAMES[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

const pinInput = document.getElementById('adminPin');
if (pinInput) {
    pinInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') adminLogin();
    });
}

checkAdminSession();
