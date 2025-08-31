from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import gzip
import json
from pydantic import BaseModel

app = FastAPI(title="Deadshot Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello from Python backend!"}


@app.get("/api/items")
async def get_items():
    return {"items": ["Item 1", "Item 2", "Item 3"]}


@app.post("/api/items")
async def create_item(item: dict):
    return {"message": "Item created", "item": item}


class SaveProjectPayload(BaseModel):
    path: str
    data: dict

@app.post("/api/project/save")
async def save_project(payload: SaveProjectPayload):
    try:
        path = payload.path
        data = payload.data
        
        json_str = json.dumps(data)
        compressed = gzip.compress(json_str.encode("utf-8"))
        with open(path, "wb") as f:
            f.write(compressed)
        return {"message", f"Saved project to {path}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/project/open")
async def open_project(path: str):
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail=f"{path} could not be found")
        with open(path, "rb") as f:
            compressed = f.read()
        json_str = gzip.decompress(compressed).decode("utf-8")
        data = json.loads(json_str)
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = 8000

    uvicorn.run(app, host="0.0.0.0", port=port)
