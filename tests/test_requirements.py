from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def test_requirements_match_pyproject():
    tomllib = pytest.importorskip("tomllib")  # Python 3.11+
    with open(ROOT / "pyproject.toml", "rb") as f:
        declared = tomllib.load(f)["project"]["dependencies"]
    lines = (ROOT / "requirements.txt").read_text(encoding="utf-8").splitlines()
    listed = [line.strip() for line in lines if line.strip() and not line.startswith("#")]

    assert listed == declared
