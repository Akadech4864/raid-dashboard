/**
 * Raid Dashboard API - Google Apps Script Backend
 * รองรับการดึงข้อมูลและบันทึกข้อมูลลง Google Sheets
 */

// CORS Headers สำหรับอนุญาตการเรียก API จาก GitHub Pages
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// จัดการ OPTIONS request (CORS preflight)
function doOptions(e) {
  return ContentService.createTextOutput()
    .setHeaders(getCorsHeaders());
}

// GET Request - ดึงข้อมูลทั้งหมดจากทุก Sheets
function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // อ่านข้อมูลจากแต่ละ Sheet
    const sites = getSheetData(spreadsheet, 'sites');
    const persons = getSheetData(spreadsheet, 'persons');
    const seized = getSheetData(spreadsheet, 'seized');
    const logs = getSheetData(spreadsheet, 'logs');
    
    // จัดรูปแบบข้อมูลให้ตรงกับโครงสร้าง Frontend
    const formattedSites = sites.map(site => ({
      id: site.id || '',
      name: site.name || '',
      alias: site.alias || '',
      address: site.address || '',
      lat: parseFloat(site.lat) || 0,
      lng: parseFloat(site.lng) || 0,
      status: site.status || 'planned',
      commander: site.commander || '',
      team: site.team || '',
      contact: site.contact || '',
      startTime: site.startTime || '',
      objective: site.objective || '',
      intel: site.intel || '',
      risk: site.risk || '',
      lastUpdate: parseInt(site.lastUpdate) || Date.now(),
      seized: seized.filter(s => s.siteId === site.id).map(s => ({
        id: s.id,
        name: s.name,
        qty: parseInt(s.qty) || 1,
        unit: s.unit || 'ชิ้น',
        note: s.note || '',
        ts: parseInt(s.ts) || Date.now()
      })),
      logs: logs.filter(l => l.siteId === site.id).map(l => ({
        id: l.id,
        text: l.text || '',
        author: l.author || '',
        priority: l.priority || 'info',
        ts: parseInt(l.ts) || Date.now()
      })),
      persons: persons.filter(p => p.siteId === site.id).map(p => ({
        id: p.id,
        name: p.name || '',
        nationality: p.nationality || '',
        idCard: p.idCard || '',
        role: p.role || '',
        note: p.note || '',
        ts: parseInt(p.ts) || Date.now()
      }))
    }));
    
    const response = {
      success: true,
      data: {
        sites: formattedSites,
        lastSync: Date.now()
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setHeaders(getCorsHeaders());
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setHeaders(getCorsHeaders());
  }
}

// POST Request - บันทึกข้อมูลทั้งหมดลง Sheets
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const { sites } = params;
    
    if (!sites || !Array.isArray(sites)) {
      throw new Error('Invalid data format');
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // เคลียร์ข้อมูลเก่าและบันทึกข้อมูลใหม่
    saveSites(spreadsheet, sites);
    savePersons(spreadsheet, sites);
    saveSeized(spreadsheet, sites);
    saveLogs(spreadsheet, sites);
    
    const response = {
      success: true,
      message: 'Data saved successfully',
      timestamp: Date.now()
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setHeaders(getCorsHeaders());
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setHeaders(getCorsHeaders());
  }
}

// ฟังก์ชันช่วยเหลือ: อ่านข้อมูลจาก Sheet
function getSheetData(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // ไม่มีข้อมูล (แถวแรกเป็น header)
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? row[index] : '';
    });
    return obj;
  });
}

// บันทึกข้อมูล Sites
function saveSites(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('sites');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('sites');
    sheet.appendRow(['id', 'name', 'alias', 'address', 'lat', 'lng', 'status', 'commander', 'team', 'contact', 'startTime', 'objective', 'intel', 'risk', 'lastUpdate']);
  }
  
  // เคลียร์ข้อมูลเก่า (ยกเว้น header)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // เขียนข้อมูลใหม่
  sites.forEach(site => {
    sheet.appendRow([
      site.id,
      site.name,
      site.alias,
      site.address,
      site.lat,
      site.lng,
      site.status,
      site.commander,
      site.team,
      site.contact,
      site.startTime,
      site.objective,
      site.intel,
      site.risk || '',
      site.lastUpdate
    ]);
  });
}

// บันทึกข้อมูล Persons
function savePersons(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('persons');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('persons');
    sheet.appendRow(['id', 'siteId', 'name', 'nationality', 'idCard', 'role', 'note', 'ts']);
  }
  
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  sites.forEach(site => {
    (site.persons || []).forEach(person => {
      sheet.appendRow([
        person.id,
        site.id,
        person.name,
        person.nationality,
        person.idCard,
        person.role,
        person.note,
        person.ts
      ]);
    });
  });
}

// บันทึกข้อมูล Seized
function saveSeized(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('seized');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('seized');
    sheet.appendRow(['id', 'siteId', 'name', 'qty', 'unit', 'note', 'ts']);
  }
  
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  sites.forEach(site => {
    (site.seized || []).forEach(item => {
      sheet.appendRow([
        item.id,
        site.id,
        item.name,
        item.qty,
        item.unit,
        item.note,
        item.ts
      ]);
    });
  });
}

// บันทึกข้อมูล Logs
function saveLogs(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('logs');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('logs');
    sheet.appendRow(['id', 'siteId', 'text', 'author', 'priority', 'ts']);
  }
  
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  sites.forEach(site => {
    (site.logs || []).forEach(log => {
      sheet.appendRow([
        log.id,
        site.id,
        log.text,
        log.author,
        log.priority,
        log.ts
      ]);
    });
  });
}

// ฟังก์ชันเริ่มต้น: สร้าง Sheet ตัวอย่างถ้ายังไม่มี
function initializeSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ['sites', 'persons', 'seized', 'logs'];
  
  sheetNames.forEach(name => {
    if (!spreadsheet.getSheetByName(name)) {
      spreadsheet.insertSheet(name);
    }
  });
}
