const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Hardware acceleration is disabled due to GPU initialization errors
app.disableHardwareAcceleration();

// Electron likes to throw security warnings for dev. This disables them.
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Check if the current running instance is development or production.
const isDev = () => {
    return process.env.NODE_ENV === "development" ||
        process.defaultApp ||
        /[\\/]electron[\\/]/.test(process.execPath);
};

let mainWindow;
let pythonProcess = null;

// When running the production build, Windows' firewalls asks for permission to run python. 
// This auto accepts the firewall request.
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

// Create the Electron app window.
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

    // In development mode, the frontend is running on a localhost port. 
    // In production, the frontend is a .html file.
    const startUrl = isDev()
        ? 'http://localhost:5173'
        : `file://${path.join(process.resourcesPath, 'frontend', 'index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}


// The python backend is started automatically. 
// It is assumed this function is only run in production builds.
async function startBackend() {
    await addFirewallRule();
    const backendExecutable = process.platform === 'win32' ? path.join(process.resourcesPath, 'backend', 'backend.exe')
        : path.join(process.resourcesPath, 'backend', 'backend');

    pythonProcess = spawn(backendExecutable);

    // To insure Python outputs are printed to the electron console.
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

// Execute when the app is ready.
app.whenReady().then(() => {
    // In development mode, the backend is launched elsewhere.
    if (!isDev()) {
        startBackend();
    }

    createWindow();

    // Only create a window if no window exists.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Handle window closing.
app.on('window-all-closed', () => {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle application quit.
app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
});