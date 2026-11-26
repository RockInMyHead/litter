"""Extract the six factory sheets to the local TypeScript data module."""
import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

CODES = ("13011003254", "13011003255", "13011003182", "13011003245", "13011003290")

def extract(path):
    with ZipFile(path) as book:
        def xml(path):
            root = ET.fromstring(book.read(path))
            for node in root.iter():
                node.tag = node.tag.rsplit("}", 1)[-1]
            return root

        strings = ["".join(t.text or "" for t in item.iter("t"))
                   for item in xml("xl/sharedStrings.xml").findall("si")]
        paths = {rel.attrib["Id"]: rel.attrib["Target"].lstrip("/")
                 for rel in xml("xl/_rels/workbook.xml.rels")}
        sheets = {}
        for sheet in xml("xl/workbook.xml").findall("sheets/sheet"):
            target = paths[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
            if not target.startswith("xl/"):
                target = "xl/" + target
            rows = {}
            for row in xml(target).findall("sheetData/row"):
                contents = {}
                for cell in row.findall("c"):
                    value = cell.findtext("v")
                    if value is None and cell.get("t") != "inlineStr":
                        continue
                    column = re.match(r"[A-Z]+", cell.get("r")).group()
                    kind = cell.get("t")
                    if kind == "s":
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = "".join(t.text or "" for t in cell.iter("t"))
                    elif kind in (None, "n"):
                        value = int(value) if re.fullmatch(r"-?\d+", value) else float(value)
                    contents[column] = value
                if contents:
                    rows[int(row.get("r"))] = contents
            sheets[sheet.attrib["name"]] = rows

    example = sheets["Пример расчета"]
    program = []
    for row in range(15, 20):
        r = example[row]
        program.append(dict(code=str(r["B"]), order=example[row-11]["C"], alloy=r["D"],
                            line=int(r["E"][-1]), scrap=r["G"]/100, set=r["I"],
                            cavity=r["J"], rate=r["L"], weight=r["N"], row=row,
                            excelShifts=r["M"], excelTonnes=r["O"]))
    assert tuple(row["code"] for row in program) == CODES
    documents = {}
    for code in CODES:
        operations, resources = {}, []
        rows = sheets[code]
        for row, r in rows.items():
            if str(r.get("C")) == code and r.get("E"):
                key = (str(r["E"]), str(r["F"]), str(r["H"]))
                operation = operations.setdefault(key, dict(number=key[0], code=key[1], name=r["G"],
                                                            area=r["I"], rows=[], equipment=[]))
                operation["rows"].append(row)
                if r.get("K"):
                    equipment = dict(code=str(r["J"]), name=r["K"])
                    if equipment not in operation["equipment"]:
                        operation["equipment"].append(equipment)
            if str(r.get("A", "")).startswith("Изделие") and isinstance(r.get("F"), int):
                resources.append(dict(row=row, semiCode=str(r.get("B", "")), semi=r.get("C", ""),
                                      quantity=r["D"], semiUnit=r.get("E", ""), route=r["F"],
                                      position=r.get("G"), parentCode=str(r.get("H", "")), parent=r.get("I", ""),
                                      code=str(r.get("J", "")), name=r.get("K", ""), unit=r.get("L", ""),
                                      construction=r.get("M"), consumption=r.get("N"), composite=r.get("O") == 1))
        assert operations and resources
        documents[code] = dict(process=rows[3]["B"], processCode=str(rows[3]["A"]),
                               operations=list(operations.values()), resources=resources)
    return dict(program=program, documents=documents)

if __name__ == "__main__":
    source = extract(sys.argv[1])
    output = Path(__file__).resolve().parents[1] / "src/data/factory/workbook.ts"
    output.write_text("// Извлечено из шести листов XLSX. Генератор: scripts/import-workbook.py.\n"
                      "export const workbook = " + json.dumps(source, ensure_ascii=False, indent=2) + "\n",
                      encoding="utf-8")
    for code, document in source["documents"].items():
        print(code, len(document["operations"]), len(document["resources"]))
