"""Festival dates from the browser code must match published 2025-2026 dates."""
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


@pytest.mark.skipif(shutil.which("node") is None, reason="needs Node.js")
def test_festival_dates():
    proc = subprocess.run(["node", str(ROOT / "tools" / "festival_check.mjs")], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stdout[-3000:] + proc.stderr[-2000:]
