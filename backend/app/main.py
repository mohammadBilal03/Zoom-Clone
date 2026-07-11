from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import meetings, users, signaling
from .seed import seed

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zoom Clone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # relaxed for local/dev deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(meetings.router)
app.include_router(signaling.router)


@app.on_event("startup")
def on_startup():
    seed()


@app.get("/api/health")
def health():
    return {"status": "ok"}
