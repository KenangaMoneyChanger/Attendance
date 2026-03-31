const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function init() {
    const params = new URLSearchParams(window.location.search);
    const name = decodeURIComponent(params.get('name') || '');
    const month = parseInt(params.get('month') ?? new Date().getMonth());
    const year = parseInt(params.get('year') ?? new Date().getFullYear());

    if (!name) { window.location.href = 'admin.html'; return; }

    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const employeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const s = employeeSettings[name] || {
        position: '-', salary: 0, dailyBonus: 0,
        overtimeBonus: 0, shiftBonus: 0, additionalBonus: 0, advancePay: 0
    };

    const filtered = records.filter(r => {
        const parts = r.date.split('/');
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return r.name === name && d.getMonth() === month && d.getFullYear() === year;
    });

    renderHeader(name, s, month, year);
    renderMonthlySummary(filtered, s, month, year, holidays);
    renderAttendanceLog(filtered);
}

function getWorkDaysInMonth(month, year, holidays) {
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

function renderMonthlySummary(records, s, month, year, holidays) {
    const workDays = getWorkDaysInMonth(month, year, holidays);
    const regularDays = records.filter(r => !r.isShift).length;
    const shiftDays = records.filter(r => r.isShift).length;
    const absent = workDays - regularDays;

    let totalOvertimeMinutes = 0;
    records.forEach(r => { if (r.overtimeMinutes) totalOvertimeMinutes += r.overtimeMinutes; });

    const overtimeHours = totalOvertimeMinutes / 60;
    const overtimeBonus = Math.floor(overtimeHours * s.overtimeBonus);
    const dailyBonusTotal = regularDays * s.dailyBonus;
    const shiftBonusTotal = shiftDays * s.shiftBonus;
    const totalBonuses = dailyBonusTotal + overtimeBonus + shiftBonusTotal + s.additionalBonus;
    const totalEarning = s.salary + totalBonuses;
    const remaining = totalEarning - s.advancePay;

    const fmt = n => n.toLocaleString('id-ID');

    document.getElementById('monthlySummaryDetail').innerHTML = `
        <div class="summary-cards">
            <div class="summary-card green">
                <span>Days Present</span>
                <strong>${regularDays}</strong>
            </div>
            <div class="summary-card red">
                <span>Days Absent</span>
                <strong>${absent < 0 ? 0 : absent}</strong>
            </div>
            <div class="summary-card orange">
                <span>Shift Days</span>
                <strong>${shiftDays}</strong>
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
                <tr><td>Daily Bonus (${regularDays} days × Rp ${fmt(s.dailyBonus)})</td><td>Rp ${fmt(dailyBonusTotal)}</td></tr>
                <tr><td>Shift Pay (${shiftDays} days × Rp ${fmt(s.shiftBonus)})</td><td>Rp ${fmt(shiftBonusTotal)}</td></tr>
                <tr><td>Overtime (${overtimeHours.toFixed(1)}h × Rp ${fmt(s.overtimeBonus)})</td><td>Rp ${fmt(overtimeBonus)}</td></tr>
                <tr><td>Additional Bonus</td><td>Rp ${fmt(s.additionalBonus)}</td></tr>
                <tr class="subtotal-row"><td><strong>Total Earning</strong></td><td><strong>Rp ${fmt(totalEarning)}</strong></td></tr>
                <tr class="advance-row"><td>Advance Pay</td><td>- Rp ${fmt(s.advancePay)}</td></tr>
                <tr class="total-row"><td><strong>Remaining Pay</strong></td><td><strong>Rp ${fmt(remaining)}</strong></td></tr>
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
        <h2 style="margin:30px 0 15px;color:#003366;border-bottom:2px solid #003366;padding-bottom:8px;">Attendance Log</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Type</th>
                    <th>Overtime</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(r => {
        const ot = r.overtimeMinutes ? `${Math.floor(r.overtimeMinutes/60)}h ${r.overtimeMinutes%60}m` : '-';
        const type = r.isShift ? '<span class="shift-tag">Shift</span>' : 'Regular';
        html += `
            <tr>
                <td>${r.date}</td>
                <td class="present">${r.checkIn || '-'}</td>
                <td>${r.checkOut || '<span style="color:#999">Not checked out</span>'}</td>
                <td>${type}</td>
                <td>${ot}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('attendanceLog').innerHTML = html;
}

init();
