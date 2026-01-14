// ========================================
// Google Apps Script for Form Data Collection
// ========================================

var sheetName = 'Sheet1'
var scriptProp = PropertiesService.getScriptProperties()

// IMPORTANT: Update these IDs with your own
var folderId = '1ISsWh0UTfH_F2NrhTIefQzwK7Qe_up0X'  // Google Drive Folder ID
var sheetId = '1t2rCVoEQatp9FMvjoR0UFUNkWgGP7Y27YTrzHPO8PQ8'  // Google Sheet ID

// Define all expected headers (must match form field names)
var expectedHeaders = [
  'timestamp',
  'leader_id',
  'national_id',
  'district',
  'sub_district',
  'village_moo',
  'house_number',
  'fullname',
  'voters_count',
  'image_url'
];

// ========================================
// Initial Setup Function
// Run this once to create headers
// ========================================
function intialSetup() {
  try {
    var doc = SpreadsheetApp.openById(sheetId)
    var sheet = doc.getSheets()[0]
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders])
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold')
      sheet.getRange(1, 1, 1, expectedHeaders.length).setBackground('#4a5568')
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontColor('#ffffff')
      sheet.setFrozenRows(1)
      Logger.log('Headers created successfully')
    } else {
      Logger.log('Headers already exist')
    }
  } catch (error) {
    Logger.log('Error in intialSetup: ' + error.toString())
  }
}

// ========================================
// Main POST Handler
// ========================================
function doPost(e) {
  var lock = LockService.getScriptLock()
  
  try {
    lock.tryLock(10000)
    
    if (!lock.hasLock()) {
      return createResponse('error', 'ไม่สามารถล็อคการทำงานได้ กรุณาลองใหม่อีกครั้ง')
    }
    
    var doc = SpreadsheetApp.openById(sheetId)
    var sheet = doc.getSheets()[0]
    
    // Ensure headers exist
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders])
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold')
      sheet.setFrozenRows(1)
    }
    
    // Get headers
    var lastCol = Math.max(sheet.getLastColumn(), expectedHeaders.length)
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return h.toString().toLowerCase().trim();
    });
    
    var nextRow = sheet.getLastRow() + 1
    
    // Check for duplicate national_id (เลขบัตรประชาชน)
    var nationalIdColumnIndex = headers.indexOf('national_id');
    if (nationalIdColumnIndex !== -1 && e.parameter.national_id && sheet.getLastRow() > 1) {
      var existingData = sheet.getRange(2, nationalIdColumnIndex + 1, sheet.getLastRow() - 1, 1).getValues();
      var isDuplicate = existingData.some(function(row) {
        return row[0] && row[0].toString().trim() === e.parameter.national_id.toString().trim();
      });
      
      if (isDuplicate) {
        return createResponse('error', 'เลขบัตรประชาชน "' + e.parameter.national_id + '" มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูล')
      }
    }
    
    // Handle image upload
    var fileUrl = '';
    if (e.parameter.fileData && e.parameter.fileName) {
      try {
        var folder = DriveApp.getFolderById(folderId);
        var contentType = e.parameter.mimeType || 'image/jpeg';
        var blob = Utilities.newBlob(Utilities.base64Decode(e.parameter.fileData), contentType, e.parameter.fileName);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } catch (error) {
        Logger.log('Error uploading image: ' + error.toString())
        // Continue without image if upload fails
      }
    }
    
    // Build new row data
    var newRow = headers.map(function(header) {
      if (header === 'timestamp') {
        return new Date()
      }
      
      if (['image_url', 'imag', 'image', 'photo', 'img'].includes(header)) {
        return fileUrl;
      }
      
      // Match form parameters
      return e.parameter[header] || e.parameter[header.replace('_', ' ')] || '';
    })
    
    // Write to sheet
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow])
    
    return createResponse('success', 'บันทึกข้อมูลสำเร็จ', {
      row: nextRow,
      fileUrl: fileUrl
    })
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString())
    return createResponse('error', 'เกิดข้อผิดพลาด: ' + error.toString())
    
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock()
    }
  }
}

// ========================================
// Helper Function: Create JSON Response
// ========================================
function createResponse(result, message, data) {
  var response = {
    'result': result,
    'message': message
  }
  
  if (result === 'error') {
    response.error = message
  }
  
  if (data) {
    for (var key in data) {
      response[key] = data[key]
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
}

// ========================================
// Test Function
// ========================================
function testDoPost() {
  var testData = {
    parameter: {
      leader_id: 'TEST001',
      national_id: '1234567890123',
      district: 'อำเภอทดสอบ',
      sub_district: 'ตำบลทดสอบ',
      village_moo: '1',
      house_number: '123',
      fullname: 'ทดสอบ ระบบ',
      voters_count: '5'
    }
  }
  
  var result = doPost(testData)
  Logger.log(result.getContent())
}
