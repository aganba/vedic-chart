"""The browser (JavaScript) port must reproduce the Python reference exactly."""
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import parity  # noqa: E402


@pytest.mark.skipif(shutil.which("node") is None, reason="needs Node.js")
def test_js_matches_python():
    py, js = parity.python_results(), parity.js_results()
    problems = [p for i, (a, b) in enumerate(zip(py, js)) for p in parity.diff(a, b, f"case{i}")]
    assert not problems, "\n".join(problems[:20])
