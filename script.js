// IMPORTANT: Replace this URL with your own Google Apps Script Web App URL after deploying
const scriptURL = 'https://script.google.com/macros/s/AKfycbwqbfw62KXxbTKmn9HD8fjUV6_BqpjcEtt65U8usFLNY6q37dzn8GN0AcemZrb2Gp3s0Q/exec';

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
    console.log("Line Browser detected");
}


// --- NATIVE CAMERA LOGIC START ---

openCameraBtn.addEventListener('click', () => {
    cameraInput.click(); // Trigger the native file picker/camera
});

cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processAndCompressImage(file);
    }
});

retakeBtn.addEventListener('click', () => {
    cameraInput.value = ''; // Reset input
    cameraInput.click(); // Trigger again
});

function processAndCompressImage(file) {
    fileStatus.textContent = 'กำลังประมวลผลรูปภาพ (บีบอัดให้เหลือ 1MB)...';
    openCameraBtn.disabled = true;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if too big (Max 1600px width/height is plenty for ID card)
            const MAX_SIZE = 1600;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to ~1MB
            // Start at 0.8 quality, reduce if needed
            let quality = 0.8;

            function tryCompress(q) {
                canvas.toBlob((blob) => {
                    if (blob.size > 1024 * 1024 && q > 0.1) {
                        // Still too big (>1MB), try lower quality
                        tryCompress(q - 0.1);
                    } else {
                        // Good size or quality too low
                        currentFile = new File([blob], "id_card_compressed.jpg", { type: "image/jpeg" });

                        // Show Preview
                        previewImage.src = URL.createObjectURL(currentFile);
                        previewContainer.style.display = 'block';
                        openCameraBtn.style.display = 'none'; // Hide main button
                        fileStatus.textContent = `รูปภาพพร้อมใช้งาน (${(currentFile.size / 1024 / 1024).toFixed(2)} MB)`;
                        openCameraBtn.disabled = false;
                    }
                }, 'image/jpeg', q);
            }

            tryCompress(quality);
        };
    };
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
        openCameraBtn.style.display = 'flex'; // Show button again
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
        // Optional: If you WANT to force an image, check here
        // if (!currentFile) { alert('กรุณาถ่ายรูปบัตรประชาชน'); ... return; }

        sendData(jsonFormData);
    }
});

function sendData(formData) {
    fetch(scriptURL, { method: 'POST', body: formData })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (data.result === 'success') {
                console.log('Success!', data);
                openModal();
                form.reset();

                // Reset Preview
                currentFile = null;
                cameraInput.value = '';
                previewContainer.style.display = 'none';
                openCameraBtn.style.display = 'flex';
                fileStatus.textContent = '';
            } else {
                console.error('Script Error:', data.error);
                alert('เกิดข้อผิดพลาดจากระบบ: ' + data.error);
                statusMsg.textContent = 'บันทึกไม่สำเร็จ: ' + data.error;
                statusMsg.classList.add('status-error');
            }
        })
        .catch(error => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            console.error('Error!', error.message);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
            statusMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
            statusMsg.classList.add('status-error');
        });
}
