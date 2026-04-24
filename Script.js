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
        
        setupFilters();
        filterAndRender(); 
        
        status.innerHTML = '';
    } catch (error) {
        console.error(error); 
        status.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function setupFilters() {
    const engFilter = document.getElementById('engineerFilter');
    const searchInput = document.getElementById('searchInput');
    const engineers = [...new Set(allData.map(item => item.engineer))].filter(e => e).sort();
    engFilter.innerHTML = '<option value="">--แสดงทั้งหมด--</option>';
    engineers.forEach(eng => {
        const opt = document.createElement('option');
        opt.value = eng;
        opt.textContent = eng;
        engFilter.appendChild(opt);
    });

    engFilter.addEventListener('change', () => filterAndRender());
    searchInput.addEventListener('input', () => filterAndRender());
}

function filterAndRender() {
    const selectedEngineer = document.getElementById('engineerFilter').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    
    const container = document.getElementById('deviceList');
    container.innerHTML = '';

    const filtered = allData.filter(d => {
        const matchEng = selectedEngineer === "" || d.engineer === selectedEngineer;
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

async function updateWindows(rowNumber, selectElement) {
    const newValue = selectElement.value;

    selectElement.classList.remove('is-valid', 'is-invalid');
    selectElement.style.backgroundColor = "#fff3cd";
    selectElement.disabled = true;

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            body: JSON.stringify({
                rowNumber: rowNumber,
                windowValue: newValue
            })
        });

        selectElement.style.backgroundColor = "#d1e7dd";
        selectElement.style.borderColor = "#198754";

        const item = allData.find(d => d.rowNumber === rowNumber);
        if (item) item.windows = newValue;

    } catch (error) {
        alert('บันทึกไม่สำเร็จ! กรุณาตรวจสอบอินเทอร์เน็ต');
        selectElement.style.backgroundColor = "#f8d7da";
        selectElement.style.borderColor = "#dc3545";
    } finally {
        selectElement.disabled = false;
        setTimeout(() => {
            selectElement.style.backgroundColor = "";
            selectElement.style.borderColor = "";
        }, 2000);
    }
}

fetchData();
