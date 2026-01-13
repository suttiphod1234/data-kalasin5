// IMPORTANT: Replace this URL with your own Google Apps Script Web App URL after deploying
const scriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

const form = document.forms['submit-to-google-sheet'];
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('status-message');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addDataBtn = document.getElementById('addDataBtn');
const districtSelect = document.getElementById('district');
const subDistrictSelect = document.getElementById('sub_district');

// OCR Elements
const scanBtn = document.getElementById('scanBtn');
const idCardInput = document.getElementById('idCardInput');
const ocrStatus = document.getElementById('ocr-status');
const ocrMessage = document.getElementById('ocr-message');
const ocrProgress = document.getElementById('ocr-progress');


// Data for Dropdowns
const locationData = {
    "อำเภอห้วยผึ้ง": ["ตำบลคำบง", "ตำบลไค้นุ่น", "ตำบลนิคมห้วยผึ้ง", "ตำบลหนองอีบุตร"],
    "อำเภอนามน": ["ตำบลนามน", "ตำบลหลักเหลี่ยม", "ตำบลสงเปลือย", "ตำบลหนองบัว"],
    "อำเภอดอนจาน": ["ตำบลดอนจาน", "ตำบลดงพยุง", "ตำบลนาจำปา", "ตำบลสะอาดไชยศรี", "ตำบลม่วงนา"],
    "อำเภอร่องคำ": ["ตำบลร่องคำ", "ตำบลเหล่าอ้อย", "ตำบลสามัคคี"],
    "อำเภอกมลาไสย": ["ตำบลกมลาไสย", "ตำบลหลักเมือง", "ตำบลโพนงาม", "ตำบลดงลิง", "ตำบลธัญญา", "ตำบลหนองแปน", "ตำบลเจ้าท่า", "ตำบลโคกสมบูรณ์"]
};

// Initialize District Dropdown
function initDropdowns() {
    for (let district in locationData) {
        let option = document.createElement("option");
        option.value = district;
        option.text = district;
        districtSelect.add(option);
    }
}

// Handle District Change
districtSelect.addEventListener('change', function () {
    const selectedDistrict = this.value;
    const subDistricts = locationData[selectedDistrict];

    // Reset Sub-district dropdown
    subDistrictSelect.innerHTML = '<option value="" disabled selected>เลือกตำบล</option>';
    subDistrictSelect.disabled = false;

    if (subDistricts) {
        subDistricts.forEach(function (subDistrict) {
            let option = document.createElement("option");
            option.value = subDistrict;
            option.text = subDistrict;
            subDistrictSelect.add(option);
        });
    } else {
        subDistrictSelect.disabled = true;
    }
});

// Initialize on load
initDropdowns();


// --- OCR LOGIC START ---

scanBtn.addEventListener('click', () => {
    idCardInput.click();
});

idCardInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show Progress
    ocrStatus.style.display = 'block';
    ocrMessage.innerText = 'กำลังโหลด AI และประมวลผล...';
    scanBtn.disabled = true;

    try {
        const worker = await Tesseract.createWorker('tha', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const percent = Math.floor(m.progress * 100);
                    ocrMessage.innerText = `กำลังอ่านข้อความ... ${percent}%`;
                    ocrProgress.style.width = `${percent}%`;
                }
            }
        });

        const ret = await worker.recognize(file);
        const text = ret.data.text;

        console.log('OCR Result:', text);
        await worker.terminate();

        // Process Text
        processOCRText(text);

        // Hide Progress & Reset
        ocrStatus.style.display = 'none';
        scanBtn.disabled = false;
        idCardInput.value = ''; // Reset input
        ocrProgress.style.width = '0%';
        alert('อ่านข้อมูลเรียบร้อย! โปรดตรวจสอบความถูกต้องอีกครั้ง');

    } catch (error) {
        console.error(error);
        ocrStatus.style.display = 'none';
        scanBtn.disabled = false;
        alert('เกิดข้อผิดพลาดในการอ่านบัตร กรุณาลองใหม่ หรือกรอกด้วยตนเอง');
    }
});

function processOCRText(text) {
    const lines = text.split('\n');
    let foundName = false;
    let foundAddress = false;

    // Regex Patterns (Simple heuristic)
    const nameRegex = /(?:ชื่อตัวและชื่อสกุล|Name|Last name)\s*(?:นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)\s*([ก-๙]+)\s+([ก-๙]+)/;
    const simpleNameRegex = /(?:นาย|นาง|นางสาว)\s*([ก-๙]+)\s+([ก-๙]+)/; // Fallback

    // Address Parsing is tricky because spacing varies. 
    // We look for key markers: House No, Moo, Tumbol, Amphoe
    // Example: 123/45 หมู่ที่ 1 ต.หาดนาค อ.ชัยภูมิ

    lines.forEach(line => {
        line = line.trim();
        if (line.length < 5) return;

        // 1. Identification Number (Leader ID - usually not ID card number but let's see if user wants to map it. 
        // User asked for "Code", not ID card num. So skip for now unless requested).

        // 2. Name
        if (!foundName) {
            let nameMatch = line.match(nameRegex);
            if (!nameMatch) nameMatch = line.match(simpleNameRegex);

            if (nameMatch) {
                // If it captured prefix "นาย", we might want to include it or just name. 
                // Let's capture the full string including prefix if possible or just combine parts.
                // The regex above captures (Name) (Surname). 
                // Let's reconstruct consistent logic:
                // Find index of prefix, then take everything after.

                const prefixIndex = line.search(/(นาย|นาง|นางสาว)/);
                if (prefixIndex !== -1) {
                    const fullName = line.substring(prefixIndex).replace(/[^ก-๙\s]/g, '').trim();
                    document.getElementById('fullname').value = fullName;
                    foundName = true;
                }
            }
        }

        // 3. Address
        // Look for typical address patterns.
        // House No: often starts the line or appears before 'หมู่'
        if (!foundAddress && (line.includes('หมู่') || line.includes('ต.') || line.includes('อ.') || line.includes('ตำบล') || line.includes('อำเภอ'))) {
            // Try to extract House No
            const houseMatch = line.match(/(\d+\/?\d*)\s*(?:หมู่|ม\.)/);
            if (houseMatch) {
                document.getElementById('house_number').value = houseMatch[1];
            }

            // Try to extract Village No (Moo)
            const mooMatch = line.match(/(?:หมู่ที่|หมู่|ม\.)\s*(\d+)/);
            if (mooMatch) {
                document.getElementById('village_moo').value = mooMatch[1];
            }

            // Try to find District (Amphoe)
            // We check against our known list first for better accuracy
            for (let district in locationData) {
                // Check full name or short name (e.g. อำเภอห้วยผึ้ง OR ห้วยผึ้ง)
                const shortDistrict = district.replace('อำเภอ', '');
                if (line.includes(district) || line.includes(shortDistrict)) {
                    districtSelect.value = district;

                    // Trigger change event to load sub-districts
                    districtSelect.dispatchEvent(new Event('change'));

                    // Now look for sub-district in the updated options
                    const subDistricts = locationData[district];
                    for (let sub of subDistricts) {
                        const shortSub = sub.replace('ตำบล', '');
                        if (line.includes(sub) || line.includes(shortSub)) {
                            subDistrictSelect.value = sub;
                            break;
                        }
                    }
                    foundAddress = true; // Assume address line processed
                    break;
                }
            }
        }
    });
}

// --- OCR LOGIC END ---


// Function to open modal
function openModal() {
    successModal.style.display = 'flex';
    // Small delay to allow display flex to apply before adding opacity class for transition
    setTimeout(() => {
        successModal.classList.add('show');
    }, 10);
}

// Function to close modal
function closeModal() {
    successModal.classList.remove('show');
    setTimeout(() => {
        successModal.style.display = 'none';

        // Reset subdistrict dropdown to disabled state when form resets
        subDistrictSelect.innerHTML = '<option value="" disabled selected>กรุณาเลือกอำเภอก่อน</option>';
        subDistrictSelect.disabled = true;
    }, 300); // Wait for transition
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
}

if (addDataBtn) {
    addDataBtn.addEventListener('click', closeModal);
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target == successModal) {
        closeModal();
    }
});

form.addEventListener('submit', e => {
    e.preventDefault();

    // Basic Validation Check
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (scriptURL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        alert('กรุณาตั้งค่า Google Apps Script URL ในไฟล์ script.js ก่อนใช้งาน');
        return;
    }

    // Show Loading State
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    statusMsg.textContent = '';
    statusMsg.className = 'status-message';

    fetch(scriptURL, { method: 'POST', body: new FormData(form) })
        .then(response => {
            // Reset Loading State
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            console.log('Success!', response);

            // Show Success Modal
            openModal();

            // Clear form
            form.reset();
        })
        .catch(error => {
            // Reset Loading State
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            console.error('Error!', error.message);
            statusMsg.textContent = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง';
            statusMsg.classList.add('status-error');
        });
});
