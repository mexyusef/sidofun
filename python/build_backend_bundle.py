from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PYTHON_ROOT = REPO_ROOT / "python"
PACKAGE_ROOT = PYTHON_ROOT / "sidofun_desktop"
VENDOR_ROOT = PACKAGE_ROOT / "_vendor" / "backend"

REQUIRED_RUNTIME_PATHS = [
    Path("dist/cli-ipc.js"),
    Path("libnut-core-build-release/libnut.node"),
    Path("node_modules/playwright-core"),
    Path("node_modules/sharp"),
    Path("node_modules/@img"),
]


def run(command: list[str], cwd: Path) -> None:
    subprocess.run(command, cwd=str(cwd), check=True)


def ensure_backend_built() -> None:
    cli_path = REPO_ROOT / "dist" / "cli-ipc.js"
    if not cli_path.exists():
        run(["bun", "run", "build:ipc"], REPO_ROOT)


def validate_runtime_assets() -> None:
    missing = [str(path) for path in REQUIRED_RUNTIME_PATHS if not (REPO_ROOT / path).exists()]
    if missing:
        joined = "\n".join(f"- {item}" for item in missing)
        raise RuntimeError(
            "Cannot stage bundled Sidofun backend. Missing runtime assets:\n"
            f"{joined}\n"
            "Run `bun install`, build the backend, and ensure libnut is available."
        )


def copy_path(relative_path: Path) -> None:
    source = REPO_ROOT / relative_path
    destination = VENDOR_ROOT / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.is_dir():
        shutil.copytree(source, destination, dirs_exist_ok=True)
    else:
        shutil.copy2(source, destination)


def write_manifest() -> None:
    manifest_path = VENDOR_ROOT / "manifest.json"
    manifest = {
        "bundleVersion": 1,
        "platform": "win32",
        "backendEntry": "dist/cli-ipc.js",
        "generatedBy": "python/build_backend_bundle.py",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def stage_backend_bundle() -> None:
    ensure_backend_built()
    validate_runtime_assets()

    if VENDOR_ROOT.exists():
        shutil.rmtree(VENDOR_ROOT)
    VENDOR_ROOT.mkdir(parents=True, exist_ok=True)

    for path in REQUIRED_RUNTIME_PATHS:
        copy_path(path)

    write_manifest()


def main() -> int:
    skip_bundle = os.environ.get("SIDOFUN_PYTHON_SKIP_BACKEND_BUNDLE") == "1"
    if skip_bundle:
        return 0

    stage_backend_bundle()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
