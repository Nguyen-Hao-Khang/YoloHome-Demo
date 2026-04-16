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
            x: { 
                display: true,
                grid: { display: false },
                ticks: { display: false } 
            } 
        },
        plugins: { 
            legend: { display: false },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#64748b',
                bodyColor: '#1e293b',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                padding: 10,
                displayColors: false,
                callbacks: {
                    label: (context) => ` Giá trị: ${context.parsed.y}`
                }
            }
        },
        elements: { 
            point: { 
                radius: 0, 
                hoverRadius: 6,
                hoverBackgroundColor: '#fff',
                hoverBorderWidth: 3
            }, 
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
        
        // Update Text Values
        if(document.getElementById('big-temp')) document.getElementById('big-temp').innerText = data.temp;
        if(document.getElementById('header-temp')) document.getElementById('header-temp').innerText = data.temp + "°";
        if(document.getElementById('header-humi')) document.getElementById('header-humi').innerText = data.humi + "%";
        if(document.getElementById('dist-val')) document.getElementById('dist-val').innerText = data.dist;
        if(document.getElementById('light-val')) document.getElementById('light-val').innerText = data.light;


        // --- SYNC TOGGLE BUTTONS FROM DASHBOARD ---
        // Sync LED (based on stats from backend/adafruit)
        if (data.led !== undefined) {
            const ledToggle = document.querySelector('input[onchange*="led"]');
            if (ledToggle) ledToggle.checked = (parseInt(data.led) === 1);
        }
        
        // Sync FAN
        if (data.fan !== undefined) {
            const fanToggle = document.querySelector('input[onchange*="fan"]');
            if (fanToggle) fanToggle.checked = (parseInt(data.fan) === 3);
        }

        // Sync SERVO
        if (data.servo !== undefined) {
            const servoToggle = document.querySelector('input[onchange*="servo"]');
            const isOpened = (parseInt(data.servo) === 5);
            if (servoToggle) servoToggle.checked = isOpened;
        }

        // Update Charts History
const histRes = await fetch(`${API_URL}/history`);
        const hist = await histRes.json();
        tChart.data.datasets[0].data = hist.temp;
        hChart.data.datasets[0].data = hist.humi;
        tChart.update('none');
        hChart.update('none');
    } catch (e) { console.error("Update failed:", e); }
}

// 3. Send Control Commands
function toggle(device, element) {
    let val;
    const isChecked = element.checked;
    if (device === 'led') val = isChecked ? 1 : 0;
    else if (device === 'fan') val = isChecked ? 3 : 2;
    else if (device === 'servo') val = isChecked ? 5 : 4;

    fetch(`${API_URL}/control/${device}/${val}`, { method: 'POST' });
}

document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric' 
});

initCharts();
setInterval(fetchData, 2000);