interface Window {
    electron: {
        showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
        showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
        setTitle: (title: string) => void;
        openExternal: (url: string) => void;
        getOS: () => Promise<{platform: string; arch:string;release:string}>;
    };
}