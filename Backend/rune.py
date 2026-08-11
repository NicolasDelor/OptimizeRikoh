from sqlalchemy import Column, Integer, String
from app.database import Base

class Rune(Base):
    __tablename__ = "runes"

    id = Column(Integer, primary_key=True)
    slot = Column(Integer)
    set_name = Column(String)
    hp = Column(Integer)
    atk = Column(Integer)
    defense = Column(Integer)
    speed = Column(Integer)
    crit_rate = Column(Integer)
    crit_dmg = Column(Integer)
