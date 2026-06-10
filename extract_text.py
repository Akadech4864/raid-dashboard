import pathlib
from pypdf import PdfReader
from docx import Document

base = pathlib.Path(r"c:\Users\other\OneDrive\ETC JOB\งานพี่ตั้ม\กก.4 ปอศ\เคส ปิยนุช")
pdf_path = base / "Canva" / "สรุปเป้าหมายค้น.pdf"
word_dir = base / "เอกสาร"

print("Base:", base)

# PDF pages 1-2
if pdf_path.exists():
    try:
        reader = PdfReader(str(pdf_path))
        for idx in range(min(2, len(reader.pages))):
            txt = reader.pages[idx].extract_text() or ""
            out = base / f"pdf_page{idx+1}.txt"
            out.write_text(txt, encoding="utf-8")
            print(f"wrote {out.name} chars={len(txt)}")
    except Exception as e:
        print("PDF read error:", e)
else:
    print("PDF not found")

# DOCX only (skip .doc)
if word_dir.exists():
    for doc_file in sorted(word_dir.glob("*.docx")):
        try:
            doc = Document(str(doc_file))
            text = "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            text = f"[read error: {e}]"
        out = doc_file.with_suffix(".txt")
        out.write_text(text, encoding="utf-8")
        print(f"wrote {out.name} chars={len(text)}")
else:
    print("word dir not found")
