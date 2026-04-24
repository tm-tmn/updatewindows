const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzB4T_V7URSfkk9EuQNk1JCU1G3VOsc7SD60opd_7_D7zLgrelr3Rih69BIb9LR_oJN/exec';
let allData = [];
let windowsOptions = [];

async function fetchData() {
    const status = document.getElementById('statusMessage');
    status.innerHTML = '<div class="spinner"></div>';
    
    try {
        const response = await fetch(WEB_APP_URL);
        const json = await response.json();
        
        allData = json.devices;
        windowsOptions = json.options;
        
        setupFilters(); // เปลี่ยนชื่อฟังก์ชันเพื่อให้ครอบคลุมทั้ง Engineer และ Search
        renderDevices(); // เรียกใช้งานโดยไม่ส่ง parameter เพื่อให้หน้าแรกโชว์ทั้งหมด
        status.innerHTML = '';
    } catch (error) {
        status.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function setupFilters() {
    const engFilter = document.getElementById('engineerFilter');
    const searchInput = document.getElementById('searchInput');
    
    // ตั้งค่ารายชื่อช่าง
    const engineers = [...new Set(allData.map(item => item.engineer))].filter(e => e).sort();
    engFilter.innerHTML = '<option value="">-- แสดงทั้งหมด (ทุกช่าง) --</option>';
    engineers.forEach(eng => {
        const opt = document.createElement('option');
        opt.value = eng;
        opt.textContent = eng;
        engFilter.appendChild(opt);
    });

    // เมื่อเลือกช่าง
    engFilter.addEventListener('change', () => filterAndRender());
    
    // เมื่อพิมพ์ค้นหา
    searchInput.addEventListener('input', () => filterAndRender());
}

// ฟังก์ชันหลักในการกรองและแสดงผล
function filterAndRender() {
    const selectedEngineer = document.getElementById('engineerFilter').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    const container = document.getElementById('deviceList');
    container.innerHTML = '';

    const filtered = allData.filter(d => {
        // เงื่อนไขช่าง: ถ้าเลือก "ทั้งหมด" หรือชื่อช่างตรงกัน
        const matchEng = selectedEngineer === "" || d.engineer === selectedEngineer;
        
        // เงื่อนไข Search: ค้นหาใน Customer หรือ S/N
        const matchSearch = d.customer.toLowerCase().includes(searchText) || 
                            d.sn.toString().toLowerCase().includes(searchText);
        
        return matchEng && matchSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-5">ไม่พบข้อมูลที่ตรงตามเงื่อนไข</div>';
        return;
    }

    filtered.forEach(item => {
        const optionsHtml = windowsOptions.map(opt => 
            `<option value="${opt}" ${item.windows === opt ? 'selected' : ''}>${opt}</option>`
        ).join('');

        const card = document.createElement('div');
        card.className = 'col-12 col-md-6';
        card.innerHTML = `
            <div class="card device-card shadow-sm h-100">
                <div class="card-body">
                    <div class="fw-bold">${item.customer}</div>
                    <div class="text-muted small">${item.city}</div>
                    <div class="d-flex justify-content-between my-2">
                        <span class="badge bg-info text-dark">${item.model}</span>
                        <span class="text-secondary small">S/N: ${item.sn}</span>
                    </div>
                    <div class="small text-muted mb-2">Engineer: ${item.engineer || 'ไม่ระบุ'}</div>
                    
                    <label class="small fw-bold">Windows Version:</label>
                    <select class="form-select" onchange="updateWindows(${item.rowNumber}, this)">
                        <option value="">-- เลือก --</option>
                        ${optionsHtml}
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
    
    // 1. เริ่มบันทึก: แสดงสถานะ Loading (สีเหลือง)
    selectElement.classList.remove('is-valid', 'is-invalid'); // ล้างสถานะเก่า
    selectElement.style.backgroundColor = "#fff3cd"; // สีเหลืองอ่อน
    selectElement.disabled = true;

    try {
        // ใช้ fetch แบบปกติ (ไม่ใช้ no-cors เพื่อให้เช็ค response ได้แม่นยำขึ้น)
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            body: JSON.stringify({
                rowNumber: rowNumber,
                windowValue: newValue
            })
        });

        // 2. บันทึกสำเร็จ: แสดงสถานะ Success (สีเขียว)
        selectElement.style.backgroundColor = "#d1e7dd"; // สีเขียวอ่อน
        selectElement.style.borderColor = "#198754";
        
        // อัปเดตข้อมูลในตัวแปร allData ด้วย เพื่อให้เวลากรองใหม่ค่ายังเป็นปัจจุบัน
        const item = allData.find(d => d.rowNumber === rowNumber);
        if (item) item.windows = newValue;

    } catch (error) {
        // 3. เกิดข้อผิดพลาด: แสดงสถานะ Error (สีแดง)
        alert('บันทึกไม่สำเร็จ! กรุณาตรวจสอบอินเทอร์เน็ต');
        selectElement.style.backgroundColor = "#f8d7da"; // สีแดงอ่อน
        selectElement.style.borderColor = "#dc3545";
    } finally {
        selectElement.disabled = false;
        // คืนค่าสีพื้นหลังปกติหลังจาก 2 วินาที
        setTimeout(() => {
            selectElement.style.backgroundColor = "";
            selectElement.style.borderColor = "";
        }, 2000);
    }
}

// เริ่มโหลดข้อมูล
fetchData();
