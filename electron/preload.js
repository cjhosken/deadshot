const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    showSaveDialog: (options) => {
        return ipcRenderer.invoke("show-save-dialog", options);
    },
    showOpenDialog: (options) => {
        return ipcRenderer.invoke("show-open-dialog", options);
    },
    setTitle: (title) => ipcRenderer.send("set-window-title", title),
});
