import PyInstaller.__main__
import os
import shutil
import sys


def build_backend():
    """Compile the backend using pyinstaller for use with electron."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.abspath(os.path.join(script_dir, "../build/backend"))

    # package dirs are any directories that should be included with the electron build.
    package_dirs = ["models"]

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    os.makedirs(build_dir, exist_ok=True)

    pyinstaller_args = [
        os.path.join(script_dir, "main.py"),
        "--name=backend",
        "--onefile",
        "--console",
        f"--distpath={build_dir}",
        f'--workpath={os.path.join(build_dir, "_build")}',
        f'--specpath={os.path.join(build_dir, "_spec")}',
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.loops.asyncio",
        "--hidden-import=uvicorn.loops.protocols.http",
        "--hidden-import=uvicorn.loops.protocols.websockets",
        "--hidden-import=uvicorn.protocols.http.h11_impl",
        "--hidden-import=uvicorn.protocols.http.httptools_impl",
        "--hidden-import=uvicorn.protocols.websockets.websockets_impl",
        "--hidden-import=uvicorn.protocols.websockets.wsproto_impl",
        "--collect-all=fastapi",
        "--collect-all=uvicorn",
    ]

    PyInstaller.__main__.run(pyinstaller_args)

    for package_dir in package_dirs:
        shutil.copytree(
            os.path.join(script_dir, package_dir), os.path.join(build_dir, package_dir)
        )

    # remove any files and folders that start with "_'.
    for item in os.listdir(build_dir):
        if item.startswith("_") or item.startswith("."):
            item_path = os.path.join(build_dir, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
            else:
                os.remove(item_path)

    print("Backend packaged successfully!")
    executable_name = "backend.exe" if sys.platform == "win32" else "backend"
    print(f"Executable location: {os.path.join(build_dir, executable_name)}")


if __name__ == "__main__":
    build_backend()
