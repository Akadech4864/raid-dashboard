/**
 * Raid Dashboard - Google Apps Script Backend (เวอร์ชันสะอาด 100%)
 */

// เปิด Spreadsheet ด้วย ID จริงของสเปรดชีต
function getSpreadsheet() {
  return SpreadsheetApp.openById('1drbC0MwjUcKMYaTPEU_wwc8Hec4yuriBDKZf09LaQcA');
}

// เสิร์ฟหน้าเว็บหลักแบบตรงไปตรงมา
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Raid Dashboard - ศูนย์บัญชาการปฏิบัติการ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ดึงข้อมูลทั้งหมดส่งให้หน้าเว็บ
function getData() {
  const spreadsheet = getSpreadsheet();
  const sites = getSheetData(spreadsheet, 'sites');
  const persons = getSheetData(spreadsheet, 'persons');
  const seized = getSheetData(spreadsheet, 'seized');
  const logs = getSheetData(spreadsheet, 'logs');
  const targets = getSheetData(spreadsheet, 'targets');

  return sites.map(site => ({
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
      id: s.id, name: s.name, qty: parseInt(s.qty) || 1,
      unit: s.unit || 'ชิ้น', note: s.note || '', ts: parseInt(s.ts) || Date.now()
    })),
    logs: logs.filter(l => l.siteId === site.id).map(l => ({
      id: l.id, text: l.text || '', author: l.author || '',
      priority: l.priority || 'info', ts: parseInt(l.ts) || Date.now()
    })),
    persons: persons.filter(p => p.siteId === site.id).map(p => ({
      id: p.id, name: p.name || '', nationality: p.nationality || '',
      idCard: p.idCard || '', role: p.role || '', note: p.note || '',
      ts: parseInt(p.ts) || Date.now()
    })),
    targets: targets.filter(t => t.siteId === site.id || !t.siteId || t.siteId === '').map(t => ({
      id: t.id || '', name: t.name || '', nationality: t.nationality || '',
      idCard: t.idCard || '', role: t.role || '', note: t.note || ''
    }))
  }));
}

// บันทึกข้อมูลกลับลง Sheets
function saveData(sites) {
  if (!sites || !Array.isArray(sites)) throw new Error('Invalid data');
  const spreadsheet = getSpreadsheet();
  saveSites(spreadsheet, sites);
  savePersons(spreadsheet, sites);
  saveSeized(spreadsheet, sites);
  saveLogs(spreadsheet, sites);
  return { success: true, timestamp: Date.now() };
}

// อ่านข้อมูลจากแต่ละชีต
function getSheetData(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
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

function saveSites(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('sites') || spreadsheet.insertSheet('sites');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  // Create map of existing data by ID
  const existingMap = new Map();
  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIndex];
    if (id) existingMap.set(String(id), i + 1); // +1 for 1-based row index
  }
  
  // Update or append each site
  sites.forEach(site => {
    const siteId = String(site.id);
    const rowIndex = existingMap.get(siteId);
    const rowData = [
      site.id, site.name, site.alias, site.address, site.lat, site.lng,
      site.status, site.commander, site.team, site.contact, site.startTime,
      site.objective, site.intel, site.risk || '', site.lastUpdate
    ];
    if (rowIndex) {
      // Update existing row
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new row
      sheet.appendRow(rowData);
    }
  });
}

function savePersons(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('persons') || spreadsheet.insertSheet('persons');
  
  let headers = ['id', 'siteId', 'name', 'nationality', 'idCard', 'role', 'note', 'ts'];
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length > 0 && existingData[0].length > 0 && existingData[0][0] !== '') {
    headers = existingData[0];
  }
  
  const idIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
  const siteIdIdx = headers.indexOf('siteId') !== -1 ? headers.indexOf('siteId') : 1;
  const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 2;
  const nationalityIdx = headers.indexOf('nationality') !== -1 ? headers.indexOf('nationality') : 3;
  const idCardIdx = headers.indexOf('idCard') !== -1 ? headers.indexOf('idCard') : 4;
  const roleIdx = headers.indexOf('role') !== -1 ? headers.indexOf('role') : 5;
  const noteIdx = headers.indexOf('note') !== -1 ? headers.indexOf('note') : 6;
  const tsIdx = headers.indexOf('ts') !== -1 ? headers.indexOf('ts') : 7;

  const rows = [];
  sites.forEach(site => {
    (site.persons || []).forEach(person => {
      const row = new Array(headers.length).fill('');
      row[idIdx] = person.id;
      row[siteIdIdx] = site.id;
      row[nameIdx] = person.name || '';
      row[nationalityIdx] = person.nationality || '';
      row[idCardIdx] = person.idCard || '';
      row[roleIdx] = person.role || '';
      row[noteIdx] = person.note || '';
      row[tsIdx] = person.ts || Date.now();
      rows.push(row);
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function saveSeized(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('seized') || spreadsheet.insertSheet('seized');
  
  let headers = ['id', 'siteId', 'name', 'qty', 'unit', 'note', 'ts'];
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length > 0 && existingData[0].length > 0 && existingData[0][0] !== '') {
    headers = existingData[0];
  }
  
  const idIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
  const siteIdIdx = headers.indexOf('siteId') !== -1 ? headers.indexOf('siteId') : 1;
  const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 2;
  const qtyIdx = headers.indexOf('qty') !== -1 ? headers.indexOf('qty') : 3;
  const unitIdx = headers.indexOf('unit') !== -1 ? headers.indexOf('unit') : 4;
  const noteIdx = headers.indexOf('note') !== -1 ? headers.indexOf('note') : 5;
  const tsIdx = headers.indexOf('ts') !== -1 ? headers.indexOf('ts') : 6;

  const rows = [];
  sites.forEach(site => {
    (site.seized || []).forEach(item => {
      const row = new Array(headers.length).fill('');
      row[idIdx] = item.id;
      row[siteIdIdx] = site.id;
      row[nameIdx] = item.name || '';
      row[qtyIdx] = item.qty || 1;
      row[unitIdx] = item.unit || 'ชิ้น';
      row[noteIdx] = item.note || '';
      row[tsIdx] = item.ts || Date.now();
      rows.push(row);
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function saveLogs(spreadsheet, sites) {
  let sheet = spreadsheet.getSheetByName('logs') || spreadsheet.insertSheet('logs');
  
  let headers = ['id', 'siteId', 'text', 'author', 'priority', 'ts'];
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length > 0 && existingData[0].length > 0 && existingData[0][0] !== '') {
    headers = existingData[0];
  }
  
  const idIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
  const siteIdIdx = headers.indexOf('siteId') !== -1 ? headers.indexOf('siteId') : 1;
  const textIdx = headers.indexOf('text') !== -1 ? headers.indexOf('text') : 2;
  const authorIdx = headers.indexOf('author') !== -1 ? headers.indexOf('author') : 3;
  const priorityIdx = headers.indexOf('priority') !== -1 ? headers.indexOf('priority') : 4;
  const tsIdx = headers.indexOf('ts') !== -1 ? headers.indexOf('ts') : 5;

  const rows = [];
  sites.forEach(site => {
    (site.logs || []).forEach(log => {
      const row = new Array(headers.length).fill('');
      row[idIdx] = log.id;
      row[siteIdIdx] = site.id;
      row[textIdx] = log.text || '';
      row[authorIdx] = log.author || '';
      row[priorityIdx] = log.priority || 'info';
      row[tsIdx] = log.ts || Date.now();
      rows.push(row);
    });
  });

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function initializeSheets() {
  const spreadsheet = getSpreadsheet();
  ['sites', 'persons', 'seized', 'logs', 'targets'].forEach(name => {
    if (!spreadsheet.getSheetByName(name)) spreadsheet.insertSheet(name);
  });
}

// กู้ข้อมูลจาก JSON string (สำหรับกู้ข้อมูลที่หาย)
function restoreData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.sites || !Array.isArray(data.sites)) {
      throw new Error('Invalid data format');
    }
    const spreadsheet = getSpreadsheet();
    initializeSheets();
    
    // Clear and restore all sheets
    saveSites(spreadsheet, data.sites);
    savePersons(spreadsheet, data.sites);
    saveSeized(spreadsheet, data.sites);
    saveLogs(spreadsheet, data.sites);
    
    return { success: true, message: 'กู้ข้อมูลสำเร็จ!' };
  } catch (e) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}

// นำเข้าข้อมูลเริ่มต้นลงสเปรดชีต

function importInitialData() {
  const spreadsheet = getSpreadsheet();
  initializeSheets();
  const sitesSheet = spreadsheet.getSheetByName('sites');
  if (sitesSheet.getLastRow() > 1) sitesSheet.deleteRows(2, sitesSheet.getLastRow() - 1);
  
  const defaultSites = [
    {
      id: 'P1',
      name: 'บริษัท นาราวี โฮลดิ้ง จำกัด',
      alias: 'จุดที่ 1',
      address: '69/18 ซอยกรุงเทพกรีฑา 15 (ประชาร่วมใจ) แขวงหัวหมาก เขตบางกะปิ กรุงเทพมหานคร',
      lat: 13.756121, lng: 100.692544,
      status: 'planned',
      commander: '', team: '', contact: '', startTime: '', risk: '',
      objective: 'ตรวจค้นเอกสารการถือหุ้น เอกสารทางบัญชี หลักฐานการรับ-โอนเงิน คอมพิวเตอร์ โทรศัพท์ สื่อบันทึกข้อมูลอิเล็กทรอนิกส์',
      intel: 'กรรมการ: นางสาวปิยนุช อ้วนแก้ว, นายคุนทู ฮู (สัญชาติจีน) / เลขทะเบียน 0105566107221 / สงสัยถือหุ้นแทนคนต่างด้าว',
      lastUpdate: Date.now()
    },
    {
      id: 'P2',
      name: 'บริษัท โฮลดิ้ง กู๊ด (ไทยแลนด์) จำกัด',
      alias: 'จุดที่ 2',
      address: '69/17 ซอยกรุงเทพกรีฑา 15 (ประชาร่วมใจ) แขวงหัวหมาก เขตบางกะปิ กรุงเทพมหานคร',
      lat: 13.756121, lng: 100.692544,
      status: 'planned',
      commander: '', team: '', contact: '', startTime: '', risk: '',
      objective: 'ตรวจค้นเอกสารการถือหุ้น เอกสารทางบัญชี หลักฐานการรับ-โอนเงิน คอมพิวเตอร์ โทรศัพท์ สื่อบันทึกข้อมูลอิเล็กทรอนิกส์',
      intel: 'เลขทะเบียน 0105565180600 / สงสัยถือหุ้นแทนคนต่างด้าว / ที่ตั้งใกล้จุดที่ 1',
      lastUpdate: Date.now()
    },
    {
      id: 'P3',
      name: 'บริษัท เหลียง พีเพิล ไทย เทรดดิ้ง จำกัด',
      alias: 'จุดที่ 3',
      address: '19/122 ถนนกาญจนาภิเษก แขวงทับช้าง เขตสะพานสูง กรุงเทพมหานคร (มบ.เวนิว พระราม 9)',
      lat: 13.757663106715166, lng: 100.70291138976825,
      status: 'planned',
      commander: '', team: '', contact: '', startTime: '', risk: '',
      objective: 'ตรวจค้นเอกสารการถือหุ้น เอกสารทางบัญชี หลักฐานการรับ-โอนเงิน คอมพิวเตอร์ โทรศัพท์ สื่อบันทึกข้อมูลอิเล็กทรอนิกส์',
      intel: 'ไม่ติดป้ายชื่อบริษัท / ลักษณะมีผู้อยู่อาศัย / พบรถยนต์ BMW ทะเบียน 3ขว 3785 กรุงเทพมหานคร',
      lastUpdate: Date.now()
    },
    {
      id: 'P4',
      name: 'บริษัท T.A. Lawfirm',
      alias: 'จุดที่ 4',
      address: 'อาคารศุภาลัย แกรนด์ ทาวเวอร์ ชั้น 9 ห้อง 903, 1011 ถนนพระราม 3 แขวงช่องนนทรี เขตยานนาวา กรุงเทพมหานคร',
      lat: 13.68304697416347, lng: 100.54729206869874,
      status: 'planned',
      commander: '', team: '', contact: '', startTime: '', risk: '',
      objective: 'ตรวจค้นเอกสารการจดทะเบียนบริษัท เอกสารทางบัญชี สำนักงานทำบัญชี/ทนายความ',
      intel: 'สำนักงานทำบัญชี-กฎหมาย / Tel: 099-424-9714 / Email: taianlawfirm@gmail.com / พบพนักงานหลายรายมีประกันสังคมที่นี่',
      lastUpdate: Date.now()
    },
    {
      id: 'P5',
      name: 'บ้าน MR. HAO DENG',
      alias: 'จุดที่ 5',
      address: '222/67 โครงการ The City พระราม 9 – กรุงเทพกรีฑา ถนนศรีนครินทร์-ร่มเกล้า แขวงทับช้าง เขตสะพานสูง กรุงเทพมหานคร',
      lat: 13.74976128357754, lng: 100.70162601589696,
      status: 'planned',
      commander: '', team: '', contact: '', startTime: '', risk: '',
      objective: 'ตรวจค้นเอกสารการถือหุ้น เอกสารการชำระค่าหุ้น หลักฐานการรับ-โอนเงิน คอมพิวเตอร์ โทรศัพท์มือถือ สื่อบันทึกข้อมูลอิเล็กทรอนิกส์',
      intel: 'นาย HAO DENG สัญชาติจีน / โอนเงิน 4,000,000 บาท ให้ น.ส.ปิยนุช / เบอร์ 090-526-6666 / พบรถ MERCEDES BENZ S 350 d ทะเบียน 9กฌ 77 กทม.',
      lastUpdate: Date.now()
    }
  ];
  
  defaultSites.forEach(site => {
    sitesSheet.appendRow([
      site.id, site.name, site.alias, site.address, site.lat, site.lng,
      site.status, site.commander, site.team, site.contact, site.startTime,
      site.objective, site.intel, site.risk || '', site.lastUpdate
    ]);
  });

  // Initialize targets sheet with default values
  const targetsSheet = spreadsheet.getSheetByName('targets') || spreadsheet.insertSheet('targets');
  if (targetsSheet.getLastRow() > 0) {
    targetsSheet.clearContents();
  }
  const targetHeaders = ['id', 'name', 'nationality', 'idCard', 'role', 'note', 'siteId'];
  targetsSheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
  
  const defaultTargets = [
    ['T1', 'HAO DENG', 'CHN', 'EJ5998123', 'เจ้าของทุนหลัก', 'วันเกิด: 1990-11-05 | ผู้โอนเงินชำระค่าหุ้นให้ น.ส.ปิยนุช', 'P5'],
    ['T2', 'นางสาวดารารัตน์ เกษมสมใจ', 'ไทย', '1349901032801', 'พนักงาน/ผู้มีชื่อในบริษัท', 'เริ่มงาน: 23/06/2565 / 07/02/2565 (ACTIVE) บริษัท ทีเอ ลอว์ เฟิร์ม', 'P4'],
    ['T3', 'นางสาวนิธิมา โคตรบัณฑิต', 'ไทย', '1340700498279', 'พนักงาน/ผู้มีชื่อในบริษัท', 'เริ่มงาน: 01/02/2565 (ACTIVE) บริษัท ทีเอ ลอว์ เฟิร์ม', 'P4'],
    ['T4', 'นางสาวกุสุมา ทัศนีย์ทอง', 'ไทย', '1500701255459', 'พนักงาน/ผู้มีชื่อในบริษัท', 'เริ่มงาน: 12/09/2565 (ACTIVE) บริษัท ทีเอ ลอว์ เฟิร์ม', 'P4'],
    ['T5', 'นายพิชยพิชญ์ วัชรชาดล', 'ไทย', '5500901114657', 'พนักงาน/ผู้มีชื่อในบริษัท', 'เริ่มงาน: 11/04/2565 (ACTIVE) บริษัท ทีเอ ลอว์ เฟิร์ม / พยาน', 'P4'],
    ['T6', 'นางสาวสุณิตา เดชยศดี', 'ไทย', '1103702181595', 'พนักงาน/พยาน', 'พนักงานบริษัท ทีเอ ลอว์ แอคเคาท์ติ้ง (ACTIVE)', 'P4'],
    ['T7', 'YUXIN KE', 'KHM', 'NO1855229', 'เจ้าของกรรมสิทธิ์รถจักรยานยนต์', 'วันเกิด: 1992-06-13 | รถ YAMAHA TMAX สีเทา ทะเบียน 3ขช-2047 กทม.', 'P2'],
    ['T8', 'SU YAN', 'CHN', 'EJ6335262', 'เจ้าของกรรมสิทธิ์รถจักรยานยนต์', 'วันเกิด: 2004-12-01 | รถ HONDA GOLDWING TOUR สีขาว,ดำ ทะเบียน 8ขพ-2484 กทม.', 'P2'],
    ['T9', 'SIMING LIU', 'CHN', 'ED0710668', 'กรรมการบริษัท/เจ้าของกรรมสิทธิ์รถ', 'วันเกิด: 1988-07-03 | รถ TOYOTA ALPHARD 4ขศ-6390 / HONDA GOLDWING 8ขล-2042 & 8ขร-7535 | กรรมการ บริษัท โฮลดิ้ง กู๊ด (ไทยแลนด์) จำกัด', 'P2'],
    ['T10', 'นายคุนทู หู', 'จีน', 'EH6580679', 'กรรมการ / ผู้ถือหุ้น', 'วันเกิด: 1993-11-2 | ประเภท: ขาออก | เที่ยวบิน: TG0417 | ตม.: 2025-02-15 14:57:00', 'P1'],
    ['T11', 'น.ส.ปิยนุช อ้วนแก้ว', 'ไทย', '1429900334676', 'กรรมการ / ผู้ถือหุ้น', 'มีชื่อรับโอน Promptpay / กรรมการ บริษัท นาราวี โฮลดิ้ง จำกัด', 'P1'],
    ['T12', 'นางสาคร อ้วนแก้ว', 'ไทย', '3420100055258', 'ผู้เกี่ยวข้อง/ผู้ถือหุ้น', 'ความสัมพันธ์ทางครอบครัวกับ ปิยนุช อ้วนแก้ว', 'P1'],
    ['T13', 'น.ส.นันทิกานต์ สุระเสน', 'ไทย', '3330300865092', 'คนทำบัญชี', 'พนักงานบริษัท ทีเอ ลอว์ แอคเคาท์ติ้ง (ACTIVE)', 'P1'],
    ['T14', 'นายภิรมย์ ยิ่งบุรุษ', 'ไทย', '3800100450102', 'พยาน', 'พนักงานบริษัท ทีเอ ลอว์ แอคเคาท์ติ้ง (ACTIVE)', 'P1'],
    ['T15', 'นางสาวพิมณภัทร์ เกตุแสง', 'ไทย', '1104300140704', 'ผู้รับมอบอำนาจ', 'อดีต พนักงาน ทีเอ ลอว์ แอคเคาท์ติ้ง (2566-2567) | ปัจจุบัน ไทยรุ่งยูเนี่ยนคาร์ (ACTIVE)', 'P1']
  ];
  if (defaultTargets.length > 0) {
    targetsSheet.getRange(2, 1, defaultTargets.length, targetHeaders.length).setValues(defaultTargets);
  }

  return "นำเข้าข้อมูลสำเร็จ!";
}
