// IMPORTANT: Replace this URL with your own Google Apps Script Web App URL after deploying
const scriptURL = 'https://script.google.com/macros/s/AKfycbzeNgdCuInDob9xmZ_mMCCYWEDunhgfRQLC0T99_TUYaVbOBgDdd0FHAKWpGJb2Y8hM9w/exec';

const form = document.forms['submit-to-google-sheet'];
const submitBtn = document.getElementById('submitBtn');
const statusMsg = document.getElementById('status-message');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addDataBtn = document.getElementById('addDataBtn');
const districtSelect = document.getElementById('district');
const subDistrictSelect = document.getElementById('sub_district');

// Camera Elements
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraInput = document.getElementById('cameraInput'); // Hidden input
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const retakeBtn = document.getElementById('retakeBtn');
const fileStatus = document.getElementById('file-status');

// State
let currentFile = null;

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


// --- LINE BROWSER DETECTION ---
if (navigator.userAgent.match(/Line/i)) {
    // Note: Native file input usually handles this better, but warning is still good
    console.log("Line Browser detected");
}


// --- NATIVE CAMERA LOGIC START ---

openCameraBtn.addEventListener('click', () => {
    cameraInput.click(); // Trigger the native file picker/camera
});

cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

retakeBtn.addEventListener('click', () => {
    cameraInput.value = ''; // Reset input
    cameraInput.click(); // Trigger again
});

function handleFileSelect(file) {
    currentFile = file;

    // Show Preview
    const reader = new FileReader();
    reader.onload = function (e) {
        previewImage.src = e.target.result;
        previewContainer.style.display = 'block';
        openCameraBtn.style.display = 'none'; // Hide main button
        fileStatus.textContent = 'บันทึกภาพแล้ว พร้อมอัปโหลด';
    };
    reader.readAsDataURL(file);
}

// --- NATIVE CAMERA LOGIC END ---


// Modal Logic
function openModal() {
    successModal.style.display = 'flex';
    setTimeout(() => {
        successModal.classList.add('show');
    }, 10);
}

function closeModal() {
    successModal.classList.remove('show');
    setTimeout(() => {
        successModal.style.display = 'none';
        subDistrictSelect.innerHTML = '<option value="" disabled selected>กรุณาเลือกอำเภอก่อน</option>';
        subDistrictSelect.disabled = true;

        // Reset Camera UI
        currentFile = null;
        cameraInput.value = '';
        previewContainer.style.display = 'none';
        openCameraBtn.style.display = 'flex';
        fileStatus.textContent = '';
    }, 300);
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (addDataBtn) addDataBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target == successModal) closeModal();
});


// Form Submission
form.addEventListener('submit', e => {
    e.preventDefault();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    statusMsg.textContent = 'กำลังบันทึกข้อมูลและอัปโหลดรูปภาพ...';
    statusMsg.className = 'status-message';

    const jsonFormData = new FormData(form);

    if (currentFile) {
        if (currentFile.size > 5 * 1024 * 1024) {
            alert('ไฟล์รูปภาพมีขนาดใหญ่เกินไป (ต้องไม่เกิน 5MB)');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(currentFile);
        reader.onload = function () {
            const base64Data = reader.result.split(',')[1];
            jsonFormData.append('fileData', base64Data);
            jsonFormData.append('mimeType', currentFile.type);
            jsonFormData.append('fileName', currentFile.name);
            sendData(jsonFormData);
        };
        reader.onerror = function (error) {
            console.error('Error reading file:', error);
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        };
    } else {
        sendData(jsonFormData);
    }
});

function sendData(formData) {
    fetch(scriptURL, { method: 'POST', body: formData })
        .then(response => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            console.log('Success!', response);
            openModal();
            form.reset();
        })
        .catch(error => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            console.error('Error!', error.message);
            statusMsg.textContent = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง';
            statusMsg.classList.add('status-error');
        });
}
