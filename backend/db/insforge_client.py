import os
import httpx
from dotenv import load_dotenv

load_dotenv()

INSFORGE_URL = os.getenv("INSFORGE_URL")
INSFORGE_KEY = os.getenv("INSFORGE_SERVICE_KEY")

HEADERS = {
    "Authorization": f"Bearer {INSFORGE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}


class _Result:
    """Returned by insert/upsert — supports optional .execute() chaining."""
    def __init__(self, data):
        self.data = data

    def execute(self):
        return self


class InsForgeTable:
    def __init__(self, table):
        self.table = table
        self.base = f"{INSFORGE_URL}/api/database/records/{table}"
        self._cols = "*"
        self._filters = []
        self._order = None
        self._limit = None
        self._update_data = None

    def select(self, cols="*"):
        self._cols = cols
        return self

    def insert(self, data):
        rows = data if isinstance(data, list) else [data]
        r = httpx.post(self.base, json=rows, headers=HEADERS)
        try:
            return _Result(r.json())
        except Exception:
            return _Result([])

    def upsert(self, data, on_conflict=None):
        rows = data if isinstance(data, list) else [data]
        h = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"}
        r = httpx.post(self.base, json=rows, headers=h)
        try:
            return _Result(r.json())
        except Exception:
            return _Result([])

    def update(self, data):
        self._update_data = data
        return self

    def eq(self, col, val):
        self._filters.append(f"{col}=eq.{val}")
        return self

    def or_(self, expr):
        self._filters.append(f"or=({expr})")
        return self

    def order(self, col, desc=False):
        self._order = f"{col}.{'desc' if desc else 'asc'}"
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        params = {}
        for f in self._filters:
            k, v = f.split("=", 1)
            params[k] = v
        if self._order:
            params["order"] = self._order
        if self._limit:
            params["limit"] = self._limit

        if self._update_data is not None:
            r = httpx.patch(self.base, json=self._update_data,
                            headers=HEADERS, params=params)
            return type('R', (), {'data': r.json() if r.text else []})()

        params["select"] = self._cols
        r = httpx.get(self.base, headers=HEADERS, params=params)
        return type('R', (), {'data': r.json() if r.status_code == 200 else []})()


def rest(table: str):
    return InsForgeTable(table)


supabase = type('S', (), {'table': staticmethod(rest)})()


def upload_pdf_to_storage(file_bytes: bytes, filename: str) -> str:
    """Upload PDF to InsForge storage, returns public URL. Falls back gracefully."""
    try:
        url = f"{INSFORGE_URL}/api/storage/upload"
        headers = {"Authorization": f"Bearer {INSFORGE_KEY}"}
        files = {"file": (filename, file_bytes, "application/pdf")}
        r = httpx.post(url, headers=headers, files=files)
        return r.json().get("url", "")
    except Exception:
        return ""
