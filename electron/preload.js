const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // API methods can be exposed here.
});