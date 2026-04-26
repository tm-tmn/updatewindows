const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzB4T_V7URSfkk9EuQNk1JCU1G3VOsc7SD60opd_7_D7zLgrelr3Rih69BIb9LR_oJN/exec';
let allData = [];
let windowsOptions = [];
let myPieChart, myBarChart;

setupTheme();
fetchData();

function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    body.className = savedTheme;
    updateIcon(savedTheme);
    // ตั้งค่าสีเริ่มต้นให้ Chart.js ตามธีมที่โหลดมา
    Chart.defaults.color = savedTheme === 'dark-mode' ? '#f8f9fa' : '#1a1c23';

    themeToggle.addEventListener('click', () => {
        const isLight = body.classList.contains('light-mode');
        const newTheme = isLight ? 'dark-mode' : 'light-mode';
        
        body.classList.replace(isLight ? 'light-mode' : 'dark-mode', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);

        // อัปเดตสีตัวหนังสือใน Chart.js และวาดกราฟใหม่ทันที
        Chart.defaults.color = newTheme === 'dark-mode' ? '#f8f9fa' : '#1a1c23';
        if (allData.length > 0) calculateAndRenderStats();
    });

    function updateIcon(theme) {
        if (!themeIcon) return;
        themeIcon.className = theme === 'dark-mode' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
}

async function fetchData() {
    const status = document.getElementById('statusMessage');
    if (status) status.innerHTML = '<div class="spinner-border text-primary" role="status"></div>';
    
    try {
        const response = await fetch(WEB_APP_URL);
        const json = await response.json();
        
        allData = json.devices || [];
        windowsOptions = json.options || [];
        
        setupFilters();
        filterAndRender(); 
        calculateAndRenderStats();
        
        if (status) status.innerHTML = '';
    } catch (error) {
        console.error("Fetch Error:", error); 
        if (status) status.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function setupFilters() {
    const engFilter = document.getElementById('engineerFilter');
    const searchInput = document.getElementById('searchInput');
    const hideSwitch = document.getElementById('hideCompletedSwitch');
    
    if (!engFilter || !searchInput || !hideSwitch) return;

    const engineers = [...new Set(allData.map(item => item.engineer))].filter(e => e).sort();
    engFilter.innerHTML = '<option value="">--แสดงทั้งหมด--</option>';
    engineers.forEach(eng => {
        const opt = document.createElement('option');
        opt.value = eng;
        opt.textContent = eng;
        engFilter.appendChild(opt);
    });

    engFilter.addEventListener('change', filterAndRender);
    searchInput.addEventListener('input', filterAndRender);
    hideSwitch.addEventListener('change', filterAndRender);
}

function filterAndRender() {
    const selectedEngineer = document.getElementById('engineerFilter').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const isHideCompleted = document.getElementById('hideCompletedSwitch').checked;
    
    const container = document.getElementById('deviceList');
    if (!container) return;
    container.innerHTML = '';

    const filtered = allData.filter(d => {
        const matchEng = selectedEngineer === "" || d.engineer === selectedEngineer;
        const customerName = (d.customer || "").toLowerCase();
        const snNumber = (d.sn || "").toString().toLowerCase();
        const matchSearch = customerName.includes(searchText) || snNumber.includes(searchText);
        const matchStatus = !isHideCompleted || (d.windows === "" || d.windows === null || d.windows === "-- เลือก --");
        
        return matchEng && matchSearch && matchStatus;
    });

    const countLabel = document.getElementById('itemCount');
    if (countLabel) {
        countLabel.textContent = filtered.length;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted p-5">ไม่พบข้อมูลที่ตรงตามเงื่อนไข</div>';
        return;
    }

    filtered.forEach(item => {
        const optionsHtml = windowsOptions.map(opt => 
            `<option value="${opt}" ${item.windows === opt ? 'selected' : ''}>${opt}</option>`
        ).join('');

        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 device-item';
        card.innerHTML = `
            <div class="card device-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="customer-title">${item.customer || 'N/A'}</div>
                        <span class="model-badge">${item.model || 'N/A'}</span>
                    </div>
                    <div class="text-muted small mb-3">
                        <i class="bi bi-geo-alt"></i> ${item.city || ''} | <span class="sn-text">S/N: ${item.sn || '-'}</span>
                    </div>
                    <div class="small text-muted mb-3" style="border-left: 3px solid #ddd; padding-left: 10px;">
                        Engineer: <strong>${item.engineer || 'Unassigned'}</strong>
                    </div>
                    <label class="small fw-bold mb-2 text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.05em;">Windows Version</label>
                    <select class="form-select" onchange="updateWindows(${item.rowNumber}, this)">
                        <option value="">-- Select Windows --</option>
                        ${optionsHtml}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function updateWindows(rowNumber, selectElement) {
    const newValue = selectElement.value;
    selectElement.disabled = true;

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ rowNumber, windowValue: newValue })
        });

        const item = allData.find(d => d.rowNumber === rowNumber);
        if (item) item.windows = newValue;

        // อัปเดตกราฟใหม่ทุกครั้งที่มีการบันทึกสำเร็จ
        calculateAndRenderStats();

        const isHideCompleted = document.getElementById('hideCompletedSwitch').checked;
        if (isHideCompleted && newValue !== "") {
            filterAndRender(); 
        } else {
            selectElement.style.backgroundColor = "#d1e7dd";
            setTimeout(() => selectElement.style.backgroundColor = "", 2000);
        }
    } catch (error) {
        alert('บันทึกไม่สำเร็จ!');
    } finally {
        selectElement.disabled = false;
    }
}

function calculateAndRenderStats() {
    const totalItems = allData.length;
    const completedItems = allData.filter(d => 
        d.windows && d.windows !== "" && d.windows !== null && d.windows !== "-- เลือก --"
    ).length;
    const remainingItems = totalItems - completedItems;
    const completionPercentage = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;

    const engineerStats = {};
    allData.forEach(d => {
        const eng = d.engineer || 'ไม่ระบุ';
        if (!engineerStats[eng]) engineerStats[eng] = { total: 0, completed: 0 };
        engineerStats[eng].total++;
        if (d.windows && d.windows !== "" && d.windows !== null && d.windows !== "-- เลือก --") {
            engineerStats[eng].completed++;
        }
    });

    const engLabels = Object.keys(engineerStats).sort();
    const engTotalData = engLabels.map(eng => engineerStats[eng].total);
    const engCompletedData = engLabels.map(eng => engineerStats[eng].completed);

    const isDarkMode = document.body.classList.contains('dark-mode');
    const chartTextColor = isDarkMode ? '#f8f9fa' : '#1a1c23';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Pie Chart
    const pieCtx = document.getElementById('progressPieChart').getContext('2d');
    if (myPieChart) myPieChart.destroy();
    myPieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['สำเร็จ', 'รอดำเนินการ'],
            datasets: [{
                data: [completedItems, remainingItems],
                backgroundColor: ['#198754', '#adb5bd'],
                borderColor: isDarkMode ? '#1e1e1e' : '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: chartTextColor }, position: 'bottom' }
            }
        }
    });

    // Bar Chart
    const barCtx = document.getElementById('engineerBarChart').getContext('2d');
    if (myBarChart) myBarChart.destroy();
    myBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: engLabels,
            datasets: [
                { label: 'สำเร็จ', data: engCompletedData, backgroundColor: '#198754' },
                { label: 'ทั้งหมด', data: engTotalData, backgroundColor: '#adb5bd' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { color: chartTextColor },
                    grid: { color: gridColor }
                },
                x: { 
                    ticks: { color: chartTextColor },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { labels: { color: chartTextColor }, position: 'bottom' }
            }
        }
    });
}
