from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.pdfs import router as pdfs_router
from app.api.routes.chat import router as chat_router
from app.api.routes.notes import router as notes_router
from app.api.routes.settings import router as settings_router
from app.api.routes.extracted_data import router as extracted_data_router
from app.api.routes.mind_map import router as mind_map_router
from app.core.config import settings

app = FastAPI(title='PDF Intelligence API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(health_router, prefix='/api')
app.include_router(pdfs_router, prefix='/api')
app.include_router(chat_router, prefix='/api')
app.include_router(notes_router, prefix='/api')
app.include_router(settings_router, prefix='/api')
app.include_router(extracted_data_router, prefix='/api')
app.include_router(mind_map_router, prefix='/api')


@app.get('/')
def root() -> dict[str, str]:
    return {'message': 'PDF Intelligence API is running'}
