import os
import subprocess
import sys
from pathlib import Path

from setuptools import find_packages, setup
from setuptools.command.build_py import build_py

try:
    from wheel.bdist_wheel import bdist_wheel
except ImportError:  # pragma: no cover - only used when wheel is available
    bdist_wheel = None


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent


def _read_readme() -> str:
    with open(THIS_DIR / "README.md", encoding="utf-8") as f:
        return f.read()


def _stage_backend_bundle() -> None:
    if os.environ.get("SIDOFUN_PYTHON_SKIP_BACKEND_BUNDLE") == "1":
        return

    subprocess.run(
        [sys.executable, str(THIS_DIR / "build_backend_bundle.py")],
        cwd=str(REPO_ROOT),
        check=True,
    )


class build_py_with_backend(build_py):
    def run(self):
        _stage_backend_bundle()
        super().run()


cmdclass = {"build_py": build_py_with_backend}

if bdist_wheel is not None:
    class bdist_wheel_with_backend(bdist_wheel):
        def run(self):
            _stage_backend_bundle()
            super().run()

    cmdclass["bdist_wheel"] = bdist_wheel_with_backend

setup(
    name="sidofun-desktop",
    version="0.1.0",
    author="Yusef Ulum",
    description="Direct Python-to-Bun IPC client for Windows desktop automation",
    long_description=_read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/mexyusef/sidofun",
    project_urls={
        "Bug Reports": "https://github.com/mexyusef/sidofun/issues",
        "Source": "https://github.com/mexyusef/sidofun",
    },
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "sidofun_desktop": [
            "_vendor/backend/manifest.json",
            "_vendor/backend/dist/*.js",
            "_vendor/backend/libnut-core-build-release/*.node",
            "_vendor/backend/node_modules/playwright-core/**/*",
            "_vendor/backend/node_modules/sharp/**/*",
            "_vendor/backend/node_modules/@img/**/*",
        ]
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Desktop Environment",
        "Topic :: Software Development :: Libraries",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: Microsoft :: Windows",
    ],
    python_requires=">=3.9",
    install_requires=[
        # No external dependencies - uses only stdlib
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-asyncio>=0.21",
            "black>=23.0",
            "mypy>=1.0",
            "ruff>=0.1.0",
        ],
    },
    keywords="desktop automation windows bun ipc",
    cmdclass=cmdclass,
)
