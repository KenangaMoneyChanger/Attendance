const ADMIN_PIN = '1234'; // Change this

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const EMPLOYEES = [
    'Anas Amrulloh',
    'Dinda Ayu Putri',
    'Evi Nurmala Dewi',
    'Farid Kurniadi',
    'Rendy Revaldy',
    'Christian Winata',
    'Ikhwan Syafii',
    'Lia Rahmah',
    'Faisal',
    'Riyanto',
    'Annisa Novitasari',
    'Fatur Rohman',
    'Ananda Aditya Gunawan',
    'M. Rizal Fahreji'
];

let employeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');

// Keep admin logged in using sessionStorage
function checkAdminSession() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        setupMonthSelector();
        renderEmployeeSettings();
        renderCalendar();
        loadAttendance();
    }
}

function adminLogin() {
    const pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        setupMonthSelector();
        renderEmployeeSettings();
        renderCalendar();
        loadAttendance();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
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

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="cal-day empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toLocaleDateString('en-GB');
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.includes(dateStr);
        const isToday = dateStr === new Date().toLocaleDateString('en-GB');

        let cls = 'cal-day';
        let label = '';

        if (isHoliday) {
            cls += ' holiday';
            label = '<span class="cal-label">Holiday</span>';
        } else if (isWeekend) {
            cls += ' weekend';
        } else {
            cls += ' workday';
            workDays++;
        }

        if (isToday) cls += ' today';

        html += `
            <div class="${cls}" onclick="toggleHoliday('${dateStr}', ${isWeekend})">
                <span class="cal-num">${d}</span>
                ${label}
            </div>
        `;
    }

    html += `</div>`;
    html += `<p class="workdays-count">Work days this month: <strong>${workDays}</strong></p>`;
    html += `<p class="cal-hint">Click any weekday to mark/unmark as holiday</p>`;

    document.getElementById('calendarContainer').innerHTML = html;
}

function toggleHoliday(dateStr, isWeekend) {
    if (isWeekend) return; // Can't toggle weekends
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const idx = holidays.indexOf(dateStr);
    if (idx >= 0) {
        holidays.splice(idx, 1);
    } else {
        holidays.push(dateStr);
    }
    localStorage.setItem('holidays', JSON.stringify(holidays));
    renderCalendar();
    loadAttendance();
}

function renderEmployeeSettings() {
    const container = document.getElementById('employeeSettings');
    container.innerHTML = '';

    EMPLOYEES.forEach(name => {
        const s = employeeSettings[name] || {
            position: '', salary: 0, dailyBonus: 0,
            overtimeBonus: 0, shiftBonus: 0, additionalBonus: 0, advancePay: 0
        };
        const key = name.replace(/ /g, '_').replace(/\./g, '');
        container.innerHTML += `
            <div class="employee-setting-card">
                <div class="emp-setting-header" onclick="toggleEmpSettings('${key}')">
                    <h4>${name}</h4>
                    <button class="hide-btn" id="emp_toggle_${key}">Hide ▲</button>
                </div>
                <div id="emp_settings_${key}" class="setting-grid">
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
                        <label>Additional Bonus (Rp)</label>
                        <input type="number" id="add_${key}" value="${s.additionalBonus}" placeholder="0">
                    </div>
                    <div class="setting-row">
                        <label>Advance Pay (Rp)</label>
                        <input type="number" id="adv_${key}" value="${s.advancePay}" placeholder="0">
                    </div>
                </div>
            </div>
        `;
    });
}

function toggleEmpSettings(key) {
    const section = document.getElementById(`emp_settings_${key}`);
    const btn = document.getElementById(`emp_toggle_${key}`);
    if (section.style.display === 'none') {
        section.style.display = 'grid';
        btn.textContent = 'Hide ▲';
    } else {
        section.style.display = 'none';
        btn.textContent = 'Show ▼';
    }
}

function saveEmployeeSettings() {
    EMPLOYEES.forEach(name => {
        const key = name.replace(/ /g, '_').replace(/\./g, '');
        employeeSettings[name] = {
            position: document.getElementById(`pos_${key}`).value,
            salary: parseFloat(document.getElementById(`sal_${key}`).value) || 0,
            dailyBonus: parseFloat(document.getElementById(`bon_${key}`).value) || 0,
            overtimeBonus: parseFloat(document.getElementById(`ot_${key}`).value) || 0,
            shiftBonus: parseFloat(document.getElementById(`sh_${key}`).value) || 0,
            additionalBonus: parseFloat(document.getElementById(`add_${key}`).value) || 0,
            advancePay: parseFloat(document.getElementById(`adv_${key}`).value) || 0
        };
    });
    localStorage.setItem('employeeSettings', JSON.stringify(employeeSettings));
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
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Shifts</th>
                    <th>Salary</th>
                    <th>Bonuses</th>
                    <th>Advance</th>
                    <th>Total Earning</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
    `;

    EMPLOYEES.forEach(name => {
        const s = employeeSettings[name] || {
            position: '-', salary: 0, dailyBonus: 0,
            overtimeBonus: 0, shiftBonus: 0, additionalBonus: 0, advancePay: 0
        };
        const empRecords = records.filter(r => r.name === name);
        const regularDays = empRecords.filter(r => !r.isShift).length;
        const shiftDays = empRecords.filter(r => r.isShift).length;
        const absent = workDays - regularDays;

        let totalOvertimeMinutes = 0;
        empRecords.forEach(r => { if (r.overtimeMinutes) totalOvertimeMinutes += r.overtimeMinutes; });

        const overtimeHours = totalOvertimeMinutes / 60;
        const overtimeBonus = Math.floor(overtimeHours * s.overtimeBonus);
        const dailyBonusTotal = regularDays * s.dailyBonus;
        const shiftBonusTotal = shiftDays * s.shiftBonus;
        const totalBonuses = dailyBonusTotal + overtimeBonus + shiftBonusTotal + s.additionalBonus;
        const totalEarning = s.salary + totalBonuses;
        const remaining = totalEarning - s.advancePay;
        totalPayroll += remaining;

        const fmt = n => n.toLocaleString('id-ID');

        html += `
            <tr>
                <td><strong>${name}</strong></td>
                <td class="present">${regularDays}</td>
                <td class="absent">${absent < 0 ? 0 : absent}</td>
                <td class="shift">${shiftDays}</td>
                <td>Rp ${fmt(s.salary)}</td>
                <td>Rp ${fmt(totalBonuses)}</td>
                <td class="advance">-Rp ${fmt(s.advancePay)}</td>
                <td><strong>Rp ${fmt(totalEarning)}</strong></td>
                <td><button class="detail-btn" onclick="openDetail('${name}')">View</button></td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="7"><strong>Total Payroll (after advance)</strong></td>
                    <td colspan="2"><strong>Rp ${totalPayroll.toLocaleString('id-ID')}</strong></td>
                </tr>
            </tfoot>
        </table>
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

document.getElementById('adminPin').addEventListener('keypress', e => {
    if (e.key === 'Enter') adminLogin();
});

// Check session on load
checkAdminSession();
