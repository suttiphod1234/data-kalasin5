var sheetName = 'Sheet1'
var scriptProp = PropertiesService.getScriptProperties()
// UPDATED: Folder ID and Sheet ID
var folderId = '1ISsWh0UTfH_F2NrhTIefQzwK7Qe_up0X' 
var sheetId = '1t2rCVoEQatp9FMvjoR0UFUNkWgGP7Y27YTrzHPO8PQ8'

function intialSetup () {
  // Not strictly needed anymore if we hardcode ID, but checking permissions
  var activeSpreadsheet = SpreadsheetApp.openById(sheetId)
}

function doPost (e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var doc = SpreadsheetApp.openById(sheetId)
    var sheet = doc.getSheetByName(sheetName)

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    var nextRow = sheet.getLastRow() + 1
    
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
      if (header === 'timestamp') {
        return new Date()
      }
      // Check for various possible image header names based on user's sheet
      if (header === 'image_url' || header === 'imag' || header === 'image' || header === 'photo') {
        return fileUrl;
      }
      return e.parameter[header]
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
