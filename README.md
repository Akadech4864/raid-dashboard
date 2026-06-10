# Raid Dashboard - ระบบบริหารจัดการปฏิบัติการค้น 5 จุด

Dashboard สำหรับบริหารจัดการปฏิบัติการค้น 5 จุด พร้อมแผนที่และระบบบันทึกข้อมูลแบบ Real-time ผ่าน Google Sheets

## คุณสมบัติหลัก

- 📍 **แผนที่จุดปฏิบัติการ** - แสดง 5 จุดบนแผนที่ พร้อมสถานะสี
- 👥 **บันทึกบุคคล** - บันทึกผู้พบในสถานที่ค้น พร้อมสัญชาติ/เลขบัตร
- 📦 **สิ่งของตรวจยึด** - บันทึกรายการและจำนวน
- 📝 **คำสั่ง/บันทึก** - บันทึกคำสั่งการและเหตุการณ์
- 🔄 **Sync Real-time** - ข้อมูลอัปเดตแบบ Real-time ผ่าน Google Sheets
- 📱 **Mobile Friendly** - ใช้งานบนมือถือได้สมบูรณ์

## วิธีติดตั้ง

### ขั้นตอนที่ 1: สร้าง Google Sheet

1. ไปที่ [Google Sheets](https://sheets.new)
2. สร้าง Sheet ใหม่ชื่อ `Raid Dashboard`
3. สร้าง 4 Sheets (แท็บด้านล่าง):

**Sheet 1: `sites`**
| id | name | alias | address | lat | lng | status | commander | team | contact | startTime | objective | intel | risk | lastUpdate |
|----|------|-------|---------|-----|-----|--------|-----------|------|---------|-----------|-----------|-------|------|------------|
| P1 | บริษัท นาราวี โฮลดิ้ง จำกัด | จุดที่ 1 | 69/18 ซอยกรุงเทพ... | 13.756121 | 100.692544 | planned | | | | | | | | |
| P2 | บริษัท โฮลดิ้ง กู๊ด... | จุดที่ 2 | 69/17 ซอยกรุงเทพ... | 13.756121 | 100.692544 | planned | | | | | | | | |

**Sheet 2: `persons`**
| id | siteId | name | nationality | idCard | role | note | ts |
|----|--------|------|-------------|--------|------|------|-----|

**Sheet 3: `seized`**
| id | siteId | name | qty | unit | note | ts |
|----|--------|------|-----|------|------|-----|

**Sheet 4: `logs`**
| id | siteId | text | author | priority | ts |
|----|--------|------|--------|----------|-----|

### ขั้นตอนที่ 2: ติดตั้ง Apps Script

1. ใน Google Sheet: เมนู **Extensions** → **Apps Script**
2. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดจากไฟล์ `Code.gs` ในโปรเจกต์นี้
3. บันทึกโปรเจกต์: กด **Save** (ไอคอน 💾) ตั้งชื่อ `RaidDashboardAPI`
4. Deploy:
   - กด **Deploy** → **New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด **Deploy**
   - ยอมรับสิทธิ์การเข้าถึง
5. คัดลอก **Web App URL** (จะได้รับ URL ลงท้ายด้วย `/exec`)

### ขั้นตอนที่ 3: อัปเดต Frontend

1. เปิดไฟล์ `index.html`
2. หาบรรทัด:
   ```javascript
   const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. แทนที่ด้วย URL ที่ได้จากขั้นตอนที่ 2:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```

### ขั้นตอนที่ 4: Deploy บน GitHub Pages

1. สร้าง Repository ใหม่บน GitHub ชื่อ `raid-dashboard`
2. Push ไฟล์ขึ้น GitHub:
   ```bash
   git init
   git add index.html Code.gs README.md
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/raid-dashboard.git
   git push -u origin main
   ```
3. เปิดใช้งาน GitHub Pages:
   - ไปที่ Repository → **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
   - กด **Save**
4. รอ 2-3 นาที แล้วทดสอบ URL: `https://YOUR_USERNAME.github.io/raid-dashboard/`

## การใช้งาน

### สำหรับผู้ใช้
1. เปิด URL ของ Dashboard
2. เลือกจุดปฏิบัติการจากแผนที่หรือกล่องด้านล่าง
3. บันทึกข้อมูลบุคคล/สิ่งของ/คำสั่งการ
4. ข้อมูลจะ Sync ไปยัง Google Sheets อัตโนมัติ

### สำหรับผู้ดูแล (ดูข้อมูลใน Sheets)
1. เปิด Google Sheet ที่สร้างไว้
2. ข้อมูลทั้งหมดจะถูกบันทึกแยกตาม Sheet
3. สามารถ Export เป็น Excel หรือสร้าง Report ได้

## โครงสร้างโปรเจกต์

```
raid-dashboard/
├── index.html      # Frontend Dashboard
├── Code.gs         # Google Apps Script (Backend API)
└── README.md       # คู่มือนี้
```

## ข้อควรระวัง

- **Google Apps Script Limit**: 20,000 requests/วัน (เพียงพอสำหรับ 5 ผู้ใช้)
- **Google Sheets Limit**: 5 ล้าน cells ต่อ Sheet
- **CORS**: API อนุญาตทุก origin (`*`) ควรใช้ในองค์กรที่ไว้วางใจ

## การแก้ไขปัญหา

### ข้อมูลไม่ Sync
1. ตรวจสอบ API_URL ถูกต้องหรือไม่
2. ตรวจสอบสิทธิ์ Apps Script (ต้องเป็น "Anyone")
3. ดู Console (F12) เช็ค error message

### แผนที่ไม่แสดง
- ตรวจสอบ Internet connection
- Leaflet โหลดจาก CDN (ต้องมี Internet)

## License

MIT License - ใช้งานได้ฟรีสำหรับภารกิจราชการ

## ติดต่อ

หากมีปัญหาหรือข้อเสนอแนะ สามารถเปิด Issue ใน GitHub ได้
