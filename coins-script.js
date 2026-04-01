const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby9zpfhYjFAm9O2pePHJAI8sm2aIJZndCKwv0fiQ9sWxI9_xK5k5F5aZZv7rxn9skQx/exec';
const WHATSAPP_NUMBER = '6282128828181';
const REDEEM_THRESHOLD = 100;

let currentEmployee = null;
let employeeCoins = null;

async function init() {
    await loadEmployeeList();
    document.getElementById('employeeSelect').addEventListener('change', onEmployeeSelected);
}

async function loadEmployeeList() {
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?type=employeeList`);
        const data = await res.json();
        const select = document.getElementById('employeeSelect');
        select.innerHTML = '<option value="">-- Select Name --</option>';
        if (data && data.length > 0) {
            data.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.log('Could not load employee list:', e);
    }
}

async function onEmployeeSelected() {
    const name = document.getElementById('employeeSelect').value;
    if (!name) {
        document.getElementById('coinsSection').style.display = 'none';
        return;
    }

    currentEmployee = name;
    document.getElementById('loadingCoins').style.display = 'block';
    document.getElementById('coinsSection').style.display = 'none';

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?type=coins&name=${encodeURIComponent(name)}`);
        employeeCoins = await res.json();
        renderCoins(employeeCoins);
    } catch (e) {
        console.log('Could not load coins:', e);
        employeeCoins = { totalCoins: 0, streak: 0, lastCheckIn: '' };
        renderCoins(employeeCoins);
    }

    document.getElementById('loadingCoins').style.display = 'none';
    document.getElementById('coinsSection').style.display = 'block';
}

function renderCoins(data) {
    const total = data.totalCoins || 0;
    const streak = data.streak || 0;

    document.getElementById('totalCoins').textContent = total;

    // Render streak days (1-6)
    const streakContainer = document.getElementById('streakDays');
    streakContainer.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const day = document.createElement('div');
        day.className = 'streak-day';
        day.textContent = `+${i}`;
        if (i < streak) day.classList.add('completed');
        else if (i === streak) day.classList.add('current');
        streakContainer.appendChild(day);
    }

    const nextCoins = streak < 6 ? streak + 1 : 1;
    document.getElementById('streakInfo').innerHTML = `
        Day <strong>${streak}</strong> of 6 — Next check-in earns <strong>+${nextCoins} coins</strong>
    `;

    // Redeem button
    const redeemBtn = document.getElementById('redeemBtn');
    const redeemHint = document.getElementById('redeemHint');
    if (total >= REDEEM_THRESHOLD) {
        redeemBtn.disabled = false;
        redeemHint.textContent = `You have ${total} coins — ready to redeem!`;
        redeemHint.style.color = '#28a745';
    } else {
        redeemBtn.disabled = true;
        redeemHint.textContent = `You need ${REDEEM_THRESHOLD - total} more coins to redeem`;
        redeemHint.style.color = '#999';
    }
}

function redeemCoins() {
    if (!currentEmployee || !employeeCoins) return;
    if (employeeCoins.totalCoins < REDEEM_THRESHOLD) return;

    const message = `Hi, I would like to redeem my coins!\n\nName: ${currentEmployee}\nCoins: ${employeeCoins.totalCoins}\n\nPlease process my redemption. Thank you!`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Called from script.js after successful check-in
async function awardCoins(name) {
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?type=coins&name=${encodeURIComponent(name)}`);
        const current = await res.json();

        const today = new Date().toLocaleDateString('en-GB');
        const lastCheckIn = current.lastCheckIn || '';

        // Check if already awarded today
        if (lastCheckIn === today) return;

        // Calculate streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-GB');

        let newStreak = lastCheckIn === yesterdayStr ? (current.streak || 0) + 1 : 1;
        if (newStreak > 6) newStreak = 1;

        const coinsEarned = newStreak;
        const newTotal = (current.totalCoins || 0) + coinsEarned;

        // Save to Sheets
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'saveCoins',
                name,
                totalCoins: newTotal,
                streak: newStreak,
                lastCheckIn: today
            })
        });

        return { coinsEarned, newTotal, newStreak };
    } catch (e) {
        console.log('Could not award coins:', e);
    }
}

init();
