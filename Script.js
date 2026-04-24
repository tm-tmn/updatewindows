const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzB4T_V7URSfkk9EuQNk1JCU1G3VOsc7SD60opd_7_D7zLgrelr3Rih69BIb9LR_oJN/exec';
let allData = [];

// 1. ดึงข้อมูลครั้งแรก
async function fetchData() {
    const status = document.getElementById('statusMessage');
    status.innerHTML = '<div class="spinner"></div>';
    
    try {
        const response = await fetch(WEB_APP_URL);
        allData = await response.json();
        
        setupEngineerFilter();
        renderDevices(""); // แสดงทั้งหมดตอนเริ่มต้น หรือจะว่างไว้ก็ได้
        status.innerHTML = '';
    } catch (error) {
        status.innerHTML = '<div class="alert alert-danger">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>';
    }
}

// 2. ตั้งค่า Dropdown กรองชื่อช่าง
function setupEngineerFilter() {
    const filter = document.getElementById('engineerFilter');
    const engineers = [...new Set(allData.map(item => item.engineer))].filter(e => e); // ดึงชื่อที่ไม่ซ้ำ
    
    filter.innerHTML = '<option value="">-- เลือกชื่อช่าง --</option>';
    engineers.forEach(eng => {
        const opt = document.createElement('option');
        opt.value = eng;
        opt.textContent = eng;
        filter.appendChild(opt);
    });

    filter.addEventListener('change', (e) => renderDevices(e.target.value));
}

// 3. แสดงรายการเครื่องในรูปแบบ Card (เหมาะกับมือถือมากกว่าตาราง)
function renderDevices(selectedEngineer) {
    const container = document.getElementById('deviceList');
    container.innerHTML = '';

    const filtered = selectedEngineer ? allData.filter(d => d.engineer === selectedEngineer) : [];

    if (filtered.length === 0 && selectedEngineer) {
        container.innerHTML = '<div class="text-center text-muted">ไม่พบรายการเครื่องของช่างท่านนี้</div>';
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6';
        card.innerHTML = `
            <div class="card device-card shadow-sm h-100">
                <div class="card-body">
                    <div class="fw-bold customer-name">${item.customer}</div>
                    <div class="text-muted small mb-2">${item.city}</div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="model-badge text-primary">${item.model}</span>
                        <span class="text-secondary small">S/N: ${item.sn}</span>
                    </div>
                    
                    <label class="small fw-bold mb-1">Windows Version:</label>
                    <select class="form-select" onchange="updateWindows(${item.rowNumber}, this)">
                        <option value="">-- เลือก --</option>
                        <option value="Windows 10" ${item.windows === 'Windows 10' ? 'selected' : ''}>Windows 10</option>
                        <option value="Windows 11" ${item.windows === 'Windows 11' ? 'selected' : ''}>Windows 11</option>
                        <option value="N/A" ${item.windows === 'N/A' ? 'selected' : ''}>N/A</option>
                    </select>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. ฟังก์ชันบันทึกข้อมูลกลับไปยัง Google Sheets
async function updateWindows(rowNumber, selectElement) {
    const newValue = selectElement.value;
    if (!newValue) return;

    // เปลี่ยนสีขอบเป็นสีเหลืองเพื่อบอกว่ากำลังบันทึก
    selectElement.classList.add('border-warning');
    
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                rowNumber: rowNumber,
                windowValue: newValue
            })
        });

        if (response.ok) {
            selectElement.classList.remove('border-warning');
            selectElement.classList.add('border-success');
            setTimeout(() => selectElement.classList.remove('border-success'), 2000);
        }
    } catch (error) {
        alert('บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต');
        selectElement.classList.remove('border-warning');
    }
}

// เริ่มโหลดข้อมูล
fetchData();
