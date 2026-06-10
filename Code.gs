/**
 * Raid Dashboard API - Google Apps Script Backend
 * รองรับการดึงข้อมูลและบันทึกข้อมูลลง Google Sheets
 * 
 * วิธี Deploy:
 * 1. Deploy > New deployment > Web app
 * 2. Execute as: Me
 * 3. Who has access: Anyone
 */

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
      id: String(site.id || ''),
      name: String(site.name || ''),
      alias: String(site.alias || ''),
      address: String(site.address || ''),
      lat: parseFloat(site.lat) || 0,
      lng: parseFloat(site.lng) || 0,
      status: String(site.status || 'planned'),
      commander: String(site.commander || ''),
      team: String(site.team || ''),
      contact: String(site.contact || ''),
      startTime: String(site.startTime || ''),
      objective: String(site.objective || ''),
      intel: String(site.intel || ''),
      risk: String(site.risk || ''),
      lastUpdate: parseInt(site.lastUpdate) || Date.now(),
      seized: seized.filter(s => String(s.siteId) === String(site.id)).map(s => ({
        id: String(s.id),
        name: String(s.name),
        qty: parseInt(s.qty) || 1,
        unit: String(s.unit || 'ชิ้น'),
        note: String(s.note || ''),
        ts: parseInt(s.ts) || Date.now()
      })),
      logs: logs.filter(l => String(l.siteId) === String(site.id)).map(l => ({
        id: String(l.id),
        text: String(l.text || ''),
        author: String(l.author || ''),
        priority: String(l.priority || 'info'),
        ts: parseInt(l.ts) || Date.now()
      })),
      persons: persons.filter(p => String(p.siteId) === String(site.id)).map(p => ({
        id: String(p.id),
        name: String(p.name || ''),
        nationality: String(p.nationality || ''),
        idCard: String(p.idCard || ''),
        role: String(p.role || ''),
        note: String(p.note || ''),
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
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// POST Request - บันทึกข้อมูลทั้งหมดลง Sheets
function doPost(e) {
  try {
    let params;
    
    // รองรับทั้ง JSON body และ form-encoded parameter
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      params = JSON.parse(e.parameter.payload);
    } else {
      throw new Error('No data received');
    }
    
    const { sites } = params;
    
    if (!sites || !Array.isArray(sites)) {
      throw new Error('Invalid data format: sites must be an array');
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    // บันทึกข้อมูลทั้งหมด
    saveSites(spreadsheet, sites);
    savePersons(spreadsheet, sites);
    saveSeized(spreadsheet, sites);
    saveLogs(spreadsheet, sites);
    
    const response = {
      success: true,
      message: 'Data saved successfully',
      timestamp: Date.now(),
      sitesCount: sites.length
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันช่วยเหลือ: อ่านข้อมูลจาก Sheet
function getSheetData(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // ไม่มีข้อมูล (แถวแรกเป็น header)
  
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);
  
  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined && row[index] !== null ? row[index] : '';
      });
      return obj;
    });
}

// บันทึกข้อมูล Sites (ใช้ setValues แทน appendRow เพื่อความเร็ว)
function saveSites(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('sites');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('sites');
  }
  
  const headers = ['id', 'name', 'alias', 'address', 'lat', 'lng', 'status', 'commander', 'team', 'contact', 'startTime', 'objective', 'intel', 'risk', 'lastUpdate'];
  
  // เคลียร์ทั้ง sheet แล้วเขียนใหม่
  sheet.clear();
  sheet.appendRow(headers);
  
  if (sites.length === 0) return;
  
  const rows = sites.map(site => [
    site.id || '',
    site.name || '',
    site.alias || '',
    site.address || '',
    site.lat || 0,
    site.lng || 0,
    site.status || 'planned',
    site.commander || '',
    site.team || '',
    site.contact || '',
    site.startTime || '',
    site.objective || '',
    site.intel || '',
    site.risk || '',
    site.lastUpdate || Date.now()
  ]);
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

// บันทึกข้อมูล Persons
function savePersons(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('persons');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('persons');
  }
  
  const headers = ['id', 'siteId', 'name', 'nationality', 'idCard', 'role', 'note', 'ts'];
  
  sheet.clear();
  sheet.appendRow(headers);
  
  const rows = [];
  sites.forEach(site => {
    (site.persons || []).forEach(person => {
      rows.push([
        person.id || '',
        site.id || '',
        person.name || '',
        person.nationality || '',
        person.idCard || '',
        person.role || '',
        person.note || '',
        person.ts || Date.now()
      ]);
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// บันทึกข้อมูล Seized
function saveSeized(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('seized');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('seized');
  }
  
  const headers = ['id', 'siteId', 'name', 'qty', 'unit', 'note', 'ts'];
  
  sheet.clear();
  sheet.appendRow(headers);
  
  const rows = [];
  sites.forEach(site => {
    (site.seized || []).forEach(item => {
      rows.push([
        item.id || '',
        site.id || '',
        item.name || '',
        item.qty || 1,
        item.unit || 'ชิ้น',
        item.note || '',
        item.ts || Date.now()
      ]);
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// บันทึกข้อมูล Logs
function saveLogs(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('logs');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('logs');
  }
  
  const headers = ['id', 'siteId', 'text', 'author', 'priority', 'ts'];
  
  sheet.clear();
  sheet.appendRow(headers);
  
  const rows = [];
  sites.forEach(site => {
    (site.logs || []).forEach(log => {
      rows.push([
        log.id || '',
        site.id || '',
        log.text || '',
        log.author || '',
        log.priority || 'info',
        log.ts || Date.now()
      ]);
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// ฟังก์ชันเริ่มต้น: สร้าง Sheets ทั้งหมดพร้อม Headers
function initializeSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsConfig = {
    'sites': ['id', 'name', 'alias', 'address', 'lat', 'lng', 'status', 'commander', 'team', 'contact', 'startTime', 'objective', 'intel', 'risk', 'lastUpdate'],
    'persons': ['id', 'siteId', 'name', 'nationality', 'idCard', 'role', 'note', 'ts'],
    'seized': ['id', 'siteId', 'name', 'qty', 'unit', 'note', 'ts'],
    'logs': ['id', 'siteId', 'text', 'author', 'priority', 'ts']
  };
  
  Object.entries(sheetsConfig).forEach(([name, headers]) => {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.appendRow(headers);
      // จัดรูปแบบ Header
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4a86c8')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
  
  Logger.log('Sheets initialized successfully!');
}

// ทดสอบ: ทดลอง GET ดูข้อมูล
function testGet() {
  const result = doGet({ parameter: {} });
  Logger.log(result.getContent());
}

// ทดสอบ: ทดลอง POST ข้อมูลตัวอย่าง
function testPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        sites: [{
          id: 'TEST1',
          name: 'ทดสอบ',
          alias: 'จุดทดสอบ',
          address: 'ที่อยู่ทดสอบ',
          lat: 13.7563,
          lng: 100.5018,
          status: 'planned',
          commander: '',
          team: '',
          contact: '',
          startTime: '',
          objective: '',
          intel: '',
          risk: '',
          lastUpdate: Date.now(),
          persons: [],
          seized: [],
          logs: []
        }]
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}
