const API_URL = "http://localhost:8000";
let tChart, hChart;

function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { 
            y: { 
                display: true,
                grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 10 } }
            }, 
            x: { display: true, grid: { display: false }, ticks: { display: false } } 
        },
        plugins: { 
            legend: { display: false },
            tooltip: {
                enabled: true, mode: 'index', intersect: false,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#64748b', bodyColor: '#1e293b',
                borderWidth: 1, borderColor: '#e2e8f0',
                padding: 10, displayColors: false,
                callbacks: { label: (context) => ` Giá trị: ${context.parsed.y}` }
            }
        },
        elements: { 
            point: { radius: 0, hoverRadius: 6, hoverBackgroundColor: '#fff', hoverBorderWidth: 3 }, 
            line: { tension: 0, borderWidth: 3 } 
        }
    };

    tChart = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: { labels: Array(15).fill(''), datasets: [{ data: [], borderColor: '#f97316', fill: true, backgroundColor: 'rgba(249, 115, 22, 0.05)' }] },
        options: commonOptions
    });

    hChart = new Chart(document.getElementById('humiChart'), {
        type: 'line',
        data: { labels: Array(15).fill(''), datasets: [{ data: [], borderColor: '#3b82f6', fill: true, backgroundColor: 'rgba(59, 130, 246, 0.05)' }] },
        options: commonOptions
    });
}

async function fetchData() {
    try {
        const res = await fetch(`${API_URL}/data`);
        const data = await res.json();
        
        if(document.getElementById('big-temp')) document.getElementById('big-temp').innerText = data.temp;
        if(document.getElementById('header-temp')) document.getElementById('header-temp').innerText = data.temp + "°";
        if(document.getElementById('header-humi')) document.getElementById('header-humi').innerText = data.humi + "%";
        if(document.getElementById('dist-val')) document.getElementById('dist-val').innerText = data.dist;
        if(document.getElementById('light-val')) document.getElementById('light-val').innerText = data.light;

        // Sync Mode UI
        if (data.led !== undefined) updateActiveUI('led', data.led);
        if (data.fan !== undefined) updateActiveUI('fan', data.fan);

        // Sync Servo Image
        const gateImg = document.getElementById('servo-img');
        if (gateImg) {
            gateImg.src = (parseInt(data.servo) === 9) ? 'assets/smart_lock_open.png' : 'assets/smart_lock.png';
        }

        const histRes = await fetch(`${API_URL}/history`);
        const hist = await histRes.json();
        tChart.data.datasets[0].data = hist.temp;
        hChart.data.datasets[0].data = hist.humi;
        tChart.update('none');
        hChart.update('none');
    } catch (e) { console.error("Update failed:", e); }
}

function setMode(device, val) {
    updateActiveUI(device, val);
    fetch(`${API_URL}/control/${device}/${val}`, { method: 'POST' });
}

function servoControl(val) {
    fetch(`${API_URL}/control/servo/${val}`, { method: 'POST' });
}

function updateActiveUI(device, val) {
    const buttons = document.querySelectorAll(`.mode-btn[data-device="${device}"]`);
    buttons.forEach(btn => {
        const displayVal = (device === 'led') ? parseInt(val) : parseInt(val) - 4;
        if (parseInt(btn.innerText) === displayVal) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric' 
});

initCharts();
setInterval(fetchData, 2000);