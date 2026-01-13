# คู่มือการติดตั้งระบบเก็บข้อมูลแกนนำหมู่บ้าน

โปรเจกต์นี้เป็นหน้าเว็บสำหรับเก็บข้อมูลและส่งตรงไปยัง Google Sheets ฟรี ไม่ต้องมีเซิร์ฟเวอร์

## ขั้นตอนที่ 1: เตรียม Google Sheet
1. ไปที่ [Google Sheets](https://docs.google.com/spreadsheets/) สร้างชีทใหม่
2. ตั้งชื่อ Tab (ด้านล่าง) ว่า `Sheet1` (หรือชื่ออะไรก็ได้แต่ต้องจำไว้)
3. ในแถวแรก (Row 1) ให้สร้างหัวตารางตามนี้ (ลำดับสำคัญ):
   - A1: `timestamp` (เวลาที่บันทึก)
   - B1: `leader_id` (รหัสแกนนำ)
   - C1: `district` (อำเภอ)
   - D1: `sub_district` (ตำบล)
   - E1: `village_moo` (หมู่บ้าน)
   - F1: `house_number` (บ้านเลขที่)
   - G1: `fullname` (ชื่อ - สกุล)
   - H1: `voters_count` (ผู้มาใช้สิทธิ์)

## ขั้นตอนที่ 2: สร้าง Google Apps Script
1. ใน Google Sheet ให้กดที่เมนู **Extensions (ส่วนขยาย)** > **Apps Script**
2. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้ลงไป:

```javascript
var sheetName = 'Sheet1'
var scriptProp = PropertiesService.getScriptProperties()

function intialSetup () {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  scriptProp.setProperty('key', activeSpreadsheet.getId())
}

function doPost (e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var doc = SpreadsheetApp.openById(scriptProp.getProperty('key'))
    var sheet = doc.getSheetByName(sheetName)

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    var nextRow = sheet.getLastRow() + 1

    var newRow = headers.map(function(header) {
      if (header === 'timestamp') {
        return new Date()
      }
      return e.parameter[header]
    })

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow])

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  finally {
    lock.releaseLock()
  }
}
```

3. กด Save (รูปแผ่นดิสก์) ตั้งชื่อโปรเจกต์ว่า "Data Collection"
4. กด Run ฟังก์ชัน `intialSetup` (เลือกจาก drop-down) หนึ่งครั้ง 
   - ระบบจะขอสิทธิ์เข้าถึง (Review permissions) -> เลือกบัญชี -> Advanced -> Go to ... (unsafe) -> Allow

## ขั้นตอนที่ 3: Deploy (เผยแพร่)
1. กดปุ่ม **Deploy** สีน้ำเงินขวาบน > **New deployment**
2. ตรง "Select type" เลือก **Web app**
3. ตั้งค่าดังนี้:
   - Description: อะไรก็ได้
   - Execute as: **Me**
   - Who has access: **Anyone** (สำคัญมาก! ต้องเลือกอันนี้เพื่อให้ใครก็ได้ส่งข้อมูลได้)
4. กด Deploy
5. **Copy URL** ที่ได้มา (Web app URL)

## ขั้นตอนที่ 4: เชื่อมต่อกับหน้าเว็บ
1. กลับมาที่ไฟล์ `script.js` ในโฟลเดอร์งานนี้
2. แก้ไขบรรทัดที่ 2:
   ```javascript
   const scriptURL = 'เอา URL ที่ Copy มาวางตรงนี้';
   ```
3. บันทึกไฟล์

## ขั้นตอนที่ 5: อัปโหลดขึ้น GitHub (เพื่อให้ใช้งานได้จริง)
1. อัปโหลดไฟล์ทั้งหมดขึ้น GitHub Repository
2. ไปที่ Settings > Pages
3. เลือก Source เป็น `main` branch
4. รอสักครู่ จะได้ Link เว็บไซต์ไว้ส่งให้แกนนำใช้งานได้เลย
