import * as pako from "pako";

type ProjectData = {
    name: string;
    description: string;
    createdAt: string;
};

export class Project {
    data: ProjectData;

    constructor(data: ProjectData) {
        this.data = data;
    }

    toCompressed(): Uint8Array {
        const json = JSON.stringify(this.data, null, 2);
        return pako.deflate(json);
    }

    save(filename: string) {
        if (!filename.endsWith('.deadshot')) {filename += '.deadshot';}
        
        const compressed = this.toCompressed();
        const blob = new Blob([new Uint8Array(compressed)], {type: 'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);        
    }

    static async load(file: File): Promise<Project> {
        const buffer = await file.arrayBuffer();
        const compressed = new Uint8Array(buffer);
        const decompressed = pako.inflate(compressed, {to: "string"});
        const data: ProjectData = JSON.parse(decompressed);
        return new Project(data);
    }
};