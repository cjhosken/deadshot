const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    showSaveDialog: (options) => {
        return ipcRenderer.invoke("show-save-dialog", options);
    },
    showOpenDialog: (options) => {
        return ipcRenderer.invoke("show-open-dialog", options);
    },
    setTitle: (title) => ipcRenderer.send("set-window-title", title),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getOS: () => ipcRenderer.invoke('get-os')
});
