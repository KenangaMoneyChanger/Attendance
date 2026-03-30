const ADMIN_PIN = '1234'; // Change this to your PIN

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

let bonusSettings = JSON.parse(localStorage.getItem('bonusSettings') || '{}');

function adminLogin() {
    const pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
        document.getElementById('loginBox').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        setupMonthSelector();
        renderBonusSettings();
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

function renderBonusSettings() {
    const container = document.getElementById('bonusSettings');
    container.innerHTML = '';

    EMPLOYEES.forEach(name => {
        const bonus = bonusSettings[name] || 0;
        container.innerHTML += `
            <div class="bonus-row">
                <span>${name}</span>
                <input type="number" id="bonus_${name.replace(/ /g,'_')}" 
                       value="${bonus}" placeholder="Daily bonus (Rp)">
            </div>
        `;
    });
}

function saveBonusSettings() {
    EMPLOYEES.forEach(name => {
        const input = document.getElementById(`bonus_${name.replace(/ /g,'_')}`);
        if (input) {
            bonusSettings[name] = parseFloat(input.value) || 0;
        }
    });
    localStorage.setItem('bonusSettings', JSON.stringify(bonusSettings));
    alert('Bonus settings saved!');
    loadAttendance();
}

function loadAttendance() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');

    // Filter by selected month/year
    const filtered = records.filter(r => {
        const parts = r.date.split('/');
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    renderSummary(filtered, month, year);
    renderRecords(filtered);
}

function renderSummary(records, month, year) {
    const container = document.getElementById('summaryTable');

    // Count days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Days Present</th>
                    <th>Days Absent</th>
                    <th>Daily Bonus</th>
                    <th>Total Bonus</th>
                </tr>
            </thead>
            <tbody>
    `;

    EMPLOYEES.forEach(name => {
        const days = records.filter(r => r.name === name).length;
        const absent = daysInMonth - days;
        const dailyBonus = bonusSettings[name] || 0;
        const totalBonus = days * dailyBonus;

        const formattedBonus = totalBonus.toLocaleString('id-ID');
        const formattedDaily = dailyBonus.toLocaleString('id-ID');

        html += `
            <tr>
                <td>${name}</td>
                <td class="present">${days}</td>
                <td class="absent">${absent}</td>
                <td>Rp ${formattedDaily}</td>
                <td><strong>Rp ${formattedBonus}</strong></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderRecords(records) {
    const container = document.getElementById('recordsTable');

    if (records.length === 0) {
        container.innerHTML = '<p class="no-data">No records for this month.</p>';
        return;
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check-In Time</th>
                </tr>
            </thead>
            <tbody>
    `;

    records.forEach(r => {
        html += `
            <tr>
                <td>${r.name}</td>
                <td>${r.date}</td>
                <td>${r.time}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
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

    let csv = 'Employee,Date,Check-In Time\n';
    filtered.forEach(r => {
        csv += `${r.name},${r.date},${r.time}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${MONTH_NAMES[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Allow pressing Enter on PIN input
document.getElementById('adminPin').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') adminLogin();
});
