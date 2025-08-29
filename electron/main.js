const { app, BrowserWindow, session, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

app.disableHardwareAcceleration();

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const isDev = () => {
    return process.env.NODE_ENV === "development" ||
        process.defaultApp ||
        /[\\/]electron[\\/]/.test(process.execPath);
}

let mainWindow;
let pythonProcess = null;

async function addFirewallRule() {
    if (process.platform !== 'win32') return;
    const backendPath = process.platform === 'win32'
        ? path.join(process.resourcesPath, 'backend', 'backend.exe')
        : path.join(process.resourcesPath, 'backend', 'backend');

    const ruleName = "Deadshot Backend";
    const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow program="${backendPath}" protocol=TCP localport=8000 enable=yes`;

    exec(command, (error) => {
        if (error) {
            console.warn('Could not add firewall rule (may already exist):', error.message);
        } else {
            console.log('Firewall rule added successfully');
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegeration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            allowRunningInsecureContent: false,
            preload: path.join(__dirname, "preload.js"),
        },
        icon: path.join(__dirname, "../frontend/public/icon.png"),
        show: false
    });

    const startUrl = isDev()
        ? 'http://localhost:5173'
        : `file://${path.join(process.resourcesPath, 'frontend', 'index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function startBackend() {
    if (isDev()) {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const backendPath = path.join(__dirname, '../backend/main.py');
        pythonProcess = spawn(pythonPath, [backendPath])
    } else {
        await addFirewallRule();
        const backendExecutable = process.platform === 'win32' ? path.join(process.resourcesPath, 'backend', 'backend.exe')
            : path.join(process.resourcesPath, 'backend', 'backend');

        if (process.platform !== 'win32') {
            fs.chmodSync(backendExecutable, 0o755);
        }

        pythonProcess = spawn(backendExecutable);
    };

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python stdout: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });
}

app.whenReady().then(() => {
    if (!isDev()) {
        startBackend();
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
})