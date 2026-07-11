from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(db: Session = Depends(get_db)):
    """No auth in this assignment: always returns the single seeded user."""
    return crud.get_default_user(db)
