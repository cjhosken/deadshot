<p align="center">
  <img src="./frontend/public/icon.png" alt="Deadshot Logo" width="200"/>
</p>

<h1 align="center">Deadshot</h1>

<p align="center">
<a href="https://github.com/cjhosken/deadshot/actions/workflows/linux.yml"><img src="https://github.com/cjhosken/deadshot/actions/workflows/linux.yml/badge.svg?branch=main" alt="Linux Build"/></a>
<a href="https://github.com/cjhosken/deadshot/actions/workflows/windows.yml"><img src="https://github.com/cjhosken/deadshot/actions/workflows/windows.yml/badge.svg" alt="Windows Build"/></a>
<a href="https://github.com/cjhosken/deadshot/actions/workflows/macos.yml"><img src="https://github.com/cjhosken/deadshot/actions/workflows/macos.yml/badge.svg" alt="macOS Build"/></a>
<a href="https://github.com/cjhosken/deadshot/actions/workflows/check.yml"><img src="https://github.com/cjhosken/deadshot/actions/workflows/check.yml/badge.svg" alt="Checks"/></a>
</p>

---

**Deadshot** is an open-source **SFM** and **AI-based camera tracking and motion capture** software.

---

## 📦 Development

Deadshot is **free and open-source**, and can be used in both non-commercial and commercial projects.

If you want to develop Deadshot yourself, follow the setup guide below.

### 🔧 Prerequisites

To develop Deadshot, you will need:

- [Python](https://www.python.org/)
- [Node.js & npm](https://nodejs.org/)

### 🐍 Setup Python Virtual Environment

Always work inside a virtual environment:

```bash
# Create a new virtual environment
python3 -m venv .venv

# Activate the environment
# On Linux / macOS:
source .venv/bin/activate

# On Windows:
.\.venv\Scripts\Activate
````

### 📜 NPM Scripts

* **Install dependencies**

  ```bash
  npm run install:all
  ```

  Installs all required Node.js modules and Python packages.
  ⚠️ Make sure you’re inside your Python virtual environment first!

* **Run development environment (with hot reloading)**

  ```bash
  npm run dev
  ```

* **Build Deadshot executable**

  ```bash
  npm run build
  ```

  Builds the Deadshot executable into `build/electron`.

---

## 📬 Contact & Information

Deadshot was written by **Christopher Hosken** for his Research & Development project at **Bournemouth University**.

For inquiries about the project, you can reach him at:

* 📧 [hoskenchristopher@gmail.com](mailto:hoskenchristopher@gmail.com)
* 🔗 [LinkedIn (christopher-hosken)](https://www.linkedin.com/in/christopher-hosken/)