from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base

class WeatherFeedback(Base):
    __tablename__ = "weather_feedback"

    id = Column(Integer, primary_key=True)  # SQL Server will use IDENTITY
    actionRequired = Column(Boolean, nullable=False)    # True for action required, False for no action required
    postalCode = Column(String(7), nullable=False)           # Canadian postal code
    municipality = Column(String(100), nullable=False)        # City/municipality
    feedback = Column(String(500), nullable=True)            # Optional feedback text
    dateOfInteraction = Column(DateTime, nullable=False)      # Date and time of weather interaction 