var sheetName = 'Sheet1'
var scriptProp = PropertiesService.getScriptProperties()
// UPDATED: Folder ID and Sheet ID
var folderId = '1ISsWh0UTfH_F2NrhTIefQzwK7Qe_up0X' 
var sheetId = '1t2rCVoEQatp9FMvjoR0UFUNkWgGP7Y27YTrzHPO8PQ8'

// Define all expected headers
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

function intialSetup () {
  var doc = SpreadsheetApp.openById(sheetId)
  var sheet = doc.getSheets()[0]
  
  // Check if headers exist, if not create them
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders])
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }
}

function doPost (e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var doc = SpreadsheetApp.openById(sheetId)
    var sheet = doc.getSheets()[0]
    
    // Check if sheet is empty and create headers
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders])
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold')
      sheet.setFrozenRows(1)
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
      return h.toString().toLowerCase().trim();
    });
    
    var nextRow = sheet.getLastRow() + 1
    
    // DUPLICATE CHECK - Check if leader_id already exists
    var leaderIdColumnIndex = headers.indexOf('leader_id');
    if (leaderIdColumnIndex !== -1 && e.parameter.leader_id && sheet.getLastRow() > 1) {
      var existingData = sheet.getRange(2, leaderIdColumnIndex + 1, sheet.getLastRow() - 1, 1).getValues();
      var isDuplicate = existingData.some(function(row) {
        return row[0] && row[0].toString().trim() === e.parameter.leader_id.toString().trim();
      });
      
      if (isDuplicate) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            'result': 'error', 
            'error': 'รหัสแกนนำ "' + e.parameter.leader_id + '" มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูล' 
          }))
          .setMimeType(ContentService.MimeType.JSON)
      }
    }
    
    // IMAGE UPLOAD LOGIC
    var fileUrl = '';
    if (e.parameter.fileData && e.parameter.fileName) {
       var folder = DriveApp.getFolderById(folderId);
       var contentType = e.parameter.mimeType || 'image/jpeg';
       var blob = Utilities.newBlob(Utilities.base64Decode(e.parameter.fileData), contentType, e.parameter.fileName);
       var file = folder.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       fileUrl = file.getUrl();
    }

    var newRow = headers.map(function(header) {
      // Logic to match headers (case insensitive)
      if (header === 'timestamp') return new Date()
      
      // Match image column
      if (['image_url', 'imag', 'image', 'photo', 'img'].includes(header)) return fileUrl;
      
      // Match other columns
      return e.parameter[header] || e.parameter[header.replace('_', ' ')] || '';
    })

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow])

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow, 'fileUrl': fileUrl }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  finally {
    lock.releaseLock()
  }
}
