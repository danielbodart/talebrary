# /// script
# requires-python = ">=3.11"
# dependencies = ["sqlglot>=27"]
# ///
"""Build ifdb.sqlite from a raw IFDB MySQL dump, keeping ONLY the tables we use.

The IFDB dump is MySQL and carries constructs SQLite can't take (triggers that
`call` a stored proc, generated columns using `lcase`, AUTO_INCREMENT, inline
indexes, engine/charset clauses) — all in tables we don't read. Rather than
text-hack the dump (fragile), we parse it with sqlglot (a real MySQL AST) and
emit only what sync.sql needs:

  - CREATE TABLE for each wanted table as bare column names (SQLite is typeless),
    taking the column order from the dump itself — so no type/constraint DDL can
    break us, and added columns are picked up automatically.
  - INSERTs transpiled MySQL->SQLite (sqlglot handles quoting/escaping/values).

Everything else in the dump (other tables, triggers, views) is ignored.

Usage: uv run db/filter-ifdb.py <ifdb-archive.sql> <ifdb.sqlite>
"""
import sqlite3
import sys

import sqlglot
from sqlglot import exp

WANT = {"games", "gamelinks", "reviews", "filetypes"}


def main() -> int:
    src, dst = sys.argv[1], sys.argv[2]
    sql = open(src, encoding="utf-8", errors="replace").read()

    creates: dict[str, str] = {}
    inserts: list[str] = []
    for stmt in sqlglot.parse(sql, read="mysql", error_level=sqlglot.ErrorLevel.IGNORE):
        if stmt is None:
            continue
        tbl = stmt.find(exp.Table)
        if not (tbl and tbl.name in WANT):
            continue
        if isinstance(stmt, exp.Create):
            cols = [c.name for c in stmt.find_all(exp.ColumnDef)]
            col_list = ", ".join(f'"{c}"' for c in cols)
            creates[tbl.name] = f'CREATE TABLE "{tbl.name}" ({col_list})'
        elif isinstance(stmt, exp.Insert):
            inserts.append(stmt.sql(dialect="sqlite"))

    missing = WANT - creates.keys()
    if missing:
        print(f"ERROR: dump missing expected tables: {sorted(missing)}", file=sys.stderr)
        return 1

    con = sqlite3.connect(dst)
    try:
        for name in WANT:
            con.execute(f'DROP TABLE IF EXISTS "{name}"')
            con.execute(creates[name])
        for ins in inserts:
            con.execute(ins)
        con.commit()
        counts = {t: con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0] for t in WANT}
    finally:
        con.close()
    print("ifdb.sqlite built: " + ", ".join(f"{t}={n}" for t, n in counts.items()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
