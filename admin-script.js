const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAukepNrTr6OASGO-Jt0_LmWhr5lOzRqKK1mHuiY4cASMIGQRsz0YAQz98hYGHUFGv/exec';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function getEmployees() {
    const stored = localStorage.getItem('employeeList');
    if (stored) return JSON.parse(stored);
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

function getMonthKey(month, year) {
    return `${year}-${String(month).padStart(2,'0')}`;
}

function getMonthlySettings(name, month, year) {
    const key = getMonthKey(month, year);
    const all = JSON.parse(localStorage.getItem('monthlySettings') || '{}');
    return (all[key] && all[key][name]) || { additionalBonus: 0, advancePay: 0 };
}

function saveMonthlySettingsLocal(name, month, year, data) {
    const key = getMonthKey(month, year);
    const all = JSON.parse(localStorage.getItem('monthlySettings') || '{}');
    if (!all[key]) all[key] = {};
    all[key][name] = data;
    localStorage.setItem('monthlySettings', JSON.stringify(all));
}

function showAdminPanel() {
    setupMonthSelector();
    autoCheckoutMissed();
    renderEmployeeSettings();
    renderCalendar();
    loadAttendance();
    syncFromSheets();
}

function autoCheckoutMissed() {
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const today = new Date().toLocaleDateString('en-GB');
    let changed = false;

    records.forEach(r => {
        if (r.checkIn && !r.checkOut && r.date !== today) {
            r.checkOut = '23:59';
            const s = employeeSettings[r.name] || {};
            const overtimeHour = s.overtimeHour || 17;
            const [h, m] = '23:59'.split(':').map(Number);
            r.overtimeMinutes = h >= overtimeHour ? Math.min((h - overtimeHour) * 60 + m, 180) : 0;
            changed = true;

            syncPost({ action: 'checkout', name: r.name, date: r.date, time: '23:59', timestamp: r.timestamp, overtimeMinutes: r.overtimeMinutes });
        }
    });

    if (changed) localStorage.setItem('attendance', JSON.stringify(records));
}

function syncPost(data) {
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
    }).catch(() => {});
}

function forceSyncFromSheets() {
    sessionStorage.removeItem('synced');
    syncFromSheets();
    alert('Syncing from Google Sheets...');
}

function syncFromSheets() {
    // Only sync once per session to avoid overwriting local changes
    if (sessionStorage.getItem('synced')) return;
    sessionStorage.setItem('synced', 'true');

    fetch(`${APPS_SCRIPT_URL}?type=all`)
        .then(r => r.json())
        .then(data => {
            if (data.attendance) localStorage.setItem('attendance', JSON.stringify(data.attendance));
            if (data.settings && Object.keys(data.settings).length > 0) {
                employeeSettings = data.settings;
                localStorage.setItem('employeeSettings', JSON.stringify(data.settings));
            }
            if (data.monthlySettings) localStorage.setItem('monthlySettings', JSON.stringify(data.monthlySettings));
            if (data.employeeList && data.employeeList.length > 0) localStorage.setItem('employeeList', JSON.stringify(data.employeeList));
            if (data.holidays && data.holidays.length > 0) localStorage.setItem('holidays', JSON.stringify(data.holidays));
            renderCalendar();
            loadAttendance();
            renderEmployeeSettings();
        })
        .catch(e => console.log('Sheets sync failed:', e));
}

function setupMonthSelector() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    if (!monthSelect || !yearSelect || monthSelect.options.length > 0) return;
    const now = new Date();

    MONTH_NAMES.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = m;
        if (i === now.getMonth()) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    for (let y = 2040; y >= now.getFullYear() - 2; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === now.getFullYear()) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

function renderCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
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
        <p class="cal-hint">Click any weekday to mark/unmark as holiday</p>
        <button class="save-btn" onclick="saveHolidaysToSheets()" style="margin-top:10px;">Save Holidays</button>`;

    calendarContainer.innerHTML = html;
}

function saveHolidaysToSheets() {
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    syncPost({ action: 'saveHolidays', holidays });
    alert('Holidays saved!');
}

function toggleHoliday(dateStr, isWeekend) {
    if (isWeekend) return;
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const idx = holidays.indexOf(dateStr);
    if (idx >= 0) holidays.splice(idx, 1);
    else holidays.push(dateStr);
    localStorage.setItem('holidays', JSON.stringify(holidays));
    syncPost({ action: 'saveHolidays', holidays });
    renderCalendar();
    loadAttendance();
}

function renderEmployeeSettings() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const container = document.getElementById('employeeSettings');
    if (!container) return;
    const employees = getEmployees();

    container.innerHTML = `
        <div class="add-employee-row">
            <input type="text" id="newEmployeeName" placeholder="New employee name">
            <button onclick="addEmployee()" class="add-emp-btn">+ Add Employee</button>
        </div>
    `;

    employees.forEach(name => {
        const s = employeeSettings[name] || { position: '', salary: 0, dailyBonus: 0, overtimeBonus: 0, overtimeHour: 17, shiftBonus: 0, paidLeave: 0 };
        const ms = getMonthlySettings(name, month, year);
        const key = name.replace(/ /g, '_').replace(/\./g, '');
        const fmt = n => (n || 0).toLocaleString('id-ID');

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
                    <div id="view_${key}">
                        <div class="settings-section-label">Section A — Permanent Settings</div>
                        <div class="readonly-grid">
                            <div class="readonly-row"><span>Position</span><strong>${s.position || '-'}</strong></div>
                            <div class="readonly-row"><span>Monthly Salary</span><strong>Rp ${fmt(s.salary)}</strong></div>
                            <div class="readonly-row"><span>Daily Bonus</span><strong>Rp ${fmt(s.dailyBonus)}</strong></div>
                            <div class="readonly-row"><span>Overtime starts at</span><strong>${s.overtimeHour || 17}:00</strong></div>
                            <div class="readonly-row"><span>Overtime/hour</span><strong>Rp ${fmt(s.overtimeBonus)}</strong></div>
                            <div class="readonly-row"><span>Shift Pay/day</span><strong>Rp ${fmt(s.shiftBonus)}</strong></div>
                            <div class="readonly-row"><span>Paid Leave</span><strong>${s.paidLeave || 0} days</strong></div>
                        </div>
                        <div class="settings-section-label monthly-label">Section B — ${MONTH_NAMES[month]} ${year}</div>
                        <div class="readonly-grid">
                            <div class="readonly-row"><span>Additional Bonus</span><strong>Rp ${fmt(ms.additionalBonus)}</strong></div>
                            <div class="readonly-row"><span>Advance Pay</span><strong>Rp ${fmt(ms.advancePay)}</strong></div>
                        </div>
                        <button class="edit-emp-btn" onclick="enableEdit('${key}', '${name}')">Edit</button>
                    </div>
                    <div id="edit_${key}" style="display:none;">
                        <div class="settings-section-label">Section A — Permanent Settings</div>
                        <div class="setting-grid">
                            <div class="setting-row"><label>Job Position</label><input type="text" id="pos_${key}" value="${s.position}" placeholder="e.g. Teller"></div>
                            <div class="setting-row"><label>Monthly Salary (Rp)</label><input type="number" id="sal_${key}" value="${s.salary}"></div>
                            <div class="setting-row"><label>Daily Bonus (Rp)</label><input type="number" id="bon_${key}" value="${s.dailyBonus}"></div>
                            <div class="setting-row"><label>Overtime starts at (24h)</label><input type="number" id="oth_${key}" value="${s.overtimeHour || 17}" min="0" max="23"></div>
                            <div class="setting-row"><label>Overtime/hour (Rp)</label><input type="number" id="ot_${key}" value="${s.overtimeBonus}"></div>
                            <div class="setting-row"><label>Shift Pay/day (Rp)</label><input type="number" id="sh_${key}" value="${s.shiftBonus}"></div>
                            <div class="setting-row"><label>Paid Leave (days/month)</label><input type="number" id="pl_${key}" value="${s.paidLeave || 0}"></div>
                        </div>
                        <div class="settings-section-label monthly-label">Section B — ${MONTH_NAMES[month]} ${year}</div>
                        <div class="setting-grid">
                            <div class="setting-row"><label>Additional Bonus (Rp)</label><input type="number" id="add_${key}" value="${ms.additionalBonus}"></div>
                            <div class="setting-row"><label>Advance Pay (Rp)</label><input type="number" id="adv_${key}" value="${ms.advancePay}"></div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:10px;">
                            <button class="save-btn" onclick="saveOneEmployee('${name}', '${key}')">Save</button>
                            <button class="cancel-btn" onclick="cancelEdit('${key}')">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function enableEdit(key, name) {
    document.getElementById(`view_${key}`).style.display = 'none';
    document.getElementById(`edit_${key}`).style.display = '';
}

function cancelEdit(key) {
    document.getElementById(`view_${key}`).style.display = '';
    document.getElementById(`edit_${key}`).style.display = 'none';
}

function saveOneEmployee(name, key) {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const sal = document.getElementById(`sal_${key}`);
    if (!sal) return;

    employeeSettings[name] = {
        position: document.getElementById(`pos_${key}`)?.value || '',
        salary: parseFloat(sal.value) || 0,
        dailyBonus: parseFloat(document.getElementById(`bon_${key}`)?.value) || 0,
        overtimeBonus: parseFloat(document.getElementById(`ot_${key}`)?.value) || 0,
        overtimeHour: parseFloat(document.getElementById(`oth_${key}`)?.value) || 17,
        shiftBonus: parseFloat(document.getElementById(`sh_${key}`)?.value) || 0,
        paidLeave: parseFloat(document.getElementById(`pl_${key}`)?.value) || 0
    };

    saveMonthlySettingsLocal(name, month, year, {
        additionalBonus: parseFloat(document.getElementById(`add_${key}`)?.value) || 0,
        advancePay: parseFloat(document.getElementById(`adv_${key}`)?.value) || 0
    });

    localStorage.setItem('employeeSettings', JSON.stringify(employeeSettings));
    syncPost({ action: 'saveSettings', settings: employeeSettings });
    syncPost({ action: 'saveMonthlySettings', monthlySettings: JSON.parse(localStorage.getItem('monthlySettings') || '{}') });

    renderEmployeeSettings();
    loadAttendance();
}

function toggleEmpSettings(key) {
    const section = document.getElementById(`emp_settings_${key}`);
    const btn = document.getElementById(`emp_toggle_${key}`);
    if (!section) return;
    if (section.style.display === 'none') {
        section.style.display = '';
        btn.textContent = 'Hide ▲';
    } else {
        section.style.display = 'none';
        btn.textContent = 'Show ▼';
    }
}

function addEmployee() {
    const input = document.getElementById('newEmployeeName');
    const name = input.value.trim();
    if (!name) { alert('Please enter a name.'); return; }
    const employees = getEmployees();
    if (employees.includes(name)) { alert('Employee already exists.'); return; }
    employees.push(name);
    localStorage.setItem('employeeList', JSON.stringify(employees));
    syncPost({ action: 'saveEmployeeList', employees });
    input.value = '';
    renderEmployeeSettings();
    loadAttendance();
}

function removeEmployee(name) {
    if (!confirm(`Remove ${name}? Their attendance records will not be deleted.`)) return;
    const employees = getEmployees().filter(e => e !== name);
    localStorage.setItem('employeeList', JSON.stringify(employees));
    syncPost({ action: 'saveEmployeeList', employees });
    renderEmployeeSettings();
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
    if (!container) return;
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

showAdminPanel();
