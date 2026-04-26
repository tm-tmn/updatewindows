const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzB4T_V7URSfkk9EuQNk1JCU1G3VOsc7SD60opd_7_D7zLgrelr3Rih69BIb9LR_oJN/exec';
let allData = [];
let windowsOptions = [];
let myPieChart, myBarChart, myModelChart;

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
        renderCurrentWindows();
        
        if (status) status.innerHTML = '';
    } catch (error) {
        console.error("Fetch Error:", error); 
        if (status) status.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function setupFilters() {
    const engFilter = document.getElementById('engineerFilter');
    const modelEngFilter = document.getElementById('modelEngineerFilter'); // ดึง Element ใหม่มาเตรียมไว้
    const searchInput = document.getElementById('searchInput');
    const hideSwitch = document.getElementById('hideCompletedSwitch');
    
    if (!engFilter || !searchInput || !hideSwitch) return;

    // ดึงรายชื่อวิศวกรที่ไม่ซ้ำกันออกมา
    const engineers = [...new Set(allData.map(item => item.engineer))].filter(e => e).sort();

    // 1. ล้างค่าและตั้งค่าเริ่มต้นให้ทั้ง 2 Dropdown
    engFilter.innerHTML = '<option value="">--แสดงทั้งหมด--</option>';
    if (modelEngFilter) {
        modelEngFilter.innerHTML = '<option value="">-- แสดงช่างทุกคน --</option>';
    }

    // 2. ใช้ Loop เดียวกันสร้าง Option ให้ทั้งคู่
    engineers.forEach(eng => {
        // สร้าง Option สำหรับหน้าหลัก
        const opt1 = document.createElement('option');
        opt1.value = eng;
        opt1.textContent = eng;
        engFilter.appendChild(opt1);

        // สร้าง Option สำหรับใน Modal (ถ้ามี Element อยู่จริง)
        if (modelEngFilter) {
            const opt2 = document.createElement('option');
            opt2.value = eng;
            opt2.textContent = eng;
            modelEngFilter.appendChild(opt2);
        }
    });

    // 3. เพิ่ม Event Listeners
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


// เพิ่ม Event Listener ให้แสดงรายการ Windows เมื่อเปิด Modal
document.getElementById('manageWindowsModal').addEventListener('show.bs.modal', function () {
    renderCurrentWindows();
});

// 1. [ต้องเก็บไว้] ฟังก์ชันแสดงรายการ (UI)
function renderCurrentWindows() {
    const listContainer = document.getElementById('currentWindowsList');
    if (!listContainer) return;
    listContainer.innerHTML = windowsOptions.map((opt, index) => `
        <div class="d-flex align-items-center gap-2 mb-2 p-2 bg-white border rounded-3 shadow-sm">
            <input type="text" id="input-win-${index}" class="form-control form-control-sm border-0 bg-transparent" value="${opt}" readonly>
            <div class="d-flex gap-1">
                <button id="btn-edit-${index}" class="btn btn-outline-primary btn-sm border-0" onclick="toggleEditWindows(${index})">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteWindowsVersion(${index})">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 2. [ต้องเก็บไว้] ฟังก์ชันจัดการปุ่ม แก้ไข/บันทึก บนหน้าจอ
async function toggleEditWindows(index) {
    const input = document.getElementById(`input-win-${index}`);
    const btn = document.getElementById(`btn-edit-${index}`);
    const isReadOnly = input.hasAttribute('readonly');

    if (isReadOnly) {
        input.removeAttribute('readonly');
        input.classList.replace('bg-transparent', 'bg-light');
        input.focus();
        btn.innerHTML = '<i class="bi bi-floppy-fill"></i>';
        btn.classList.replace('btn-outline-primary', 'btn-success');
    } else {
        const newValue = document.getElementById(`input-win-${index}`).value.trim();
        if (!newValue) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อเวอร์ชัน', 'warning');
        
        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // เรียกใช้ฟังก์ชันกลาง
        const success = await updateListOnServer('editWindowsVersion', { index: index, newValue: newValue });
        
        if (success) {
            input.setAttribute('readonly', true);
            input.classList.replace('bg-light', 'bg-transparent');
            btn.innerHTML = '<i class="bi bi-pencil-square"></i>';
            btn.classList.replace('btn-success', 'btn-outline-primary');
            Swal.fire({
                icon: 'success',
                title: 'แก้ไขเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

// 3. [ต้องเก็บไว้] ฟังก์ชันจัดการการกดปุ่มลบ
async function deleteWindowsVersion(index) {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณต้องการลบ "${windowsOptions[index]}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ลบเลย!'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const success = await updateListOnServer('deleteWindowsVersion', { index: index });
        
        if (success) {
            // หน่วงเวลาเล็กน้อยเพื่อให้คนดูทัน
            setTimeout(() => {
                Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', timer: 1500, showConfirmButton: false });
            }, 300);
        }
    }
}

// 4. [ฟังก์ชันกลาง] ตัวส่งข้อมูลไป Server (อันที่คุณเขียนใหม่)
async function updateListOnServer(action, payload) {
    const passField = document.getElementById('adminPasswordInput');
    const passInput = passField.value;
    const now = new Date();
    const correctPass = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

    // 1. ตรวจสอบรหัสผ่านก่อนทำอย่างอื่น
    if (passInput !== correctPass) {
        passField.value = ''; // เคลียร์ทันทีที่ผิด
        // ใช้ await เพื่อให้มั่นใจว่า Swal ผิดพลาดแสดงผลเสร็จก่อนจะทำอย่างอื่น
        await Swal.fire({
            icon: 'error',
            title: 'ผิดพลาด',
            text: 'รหัสผ่าน Admin ไม่ถูกต้อง',
            confirmButtonText: 'ตกลง'
        });
        return false;
    }

    try {
        // 2. ถ้าผ่าน ให้แสดง Loading เฉพาะตอนจะเริ่ม Fetch
        Swal.fire({
            title: 'กำลังดำเนินการ...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: action, ...payload })
        });
        
        // 3. จัดการข้อมูลใน Local
        if (action === 'deleteWindowsVersion') {
            windowsOptions.splice(payload.index, 1);
        } else if (action === 'editWindowsVersion') {
            windowsOptions[payload.index] = payload.newValue;
        } else if (action === 'addWindowsVersion') {
            windowsOptions.push(payload.versionName);
            windowsOptions.sort();
        }
        
        passField.value = ''; // เคลียร์รหัสผ่านเมื่อสำเร็จ
        renderCurrentWindows();
        filterAndRender(); 

        // 4. ปิด Loading ก่อนส่งค่ากลับ
        Swal.close(); 
        return true;

    } catch (e) {
        console.error(e);
        passField.value = '';
        await Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        return false;
    }
}

// 5. [ฟังก์ชันเพิ่มข้อมูลใหม่]
async function addNewWindowsVersion() {
    const newVal = document.getElementById('newWindowsInput').value.trim();
    if (!newVal) return Swal.fire('แจ้งเตือน', 'ระบุชื่อ Windows', 'warning');

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const success = await updateListOnServer('addWindowsVersion', { versionName: newVal });

    if (success) {
        document.getElementById('newWindowsInput').value = '';
        document.getElementById('adminPasswordInput').value = '';
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', timer: 1500, showConfirmButton: false });
    }
}


function calculateAndRenderStats() {
    const totalItems = allData.length;
    const completedItems = allData.filter(d => 
        d.windows && d.windows !== "" && d.windows !== null && d.windows !== "-- เลือก --"
    ).length;
    const remainingItems = totalItems - completedItems;
    
    const completionPercentage = totalItems > 0 ? ((completedItems / totalItems) * 100).toFixed(1) : 0;

    const modalTitle = document.querySelector('#dashboardModalLabel');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="bi bi-bar-chart-line-fill text-primary me-2"></i> ความคืบหน้าภาพรวม: ${completionPercentage}%`;
    }

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
    const engRemainingData = engLabels.map(eng => engineerStats[eng].total - engineerStats[eng].completed);
    const engCompletedData = engLabels.map(eng => engineerStats[eng].completed);

    const isDarkMode = document.body.classList.contains('dark-mode');
    const chartTextColor = isDarkMode ? '#f8f9fa' : '#1a1c23';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    // --------------------------------------------------

    // 1. Pie/Doughnut Chart
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
                legend: { 
                    position: 'bottom',
                    labels: { 
                        color: chartTextColor,
                        usePointStyle: true, // ทำให้สัญลักษณ์หน้าคำอธิบายเป็นวงกลม (ถ้าชอบ)
                    },
                    // --- เพิ่มบรรทัดนี้เพื่อปิดการคลิกที่ Legend ---
                    onClick: (e) => e.stopPropagation() 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            let percentage = totalItems > 0 ? ((value / totalItems) * 100).toFixed(1) : 0;
                            return ` ${label}: ${value} เครื่อง (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // 2. Bar Chart
    const barCtx = document.getElementById('engineerBarChart').getContext('2d');
    if (myBarChart) myBarChart.destroy();
    myBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: engLabels,
            datasets: [
                { label: 'สำเร็จ', data: engCompletedData, backgroundColor: '#198754' },
                { label: 'รอดำเนินการ', data: engRemainingData, backgroundColor: '#adb5bd' }
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

// --- 3. Model Bar Chart (เพิ่มใหม่) ---
    const modelFilterValue = document.getElementById('modelEngineerFilter')?.value || "";
    const modelStats = {};
    
    // กรองข้อมูลตามช่างที่เลือกใน Modal
    const filteredForModel = allData.filter(d => modelFilterValue === "" || d.engineer === modelFilterValue);
    
    filteredForModel.forEach(d => {
        const model = d.model || 'Unknown';
        if (!modelStats[model]) modelStats[model] = { completed: 0, remaining: 0 };
        
        if (d.windows && d.windows !== "" && d.windows !== null && d.windows !== "-- เลือก --") {
            modelStats[model].completed++;
        } else {
            modelStats[model].remaining++;
        }
    });

    const modelLabels = Object.keys(modelStats).sort();
    const modelCompletedData = modelLabels.map(m => modelStats[m].completed);
    const modelRemainingData = modelLabels.map(m => modelStats[m].remaining);

    const modelCtx = document.getElementById('modelBarChart').getContext('2d');
    if (myModelChart) myModelChart.destroy();
    myModelChart = new Chart(modelCtx, {
        type: 'bar',
        data: {
            labels: modelLabels,
            datasets: [
                { label: 'สำเร็จ', data: modelCompletedData, backgroundColor: '#198754' },
                { label: 'รอดำเนินการ', data: modelRemainingData, backgroundColor: '#adb5bd' }
            ]
        },
        options: {
            indexAxis: 'y', // กราฟแนวนอนทำให้อ่านชื่อรุ่นง่ายขึ้น
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { color: chartTextColor }, grid: { color: gridColor } },
                y: { stacked: true, ticks: { color: chartTextColor }, grid: { display: false } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: chartTextColor } }
            }
        }
    });
}
