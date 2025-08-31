# 📦 Development

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