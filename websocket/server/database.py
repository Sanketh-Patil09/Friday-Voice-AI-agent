from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine("sqlite:///voice_agent.db")
Session = sessionmaker(bind=engine)

Base = declarative_base()

class UserRequest(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    request = Column(String)

Base.metadata.create_all(engine)