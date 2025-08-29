const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // You can expose API methods here if needed
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isDev: () => process.env.NODE_ENV === 'development',
});