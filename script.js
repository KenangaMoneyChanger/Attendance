// Configuration
const OFFICE_LAT = -6.250314346990451;
const OFFICE_LNG = 106.79765647791027;
const OFFICE_RADIUS_METERS = 50;

// Second office location
const OFFICE2_LAT = -6.255452955485608;
const OFFICE2_LNG = 106.78948229009873;
const OFFICE2_RADIUS_METERS = 50;
const OVERTIME_HOUR = 17; // 5PM

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
    'M. Rizal Fahreji',
    'Agus'
];

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAukepNrTr6OASGO-Jt0_LmWhr5lOzRqKK1mHuiY4cASMIGQRsz0YAQz98hYGHUFGv/exec';

let userLocation = null;
let locationAllowed = false;
let dailyCode = null;

// Generate a NEW random 4-digit code every page load
function generateDailyCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function getDistanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function init() {
    if (!document.getElementById('locationStatus')) return;
    // Ensure default employee list exists in localStorage
    if (!localStorage.getItem('employeeList')) {
        const defaults = [
            'Anas Amrulloh','Dinda Ayu Putri','Evi Nurmala Dewi','Farid Kurniadi',
            'Rendy Revaldy','Christian Winata','Ikhwan Syafii','Lia Rahmah',
            'Faisal','Riyanto','Annisa Novitasari','Fatur Rohman',
            'Ananda Aditya Gunawan','M. Rizal Fahreji','Agus'
        ];
        localStorage.setItem('employeeList', JSON.stringify(defaults));
    }
    // Load employee list from Sheets first, then check location
    loadEmployeeListFromSheets().then(() => checkLocation());
}

async function loadEmployeeListFromSheets() {
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?type=employeeList`);
        const data = await res.json();
        if (data && data.length > 0) {
            localStorage.setItem('employeeList', JSON.stringify(data));
        }
        // If Sheets returns empty, keep whatever is in localStorage (set by default in getEmployees)
    } catch (e) {
        console.log('Could not load employee list from Sheets, using local:', e);
    }
}

function checkLocation() {
    const locationStatus = document.getElementById('locationStatus');

    if (!navigator.geolocation) {
        locationStatus.innerHTML = '✗ GPS not supported on this device';
        locationStatus.className = 'info-box error-box';
        showBlocked('GPS not supported on this device.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = position.coords;
            const distance1 = getDistanceMeters(
                userLocation.latitude, userLocation.longitude,
                OFFICE_LAT, OFFICE_LNG
            );
            const distance2 = getDistanceMeters(
                userLocation.latitude, userLocation.longitude,
                OFFICE2_LAT, OFFICE2_LNG
            );
            const distance = Math.min(distance1, distance2);
            const nearestOffice = distance1 < distance2 ? 'Office 1' : 'Office 2';

            if (distance <= OFFICE_RADIUS_METERS) {
                locationAllowed = true;
                locationStatus.innerHTML = `✓ Location verified — ${nearestOffice} (${Math.round(distance)}m away)`;
                locationStatus.className = 'info-box success-box';
                showDailyCode();
                showCheckInForm();
            } else {
                locationStatus.innerHTML = `✗ You are ${Math.round(distance)}m from nearest office (max ${OFFICE_RADIUS_METERS}m)`;
                locationStatus.className = 'info-box error-box';
                showBlocked('Check-in is only allowed from the office. Please come to the office.');
            }
        },
        () => {
            locationStatus.innerHTML = '✗ Location access denied. Please enable GPS.';
            locationStatus.className = 'info-box error-box';
            showBlocked('Please enable GPS/Location access and refresh the page.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function showDailyCode() {
    dailyCode = generateDailyCode();
    document.getElementById('dailyCodeBox').classList.remove('hidden');
    document.getElementById('codeDisplay').textContent = dailyCode;
}

function showCheckInForm() {
    document.getElementById('checkInForm').classList.remove('hidden');

    // Populate dropdown dynamically from localStorage
    const select = document.getElementById('employeeName');
    const stored = localStorage.getItem('employeeList');
    if (stored) {
        const employees = JSON.parse(stored);
        select.innerHTML = '<option value="">-- Select Name --</option>';
        employees.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    }

    // Check if this browser already checked in today under any name
    const today = new Date().toLocaleDateString('en-GB');
    const browserRecord = localStorage.getItem('browserCheckIn');
    
    if (browserRecord) {
        const parsed = JSON.parse(browserRecord);
        if (parsed.date === today) {
            const records = JSON.parse(localStorage.getItem('attendance') || '[]');
            const todayRecord = records.find(r => r.name === parsed.name && r.date === today);
            
            if (todayRecord && todayRecord.checkOut) {
                document.getElementById('checkInForm').classList.add('hidden');
                document.getElementById('successBox').classList.remove('hidden');
                document.getElementById('successName').textContent = parsed.name;
                document.getElementById('successAction').textContent = 'Already completed for today ✓';
                document.getElementById('successTime').textContent = `Checked in: ${todayRecord.checkIn} | Checked out: ${todayRecord.checkOut}`;
                return;
            }
            
            select.value = parsed.name;
            select.disabled = true;
            updateActionButtons();
        }
    }

    select.addEventListener('change', updateActionButtons);
    document.getElementById('checkInBtn').addEventListener('click', () => submitAction('checkin'));
    document.getElementById('checkOutBtn').addEventListener('click', () => submitAction('checkout'));
}

function isHolidayOrWeekend(date) {
    const holidays = JSON.parse(localStorage.getItem('holidays') || '[]');
    const day = date.getDay(); // 0=Sun, 6=Sat
    const dateStr = date.toLocaleDateString('en-GB');
    return day === 0 || day === 6 || holidays.includes(dateStr);
}

function updateActionButtons() {
    const name = document.getElementById('employeeName').value;
    if (!name) return;

    const today = new Date().toLocaleDateString('en-GB');
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const todayRecord = records.find(r => r.name === name && r.date === today);
    const alreadyBox = document.getElementById('alreadyCheckedIn');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');

    // Check if today is a shift day
    const now = new Date();
    const isShift = isHolidayOrWeekend(now);
    if (isShift) {
        document.getElementById('shiftBadge').classList.remove('hidden');
    }

    if (!todayRecord) {
        checkInBtn.classList.remove('hidden');
        checkOutBtn.classList.add('hidden');
        alreadyBox.classList.add('hidden');
    } else if (todayRecord.checkIn && !todayRecord.checkOut) {
        checkInBtn.classList.add('hidden');
        checkOutBtn.classList.remove('hidden');
        alreadyBox.classList.remove('hidden');
        alreadyBox.textContent = `✓ Checked in at ${todayRecord.checkIn}. Ready to check out.`;
        alreadyBox.className = 'warning-box success-hint';
    } else {
        checkInBtn.classList.add('hidden');
        checkOutBtn.classList.add('hidden');
        alreadyBox.classList.remove('hidden');
        alreadyBox.textContent = `✓ Checked in (${todayRecord.checkIn}) and checked out (${todayRecord.checkOut}) today.`;
        alreadyBox.className = 'warning-box';
    }
}

function submitAction(action) {
    const name = document.getElementById('employeeName').value;
    const enteredCode = document.getElementById('codeInput').value.trim();

    if (!name) { alert('Please select your name.'); return; }
    if (enteredCode !== dailyCode) {
        document.getElementById('codeError').classList.remove('hidden');
        return;
    }

    document.getElementById('codeError').classList.add('hidden');

    const now = new Date();
    const date = now.toLocaleDateString('en-GB');
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const timestamp = now.toISOString();
    const isShift = isHolidayOrWeekend(now);

    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const existingIdx = records.findIndex(r => r.name === name && r.date === date);

    if (action === 'checkin') {
        if (existingIdx >= 0) { alert('Already checked in today.'); return; }
        records.push({ name, date, checkIn: time, checkOut: null, timestamp, isShift });
        // Lock this browser to this employee for today
        localStorage.setItem('browserCheckIn', JSON.stringify({ name, date }));
    } else {
        if (existingIdx < 0) { alert('Please check in first.'); return; }
        records[existingIdx].checkOut = time;
        records[existingIdx].checkOutTimestamp = timestamp;

        const checkOutHour = now.getHours();
        const empSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');
        const overtimeHour = (empSettings[name] && empSettings[name].overtimeHour) || OVERTIME_HOUR;
        if (checkOutHour >= overtimeHour) {
            const overtimeMinutes = (checkOutHour - overtimeHour) * 60 + now.getMinutes();
            records[existingIdx].overtimeMinutes = overtimeMinutes;
        }
    }

    localStorage.setItem('attendance', JSON.stringify(records));

    // Sync to Google Sheets
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, date, time, timestamp, isShift, overtimeMinutes: records[existingIdx]?.overtimeMinutes || 0 })
    }).catch(() => {});

    document.getElementById('checkInForm').classList.add('hidden');
    document.getElementById('locationStatus').classList.add('hidden');
    document.getElementById('dailyCodeBox').classList.add('hidden');

    const successBox = document.getElementById('successBox');
    successBox.classList.remove('hidden');
    document.getElementById('successName').textContent = name;
    document.getElementById('successAction').textContent = action === 'checkin' ? 'Checked In ✓' : 'Checked Out ✓';
    document.getElementById('successTime').textContent = `${date} at ${time}`;
    if (isShift) {
        document.getElementById('successAction').textContent += ' (Shift Day)';
    }
}

function showBlocked(reason) {
    document.getElementById('blockedBox').classList.remove('hidden');
    document.getElementById('blockedReason').textContent = reason;
}

// Only run on check-in page
if (document.getElementById('locationStatus')) {
    init();
}
