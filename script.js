// Configuration
const OFFICE_LAT = -6.250314346990451;
const OFFICE_LNG = 106.79765647791027;
const OFFICE_RADIUS_METERS = 100;
const OVERTIME_HOUR = 17; // 5PM

const EMPLOYEES = [
    'Anas Amrulloh',
    'Dinda Ayu Putri',
    'Evi Nurmala Dewi',
    'Farid Kurniadi'
];

const APPS_SCRIPT_URL = '';

let userLocation = null;
let locationAllowed = false;
let dailyCode = null;

function generateDailyCode() {
    const now = new Date();
    const seed = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${Math.floor(now.getMinutes() / 5)}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    return String(Math.abs(hash) % 9000 + 1000);
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
    checkLocation();
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
            const distance = getDistanceMeters(
                userLocation.latitude, userLocation.longitude,
                OFFICE_LAT, OFFICE_LNG
            );

            if (distance <= OFFICE_RADIUS_METERS) {
                locationAllowed = true;
                locationStatus.innerHTML = `✓ Location verified (${Math.round(distance)}m from office)`;
                locationStatus.className = 'info-box success-box';
                showDailyCode();
                showCheckInForm();
            } else {
                locationStatus.innerHTML = `✗ You are ${Math.round(distance)}m away (max ${OFFICE_RADIUS_METERS}m)`;
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

    setInterval(() => {
        dailyCode = generateDailyCode();
        document.getElementById('codeDisplay').textContent = dailyCode;
    }, 300000);
}

function showCheckInForm() {
    document.getElementById('checkInForm').classList.remove('hidden');
    document.getElementById('employeeName').addEventListener('change', updateActionButtons);
    document.getElementById('checkInBtn').addEventListener('click', () => submitAction('checkin'));
    document.getElementById('checkOutBtn').addEventListener('click', () => submitAction('checkout'));
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

    if (!todayRecord) {
        // Not checked in yet
        checkInBtn.classList.remove('hidden');
        checkOutBtn.classList.add('hidden');
        alreadyBox.classList.add('hidden');
    } else if (todayRecord.checkIn && !todayRecord.checkOut) {
        // Checked in but not out
        checkInBtn.classList.add('hidden');
        checkOutBtn.classList.remove('hidden');
        alreadyBox.classList.remove('hidden');
        alreadyBox.textContent = `✓ Checked in at ${todayRecord.checkIn}. Ready to check out.`;
        alreadyBox.className = 'warning-box success-hint';
    } else if (todayRecord.checkIn && todayRecord.checkOut) {
        // Already done both
        checkInBtn.classList.add('hidden');
        checkOutBtn.classList.add('hidden');
        alreadyBox.classList.remove('hidden');
        alreadyBox.textContent = `✓ Already checked in (${todayRecord.checkIn}) and checked out (${todayRecord.checkOut}) today.`;
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

    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const existingIdx = records.findIndex(r => r.name === name && r.date === date);

    if (action === 'checkin') {
        if (existingIdx >= 0) { alert('Already checked in today.'); return; }
        records.push({ name, date, checkIn: time, checkOut: null, timestamp });
    } else {
        if (existingIdx < 0) { alert('Please check in first.'); return; }
        records[existingIdx].checkOut = time;
        records[existingIdx].checkOutTimestamp = timestamp;

        // Calculate overtime
        const checkOutHour = now.getHours();
        if (checkOutHour >= OVERTIME_HOUR) {
            const overtimeMinutes = (checkOutHour - OVERTIME_HOUR) * 60 + now.getMinutes();
            records[existingIdx].overtimeMinutes = overtimeMinutes;
        }
    }

    localStorage.setItem('attendance', JSON.stringify(records));

    if (APPS_SCRIPT_URL) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, date, time, action, timestamp })
        }).catch(() => {});
    }

    document.getElementById('checkInForm').classList.add('hidden');
    document.getElementById('locationStatus').classList.add('hidden');
    document.getElementById('dailyCodeBox').classList.add('hidden');

    const successBox = document.getElementById('successBox');
    successBox.classList.remove('hidden');
    document.getElementById('successName').textContent = name;
    document.getElementById('successAction').textContent = action === 'checkin' ? 'Checked In ✓' : 'Checked Out ✓';
    document.getElementById('successTime').textContent = `${date} at ${time}`;
}

function showBlocked(reason) {
    document.getElementById('blockedBox').classList.remove('hidden');
    document.getElementById('blockedReason').textContent = reason;
}

init();
