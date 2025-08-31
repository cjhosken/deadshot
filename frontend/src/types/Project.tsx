import { BACKEND_API_ADDRESS } from "../App";

export default class Project {
    path: string = "";

    data: Record<string, unknown> = {};

    constructor(path: string) {
        this.path = path;
    }

    setPath(path: string) {
        this.path = path;
    }

    getPath() : string {
        return this.path;
    }

    setData(data: Record<string, unknown>) {
        this.data = data;
    }

    getData() : Record<string, unknown> {
        return this.data;
    }

    async save() {
        await fetch(`${BACKEND_API_ADDRESS}/api/project/save`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                path: this.path,
                data: {some: "stuff", values: [1, 2, 3]}
            }),
        });
    }

    static async open(path: string) : Promise<Project> {
        const res = await fetch(`${BACKEND_API_ADDRESS}/api/project/open?path=${encodeURIComponent(path)}`);

        const obj = await res.json();

        const project = new Project(path);
        project.setData(obj.data);
        return project;
    }
};

export async function saveProject(project : Project) {
    project.save();
    window.electron.setTitle(project.getPath())
};

export async function openProject(path: string) : Promise<Project> {
    const project = await Project.open(path);
    window.electron.setTitle(project.getPath());
    return project;
}