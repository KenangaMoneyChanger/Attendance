const ADMIN_PIN = '1234'; // Change this

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

let employeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');

function adminLogin() {
    const pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        setupMonthSelector();
        renderEmployeeSettings();
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

function renderEmployeeSettings() {
    const container = document.getElementById('employeeSettings');
    container.innerHTML = '';

    EMPLOYEES.forEach(name => {
        const s = employeeSettings[name] || { position: '', salary: 0, dailyBonus: 0, overtimeBonus: 0 };
        const key = name.replace(/ /g, '_');
        container.innerHTML += `
            <div class="employee-setting-card">
                <h4>${name}</h4>
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
                </div>
            </div>
        `;
    });
}

function saveEmployeeSettings() {
    EMPLOYEES.forEach(name => {
        const key = name.replace(/ /g, '_');
        employeeSettings[name] = {
            position: document.getElementById(`pos_${key}`).value,
            salary: parseFloat(document.getElementById(`sal_${key}`).value) || 0,
            dailyBonus: parseFloat(document.getElementById(`bon_${key}`).value) || 0,
            overtimeBonus: parseFloat(document.getElementById(`ot_${key}`).value) || 0
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

function renderSummary(records, month, year) {
    const container = document.getElementById('summaryTable');
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let totalSalaries = 0;

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Position</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Daily Bonus</th>
                    <th>Overtime Bonus</th>
                    <th>Monthly Salary</th>
                    <th>Total Earning</th>
                    <th>Detail</th>
                </tr>
            </thead>
            <tbody>
    `;

    EMPLOYEES.forEach(name => {
        const s = employeeSettings[name] || { position: '-', salary: 0, dailyBonus: 0, overtimeBonus: 0 };
        const empRecords = records.filter(r => r.name === name);
        const days = empRecords.length;
        const absent = daysInMonth - days;

        // Calculate overtime bonus
        let totalOvertimeMinutes = 0;
        empRecords.forEach(r => {
            if (r.overtimeMinutes) totalOvertimeMinutes += r.overtimeMinutes;
        });
        const overtimeHours = totalOvertimeMinutes / 60;
        const overtimeBonus = Math.floor(overtimeHours * s.overtimeBonus);
        const dailyBonusTotal = days * s.dailyBonus;
        const totalEarning = s.salary + dailyBonusTotal + overtimeBonus;
        totalSalaries += totalEarning;

        const fmt = n => n.toLocaleString('id-ID');

        html += `
            <tr>
                <td><strong>${name}</strong></td>
                <td>${s.position || '-'}</td>
                <td class="present">${days}</td>
                <td class="absent">${absent}</td>
                <td>Rp ${fmt(dailyBonusTotal)}</td>
                <td>Rp ${fmt(overtimeBonus)}</td>
                <td>Rp ${fmt(s.salary)}</td>
                <td><strong>Rp ${fmt(totalEarning)}</strong></td>
                <td><button class="detail-btn" onclick="openDetail('${name}')">View</button></td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="7"><strong>Total Monthly Payroll</strong></td>
                    <td colspan="2"><strong>Rp ${totalSalaries.toLocaleString('id-ID')}</strong></td>
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

    let csv = 'Employee,Date,Check-In,Check-Out,Overtime (mins)\n';
    filtered.forEach(r => {
        csv += `${r.name},${r.date},${r.checkIn || ''},${r.checkOut || ''},${r.overtimeMinutes || 0}\n`;
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
