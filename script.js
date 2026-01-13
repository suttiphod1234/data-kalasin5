// IMPORTANT: Replace this URL with your own Google Apps Script Web App URL after deploying
const scriptURL = 'https://script.google.com/macros/s/AKfycbw6MrQqvrnE1XFRru3cJVaNd8L_tiOF-59g7z5vxbXz3Cw7Q-c4EOKNOwe-NRk0D9skyA/exec';

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
const cameraModal = document.getElementById('cameraModal');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const video = document.getElementById('camera-feed');
const canvas = document.getElementById('camera-canvas');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const retakeBtn = document.getElementById('retakeBtn');
const fileStatus = document.getElementById('file-status');

// State
let stream = null;
let currentFacingMode = 'environment'; // Rear camera by default
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
    alert('คำแนะนำ: เพื่อใช้งานกล้องได้สมบูรณ์ กรุณากดที่เมนูมุมขวาบน แล้วเลือก "Open in Browser" (เปิดในเบราว์เซอร์)');
}


// --- CAMERA LOGIC START ---

openCameraBtn.addEventListener('click', () => {
    openCamera();
});

closeCameraBtn.addEventListener('click', () => {
    stopCamera();
    cameraModal.style.display = 'none';
});

switchCameraBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    openCamera();
});

async function openCamera() {
    cameraModal.style.display = 'flex'; // Show modal
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera access denied:", err);
        alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง (หรือลองเปิดใน Safari/Chrome)');
        cameraModal.style.display = 'none';
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

captureBtn.addEventListener('click', () => {
    // 1. Draw video to canvas
    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    // Flip if using front camera to mimic mirror effect (optional)
    if (currentFacingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // 2. Convert to Blob (Image file)
    canvas.toBlob(blob => {
        // Create a File object
        currentFile = new File([blob], "id_card_" + Date.now() + ".jpg", { type: "image/jpeg" });

        // Show Preview
        const url = URL.createObjectURL(blob);
        previewImage.src = url;
        previewContainer.style.display = 'block';

        // Hide Camera Button / Show Retake
        openCameraBtn.style.display = 'none';
        fileStatus.textContent = 'บันทึกภาพแล้ว พร้อมอัปโหลด';

        // Close Camera Modal
        stopCamera();
        cameraModal.style.display = 'none';

    }, 'image/jpeg', 0.85); // 85% quality
});

retakeBtn.addEventListener('click', () => {
    currentFile = null;
    previewContainer.style.display = 'none';
    openCameraBtn.style.display = 'flex'; // Enable button to open camera again
    fileStatus.textContent = '';
    openCamera(); // Re-open instantly
});

// --- CAMERA LOGIC END ---


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
