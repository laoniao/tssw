# -*- coding: utf-8 -*-
"""生成软著登记用源代码 Word 文档（符合常见交存格式要求）"""

from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

# ---------------- 配置 ----------------
SOFTWARE_NAME = "师生交互平台软件"
SOFTWARE_VERSION = "V1.0"
LINES_PER_PAGE = 50
FRONT_PAGES = 30
BACK_PAGES = 30

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / f"{SOFTWARE_NAME}_{SOFTWARE_VERSION}_源代码.docx"

# 优先收录顺序：入口与核心逻辑在前，页面与样式在后
PREFERRED_ORDER = [
    "index.html",
    "package.json",
    "vite.config.js",
    "src/main.js",
    "src/App.vue",
    "src/router/index.js",
    "src/utils/request.js",
    "src/utils/avatarStyles.js",
    "src/store/user.js",
    "src/store/message.js",
    "src/api/index.js",
    "src/api/team.js",
    "src/api/resource.js",
    "src/api/message.js",
    "src/api/comment.js",
    "src/api/dashboard.js",
    "src/api/profile.js",
    "src/mock/index.js",
    "src/mock/modules/team.js",
    "src/mock/modules/resource.js",
    "src/mock/modules/message.js",
    "src/mock/modules/comment.js",
    "src/mock/modules/dashboard.js",
    "src/mock/modules/profile.js",
    "src/components/AppHeader.vue",
    "src/components/AIAssistant.vue",
    "src/components/BackgroundGlow.vue",
    "src/components/Robot3D.vue",
    "src/views/login/LoginPage.vue",
    "src/views/student/StudentLayout.vue",
    "src/views/student/CompetitionHall.vue",
    "src/views/student/CompetitionDetail.vue",
    "src/views/student/TeamCenter.vue",
    "src/views/student/TeamInvite.vue",
    "src/views/student/SmartRecommend.vue",
    "src/views/student/WorksShowcase.vue",
    "src/views/student/WorkDisplay.vue",
    "src/views/student/MyProfile.vue",
    "src/views/student/Messages.vue",
    "src/views/student/components/ProfileEdit.vue",
    "src/views/student/components/TeamApplyList.vue",
    "src/views/student/components/WorkComment.vue",
    "src/views/student/components/WorkCommentNode.vue",
    "src/views/teacher/TeacherLayout.vue",
    "src/views/teacher/PublishComp.vue",
    "src/views/teacher/TeamAudit.vue",
    "src/views/teacher/GuideAssign.vue",
    "src/views/teacher/ManageStudent.vue",
    "src/views/teacher/DataBoard.vue",
    "src/views/teacher/AnnouncementResource.vue",
    "src/views/teacher/Announcement.vue",
    "src/views/teacher/Messages.vue",
    "src/views/teacher/components/ResourceUpload.vue",
    "src/views/common/MessageList.vue",
    "src/views/NotFound.vue",
    "src/styles/variables.scss",
    "src/styles/global.scss",
    "src/assets/styles/global.scss",
]

INCLUDE_EXTS = {".vue", ".js", ".ts", ".scss", ".css", ".html", ".json"}
SKIP_NAMES = {"package-lock.json", "auto-imports.d.ts", "components.d.ts"}


def collect_files() -> list[Path]:
    files: list[Path] = []
    seen: set[Path] = set()

    for rel in PREFERRED_ORDER:
        p = ROOT / rel
        if p.is_file() and p not in seen:
            files.append(p)
            seen.add(p)

    # 补充遗漏的源文件
    for p in sorted((ROOT / "src").rglob("*")):
        if not p.is_file():
            continue
        if p.suffix.lower() not in INCLUDE_EXTS:
            continue
        if p.name in SKIP_NAMES:
            continue
        if "node_modules" in p.parts:
            continue
        if p not in seen:
            files.append(p)
            seen.add(p)

    for rel in ("index.html", "vite.config.js", "package.json"):
        p = ROOT / rel
        if p.is_file() and p not in seen:
            files.insert(0, p)
            seen.add(p)

    return files


def read_text(path: Path) -> str:
    for enc in ("utf-8", "utf-8-sig", "gbk", "gb18030"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="replace")


def build_source_lines(files: list[Path]) -> list[str]:
    lines: list[str] = []
    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        lines.append(f"// ===== 文件: {rel} =====")
        content = read_text(path).replace("\r\n", "\n").replace("\r", "\n")
        file_lines = content.split("\n")
        # 去掉文件末尾多余空行，避免浪费页数
        while file_lines and file_lines[-1].strip() == "":
            file_lines.pop()
        for raw in file_lines:
            # 软著页宽有限，过长行做软折行（按字符）
            text = raw.replace("\t", "    ")
            if text == "":
                lines.append(" ")
                continue
            width = 96
            while len(text) > width:
                lines.append(text[:width])
                text = text[width:]
            lines.append(text)
        lines.append(" ")
    return lines


def set_run_font(run, name_cn="宋体", name_en="Courier New", size_pt=9):
    run.font.name = name_en
    run.font.size = Pt(size_pt)
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), name_en)
    rFonts.set(qn("w:hAnsi"), name_en)
    rFonts.set(qn("w:eastAsia"), name_cn)
    rFonts.set(qn("w:cs"), name_en)


def set_paragraph_format(paragraph):
    pf = paragraph.paragraph_format
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    pf.line_spacing = Pt(12)  # 固定 12 磅，配合页边距约 50 行/页
    pf.widow_control = False


def add_page_number(paragraph, start: int):
    """页脚中插入 PAGE 域，并从 start 起编。"""
    run = paragraph.add_run()
    set_run_font(run, size_pt=9)

    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")

    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "

    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")

    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)


def set_section_page_start(section, start: int):
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn("w:pgNumType"))
    if pgNumType is None:
        pgNumType = OxmlElement("w:pgNumType")
        sectPr.append(pgNumType)
    pgNumType.set(qn("w:start"), str(start))


def setup_section(section, page_start: int):
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    # 上下边距配合固定行距，使每页约 50 行正文
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)
    section.header_distance = Cm(1.2)
    section.footer_distance = Cm(1.2)

    set_section_page_start(section, page_start)

    # 页眉：软件名称 + 版本号
    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hp.clear()
    set_paragraph_format(hp)
    hp.paragraph_format.line_spacing = Pt(14)
    run = hp.add_run(f"{SOFTWARE_NAME} {SOFTWARE_VERSION}")
    set_run_font(run, name_cn="宋体", name_en="宋体", size_pt=10.5)

    # 页脚：页码（右对齐）
    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fp.clear()
    set_paragraph_format(fp)
    fp.paragraph_format.line_spacing = Pt(14)
    label = fp.add_run("第 ")
    set_run_font(label, name_cn="宋体", name_en="宋体", size_pt=9)
    add_page_number(fp, page_start)
    label2 = fp.add_run(" 页")
    set_run_font(label2, name_cn="宋体", name_en="宋体", size_pt=9)


def write_pages(doc: Document, pages: list[tuple[int, list[str]]], first_section: bool):
    """pages: [(page_no, lines), ...]"""
    if not pages:
        return

    if first_section:
        setup_section(doc.sections[0], pages[0][0])
    else:
        section = doc.add_section(WD_SECTION.NEW_PAGE)
        setup_section(section, pages[0][0])

    for idx, (_page_no, page_lines) in enumerate(pages):
        if idx > 0:
            doc.add_page_break()

        padded = list(page_lines)
        while len(padded) < LINES_PER_PAGE:
            padded.append(" ")

        for line in padded[:LINES_PER_PAGE]:
            p = doc.add_paragraph()
            set_paragraph_format(p)
            run = p.add_run(line)
            set_run_font(run, size_pt=9)


def chunk_pages(all_lines: list[str]) -> list[tuple[int, list[str]]]:
    pages: list[tuple[int, list[str]]] = []
    total = len(all_lines)
    page_count = (total + LINES_PER_PAGE - 1) // LINES_PER_PAGE
    for i in range(page_count):
        start = i * LINES_PER_PAGE
        end = min(start + LINES_PER_PAGE, total)
        pages.append((i + 1, all_lines[start:end]))
    return pages


def select_pages(pages: list[tuple[int, list[str]]]):
    """超过 60 页时取前 30 + 后 30，页码保持源程序连续页码。"""
    n = len(pages)
    if n <= FRONT_PAGES + BACK_PAGES:
        return pages, []
    front = pages[:FRONT_PAGES]
    back = pages[-BACK_PAGES:]
    return front, back


def main():
    files = collect_files()
    if not files:
        print("未找到源文件", file=sys.stderr)
        sys.exit(1)

    all_lines = build_source_lines(files)
    pages = chunk_pages(all_lines)
    front, back = select_pages(pages)

    doc = Document()
    # 清除默认空段
    if doc.paragraphs:
        p = doc.paragraphs[0]
        p.clear()

    write_pages(doc, front, first_section=True)

    if back:
        write_pages(doc, back, first_section=False)

    # 删除文档开头可能残留的空段
    if doc.paragraphs and not doc.paragraphs[0].text.strip() and len(doc.paragraphs) > 1:
        el = doc.paragraphs[0]._element
        parent = el.getparent()
        if parent is not None:
            parent.remove(el)

    doc.save(OUT_PATH)

    total_pages = len(pages)
    exported = len(front) + len(back)
    print(f"软件名称: {SOFTWARE_NAME} {SOFTWARE_VERSION}")
    print(f"源文件数: {len(files)}")
    print(f"总行数: {len(all_lines)}")
    print(f"总页数: {total_pages}（每页 {LINES_PER_PAGE} 行）")
    if back:
        print(f"交存页数: 前{len(front)}页 + 后{len(back)}页 = {exported}页")
        print(f"页码范围: 1-{len(front)} 与 {back[0][0]}-{back[-1][0]}")
    else:
        print(f"交存页数: 全部 {exported} 页")
    print(f"输出文件: {OUT_PATH}")


if __name__ == "__main__":
    main()
