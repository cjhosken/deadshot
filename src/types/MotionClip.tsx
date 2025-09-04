export default class MotionClip {
    name: string;
    type: "live" | "processed";

    constructor(name: string = "clip", type: "live" | "processed" = "live") {
        this.name = name;
        this.type = type;
    }

    export() {
       console.log("Exporting", this.name)
    }
};