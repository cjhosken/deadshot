from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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


if __name__ == "__main__":
    port = 8000

    uvicorn.run(app, host="0.0.0.0", port=port)
