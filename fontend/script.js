const API_URL = "http://localhost:8000";
let tChart, hChart;
let isServoOpen = false; 

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
                callbacks: { label: (context) => ` Value: ${context.parsed.y}` }
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
        
        // 1. Cập nhật Text Sensors
        if(document.getElementById('big-temp')) document.getElementById('big-temp').innerText = data.temp;
        if(document.getElementById('header-temp')) document.getElementById('header-temp').innerText = data.temp + "°";
        if(document.getElementById('header-humi')) document.getElementById('header-humi').innerText = data.humi + "%";
        if(document.getElementById('light-val')) document.getElementById('light-val').innerText = data.light;

        // 2. Suy luận UI (UI Inference)
        const pirElement = document.getElementById('pir-val');
        let overrideLed = null;
        let overrideServo = null;

        if (pirElement && data.auth !== undefined) {
            const authVal = parseInt(data.auth);
            switch (authVal) {
                case 10:
                    pirElement.innerText = "NO MOTION";
                    pirElement.className = "status-10";
                    break;
                case 11:
                    pirElement.innerText = "MOTION DETECTED (WELCOME)";
                    pirElement.className = "status-11";
                    break;
                case 12:
                    pirElement.innerText = "VERIFYING FACE...";
                    pirElement.className = "status-12";
                    overrideLed = 1; // White light - LED mode 1
                    break;
                case 13:
                    pirElement.innerText = "AUTH SUCCESS - UNLOCKED";
                    pirElement.className = "status-13";
                    overrideLed = 2; // Green light - LED mode 2
                    overrideServo = 9; 
                    break;
                case 14:
                    pirElement.innerText = "AUTH FAILED - ACCESS DENIED";
                    pirElement.className = "status-14";
                    overrideLed = 3; // Red light - LED mode 3
                    break;
                default:
                    pirElement.innerText = "UNKNOWN STATUS";
                    pirElement.className = "status-10";
            }
        }

        // 3. Đồng bộ thanh trượt Đèn (LED)
        const finalLed = (overrideLed !== null) ? overrideLed : data.led;
        if (finalLed !== undefined) updateActiveUI('led', finalLed);

        // 4. Đồng bộ thanh trượt Quạt (FAN)
        if (data.fan !== undefined) updateActiveUI('fan', data.fan);

        // 5. Đồng bộ nút gạt Servo
        const finalServo = (overrideServo !== null) ? overrideServo : data.servo;
        if (finalServo !== undefined) {
            isServoOpen = (parseInt(finalServo) === 9); 
            const servoToggle = document.getElementById('servo-toggle');
            if (servoToggle) {
                servoToggle.checked = isServoOpen;
            }
        }

        // 6. Cập nhật Chart
        const histRes = await fetch(`${API_URL}/history`);
        const hist = await histRes.json();
        tChart.data.datasets[0].data = hist.temp;
        hChart.data.datasets[0].data = hist.humi;
        tChart.update('none');
        hChart.update('none');
    } catch (e) { console.error("Sync failed:", e); }
}

function setMode(device, sliderVal) {
    let backendVal = parseInt(sliderVal);
    // Nếu là quạt, thanh trượt hiển thị 0-3 nhưng Backend cần 4-7
    if (device === 'fan' && backendVal < 4) {
        backendVal += 4;
    }
    
    updateActiveUI(device, backendVal);
    fetch(`${API_URL}/control/${device}/${backendVal}`, { method: 'POST' });
}

function toggleServo(element) {
    const targetVal = element.checked ? 9 : 8; 
    fetch(`${API_URL}/control/servo/${targetVal}`, { method: 'POST' });
}

function updateActiveUI(device, backendVal) {
    // Nếu là quạt, trừ đi 4 để ra giá trị hiển thị trên thanh trượt (0-3)
    const displayVal = (device === 'led') ? parseInt(backendVal) : parseInt(backendVal) - 4;
    
    // Ánh xạ sang Slider (thay vì các nút cũ)
    const slider = document.getElementById(`${device}-slider`);
    if (slider) {
        slider.value = displayVal;
        // Set data-value để kích hoạt thuộc tính dịch chuyển CSS (.mode-slider-thumb)
        slider.setAttribute('data-value', displayVal);
    }
}

document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric' 
});

initCharts();
setInterval(fetchData, 2000);