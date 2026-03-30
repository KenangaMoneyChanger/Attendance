const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function init() {
    const params = new URLSearchParams(window.location.search);
    const name = decodeURIComponent(params.get('name') || '');
    const month = parseInt(params.get('month') || new Date().getMonth());
    const year = parseInt(params.get('year') || new Date().getFullYear());

    if (!name) {
        window.location.href = 'admin.html';
        return;
    }

    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const employeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');
    const s = employeeSettings[name] || { position: '-', salary: 0, dailyBonus: 0, overtimeBonus: 0 };

    const filtered = records.filter(r => {
        const parts = r.date.split('/');
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return r.name === name && d.getMonth() === month && d.getFullYear() === year;
    });

    renderHeader(name, s, month, year);
    renderMonthlySummary(filtered, s, month, year);
    renderAttendanceLog(filtered);
}

function renderHeader(name, s, month, year) {
    document.getElementById('employeeHeader').innerHTML = `
        <div class="employee-profile">
            <div class="employee-avatar">${name.charAt(0)}</div>
            <div class="employee-info">
                <h2>${name}</h2>
                <p class="position">${s.position || 'No Position Set'}</p>
                <p class="period">${MONTH_NAMES[month]} ${year}</p>
            </div>
        </div>
        <div class="salary-card">
            <span>Monthly Salary</span>
            <strong>Rp ${s.salary.toLocaleString('id-ID')}</strong>
        </div>
    `;
}

function renderMonthlySummary(records, s, month, year) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = records.length;
    const absent = daysInMonth - days;

    let totalOvertimeMinutes = 0;
    records.forEach(r => {
        if (r.overtimeMinutes) totalOvertimeMinutes += r.overtimeMinutes;
    });

    const overtimeHours = totalOvertimeMinutes / 60;
    const overtimeBonus = Math.floor(overtimeHours * s.overtimeBonus);
    const dailyBonusTotal = days * s.dailyBonus;
    const totalBonus = dailyBonusTotal + overtimeBonus;
    const totalEarning = s.salary + totalBonus;

    const fmt = n => n.toLocaleString('id-ID');

    document.getElementById('monthlySummaryDetail').innerHTML = `
        <div class="summary-cards">
            <div class="summary-card green">
                <span>Days Present</span>
                <strong>${days}</strong>
            </div>
            <div class="summary-card red">
                <span>Days Absent</span>
                <strong>${absent}</strong>
            </div>
            <div class="summary-card blue">
                <span>Overtime Hours</span>
                <strong>${overtimeHours.toFixed(1)}h</strong>
            </div>
        </div>

        <table class="earnings-table">
            <thead>
                <tr><th colspan="2">Monthly Earnings Breakdown</th></tr>
            </thead>
            <tbody>
                <tr><td>Monthly Salary</td><td>Rp ${fmt(s.salary)}</td></tr>
                <tr><td>Daily Bonus (${days} days × Rp ${fmt(s.dailyBonus)})</td><td>Rp ${fmt(dailyBonusTotal)}</td></tr>
                <tr><td>Overtime Bonus (${overtimeHours.toFixed(1)}h × Rp ${fmt(s.overtimeBonus)})</td><td>Rp ${fmt(overtimeBonus)}</td></tr>
                <tr class="total-row"><td><strong>Total Earning</strong></td><td><strong>Rp ${fmt(totalEarning)}</strong></td></tr>
            </tbody>
        </table>
    `;
}

function renderAttendanceLog(records) {
    if (records.length === 0) {
        document.getElementById('attendanceLog').innerHTML = '<p class="no-data">No attendance records this month.</p>';
        return;
    }

    const sorted = [...records].sort((a, b) => {
        const pa = a.date.split('/');
        const pb = b.date.split('/');
        return new Date(pa[2], pa[1]-1, pa[0]) - new Date(pb[2], pb[1]-1, pb[0]);
    });

    let html = `
        <h2 style="margin: 30px 0 15px; color: #003366; border-bottom: 2px solid #003366; padding-bottom: 8px;">Attendance Log</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Overtime</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(r => {
        const ot = r.overtimeMinutes ? `${Math.floor(r.overtimeMinutes/60)}h ${r.overtimeMinutes%60}m` : '-';
        html += `
            <tr>
                <td>${r.date}</td>
                <td class="present">${r.checkIn || '-'}</td>
                <td>${r.checkOut || '<span style="color:#999">Not checked out</span>'}</td>
                <td>${ot}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('attendanceLog').innerHTML = html;
}

init();
