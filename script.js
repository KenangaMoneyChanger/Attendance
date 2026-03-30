// Configuration
const OFFICE_LAT = -6.250314346990451;
const OFFICE_LNG = 106.79765647791027;
const OFFICE_RADIUS_METERS = 100;
const OFFICE_WIFI = 'Kenanga';
const GOOGLE_SHEET_ID = ''; // Add your Google Sheet ID here

const EMPLOYEES = [
    'Anas Amrulloh',
    'Dinda Ayu Putri',
    'Evi Nurmala Dewi',
    'Farid Kurniadi'
];

// Google Apps Script Web App URL - set this after deploying
const APPS_SCRIPT_URL = '';

let userLocation = null;
let locationAllowed = false;
let wifiAllowed = false;

function init() {
    checkLocation();
}

// Calculate distance between two GPS coordinates in meters
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

function checkLocation() {
    const locationStatus = document.getElementById('locationStatus');

    if (!navigator.geolocation) {
        locationStatus.innerHTML = '✗ GPS not supported on this device';
        locationStatus.className = 'info-box error-box';
        checkWifi();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = position.coords;
            const distance = getDistanceMeters(
                userLocation.latitude,
                userLocation.longitude,
                OFFICE_LAT,
                OFFICE_LNG
            );

            if (distance <= OFFICE_RADIUS_METERS) {
                locationAllowed = true;
                locationStatus.innerHTML = `✓ Location verified (${Math.round(distance)}m from office)`;
                locationStatus.className = 'info-box success-box';
            } else {
                locationAllowed = false;
                locationStatus.innerHTML = `✗ You are ${Math.round(distance)}m from office (max ${OFFICE_RADIUS_METERS}m)`;
                locationStatus.className = 'info-box error-box';
            }

            checkWifi();
        },
        (error) => {
            locationStatus.innerHTML = '✗ Location access denied. Please enable GPS.';
            locationStatus.className = 'info-box error-box';
            checkWifi();
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function checkWifi() {
    const wifiStatus = document.getElementById('wifiStatus');
    wifiStatus.classList.remove('hidden');

    // Note: browsers cannot directly check WiFi SSID for security reasons
    // We use a workaround - try to reach a local network resource
    // For now, we'll show a message and rely on GPS primarily
    wifiStatus.innerHTML = `ℹ️ Please ensure you are connected to "${OFFICE_WIFI}" WiFi`;
    wifiStatus.className = 'info-box neutral-box';

    evaluateAccess();
}

function evaluateAccess() {
    const checkInForm = document.getElementById('checkInForm');
    const blockedBox = document.getElementById('blockedBox');
    const blockedReason = document.getElementById('blockedReason');

    if (locationAllowed) {
        checkInForm.classList.remove('hidden');
        document.getElementById('checkInBtn').addEventListener('click', submitCheckIn);
        document.getElementById('employeeName').addEventListener('change', checkAlreadyCheckedIn);
    } else {
        blockedBox.classList.remove('hidden');
        blockedReason.textContent = 'Check-in is only allowed from the office location. Please come to the office to check in.';
    }
}

function checkAlreadyCheckedIn() {
    const name = document.getElementById('employeeName').value;
    if (!name) return;

    const today = new Date().toLocaleDateString('en-GB');
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    const alreadyIn = records.some(r => r.name === name && r.date === today);

    const alreadyBox = document.getElementById('alreadyCheckedIn');
    const checkInBtn = document.getElementById('checkInBtn');

    if (alreadyIn) {
        alreadyBox.classList.remove('hidden');
        checkInBtn.disabled = true;
        checkInBtn.style.opacity = '0.5';
    } else {
        alreadyBox.classList.add('hidden');
        checkInBtn.disabled = false;
        checkInBtn.style.opacity = '1';
    }
}

function submitCheckIn() {
    const name = document.getElementById('employeeName').value;

    if (!name) {
        alert('Please select your name.');
        return;
    }

    const now = new Date();
    const date = now.toLocaleDateString('en-GB');
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const timestamp = now.toISOString();

    // Save to localStorage
    const records = JSON.parse(localStorage.getItem('attendance') || '[]');
    records.push({ name, date, time, timestamp });
    localStorage.setItem('attendance', JSON.stringify(records));

    // Send to Google Sheets if configured
    if (APPS_SCRIPT_URL) {
        sendToGoogleSheets({ name, date, time, timestamp });
    }

    // Show success
    document.getElementById('checkInForm').classList.add('hidden');
    document.getElementById('locationStatus').classList.add('hidden');
    document.getElementById('wifiStatus').classList.add('hidden');

    const successBox = document.getElementById('successBox');
    successBox.classList.remove('hidden');
    document.getElementById('successName').textContent = name;
    document.getElementById('successTime').textContent = `${date} at ${time}`;
}

async function sendToGoogleSheets(data) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.log('Could not sync to Google Sheets:', e);
    }
}

if (document.getElementById('checkInBtn') !== null || document.getElementById('locationStatus') !== null) {
    init();
}
