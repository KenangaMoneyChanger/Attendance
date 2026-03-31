const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function getMonthKey(month, year) {
    return `${year}-${String(month).padStart(2,'0')}`;
}

function getMonthlySettings(name, month, year) {
    const key = getMonthKey(month, year);
    const all = JSON.parse(localStorage.getItem('monthlySettings') || '{}');
    return (all[key] && all[key][name]) || { additionalBonus: 0, advancePay: 0 };
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

function init() {
    const params = new URLSearchParams(window.location.search);
    const name = decodeURIComponent(params.get('name') || '');
    const month = parseInt(params.get('month') ?? new Date().getMonth());
    const year = parseInt(params.get('year') ?? new Date().getFullYear());

    if (!name) { window.location.href = 'admin.html'; return; }

    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const employeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const s = employeeSettings[name] || { position: '-', salary: 0, dailyBonus: 0, overtimeBonus: 0, shiftBonus: 0 };
    const ms = getMonthlySettings(name, month, year);

    const filtered = records.filter(r => {
        const parts = r.date.split('/');
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return r.name === name && d.getMonth() === month && d.getFullYear() === year;
    });

    renderHeader(name, s, month, year);
    renderMonthlySummary(filtered, s, ms, month, year, holidays);
    renderAttendanceCalendar(filtered, month, year, holidays);
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

function renderMonthlySummary(records, s, ms, month, year, holidays) {
    const workDays = getWorkDaysInMonth(month, year, holidays);
    const regularDays = records.filter(r => !r.isShift).length;
    const shiftDays = records.filter(r => r.isShift).length;
    const absent = Math.max(0, workDays - regularDays);

    const paidLeave = s.paidLeave || 0;
    const unpaidAbsent = Math.max(0, absent - paidLeave);
    const dailyRate = workDays > 0 ? s.salary / workDays : 0;
    const absenceDeduction = Math.round(unpaidAbsent * dailyRate);

    let totalOvertimeMinutes = 0;
    records.forEach(r => { if (r.overtimeMinutes) totalOvertimeMinutes += r.overtimeMinutes; });

    const overtimeHours = totalOvertimeMinutes / 60;
    const overtimeBonus = Math.floor(overtimeHours * s.overtimeBonus);
    const dailyBonusTotal = regularDays * s.dailyBonus;
    const shiftBonusTotal = shiftDays * s.shiftBonus;
    const totalBonuses = dailyBonusTotal + overtimeBonus + shiftBonusTotal + ms.additionalBonus;
    const totalEarning = s.salary + totalBonuses - absenceDeduction;
    const remaining = totalEarning - ms.advancePay;

    const fmt = n => n.toLocaleString('id-ID');

    document.getElementById('monthlySummaryDetail').innerHTML = `
        <div class="summary-cards">
            <div class="summary-card green">
                <span>Days Present</span>
                <strong>${regularDays}</strong>
                <small>of ${workDays} work days</small>
            </div>
            <div class="summary-card red">
                <span>Days Absent</span>
                <strong>${absent}</strong>
                <small>${paidLeave} paid leave allowed</small>
            </div>
            <div class="summary-card orange">
                <span>Shift Days</span>
                <strong>${shiftDays}</strong>
            </div>
            <div class="summary-card blue">
                <span>Overtime</span>
                <strong>${overtimeHours.toFixed(1)}h</strong>
            </div>
        </div>

        <table class="earnings-table">
            <thead>
                <tr><th colspan="2">Earnings Breakdown — ${MONTH_NAMES[month]} ${year}</th></tr>
            </thead>
            <tbody>
                <tr><td>Monthly Salary</td><td>Rp ${fmt(s.salary)}</td></tr>
                <tr><td>Daily Bonus (${regularDays} × Rp ${fmt(s.dailyBonus)})</td><td>Rp ${fmt(dailyBonusTotal)}</td></tr>
                <tr><td>Shift Pay (${shiftDays} × Rp ${fmt(s.shiftBonus)})</td><td>Rp ${fmt(shiftBonusTotal)}</td></tr>
                <tr><td>Overtime (${overtimeHours.toFixed(1)}h × Rp ${fmt(s.overtimeBonus)})</td><td>Rp ${fmt(overtimeBonus)}</td></tr>
                <tr><td>Additional Bonus</td><td>Rp ${fmt(ms.additionalBonus)}</td></tr>
                <tr class="deduction-row">
                    <td>Absence Deduction
                        <small style="display:block;color:#999;font-size:11px;">
                            ${absent} absent − ${paidLeave} paid leave = ${unpaidAbsent} unpaid × Rp ${fmt(Math.round(dailyRate))}/day
                        </small>
                    </td>
                    <td class="deduction">${absenceDeduction > 0 ? '- Rp '+fmt(absenceDeduction) : '-'}</td>
                </tr>
                <tr class="subtotal-row"><td><strong>Total Earning</strong></td><td><strong>Rp ${fmt(totalEarning)}</strong></td></tr>
                <tr class="advance-row"><td>Advance Pay</td><td>- Rp ${fmt(ms.advancePay)}</td></tr>
                <tr class="total-row"><td><strong>Remaining Pay</strong></td><td><strong>Rp ${fmt(remaining)}</strong></td></tr>
            </tbody>
        </table>
    `;
}

function renderAttendanceCalendar(records, month, year, holidays) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    // Build lookup by date
    const recordMap = {};
    records.forEach(r => { recordMap[r.date] = r; });

    let html = `
        <h2 class="detail-section-title">Attendance Calendar — ${MONTH_NAMES[month]} ${year}</h2>
        <div class="cal-legend">
            <span class="legend-item present-legend">Present</span>
            <span class="legend-item absent-legend">Absent</span>
            <span class="legend-item shift-legend">Shift</span>
            <span class="legend-item holiday-legend">Holiday</span>
            <span class="legend-item weekend-legend">Weekend</span>
        </div>
        <div class="calendar-header">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span>
            <span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="calendar-grid detail-cal">
    `;

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toLocaleDateString('en-GB');
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.includes(dateStr);
        const record = recordMap[dateStr];
        const isToday = dateStr === new Date().toLocaleDateString('en-GB');

        let cls = 'cal-day';
        let timeInfo = '';

        if (isWeekend) {
            cls += ' weekend';
        } else if (isHoliday) {
            cls += record ? ' shift' : ' holiday';
            if (record) timeInfo = `<span class="cal-time">${record.checkIn || ''}${record.checkOut ? '→'+record.checkOut : ''}</span>`;
        } else if (record) {
            cls += record.isShift ? ' shift' : ' present';
            timeInfo = `<span class="cal-time">${record.checkIn || ''}${record.checkOut ? '<br>→'+record.checkOut : ''}</span>`;
        } else {
            // Past workday with no record = absent
            const isPast = date <= new Date();
            cls += isPast ? ' absent' : ' workday';
        }

        if (isToday) cls += ' today';

        html += `<div class="${cls}" title="${dateStr}">
            <span class="cal-num">${d}</span>
            ${timeInfo}
        </div>`;
    }

    html += `</div>`;
    document.getElementById('attendanceCalendar').innerHTML = html;
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
        <h2 class="detail-section-title">Attendance Log</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Type</th>
                    <th>Overtime</th>
                </tr>
            </thead>
            <tbody>
    `;

    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    sorted.forEach(r => {
        const parts = r.date.split('/');
        const date = new Date(parts[2], parts[1]-1, parts[0]);
        const dayName = DAY_NAMES[date.getDay()];
        const ot = r.overtimeMinutes ? `${Math.floor(r.overtimeMinutes/60)}h ${r.overtimeMinutes%60}m` : '-';
        const type = r.isShift ? '<span class="shift-tag">Shift</span>' : 'Regular';

        html += `
            <tr>
                <td>${r.date}</td>
                <td>${dayName}</td>
                <td class="present">${r.checkIn || '-'}</td>
                <td>${r.checkOut || '<span style="color:#999">—</span>'}</td>
                <td>${type}</td>
                <td>${ot}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('attendanceLog').innerHTML = html;
}

init();
