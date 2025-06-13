from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, constr
from typing import Optional
from datetime import datetime
import models
from database import engine, get_db
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for request validation
class WeatherFeedbackCreate(BaseModel):
    actionRequired: bool                                        # True for action required, False for no action required
    postalCode: constr(pattern=r'^[A-Za-z][0-9][A-Za-z]\s?[0-9][A-Za-z][0-9]$')  # Canadian postal code format
    municipality: constr(min_length=1, max_length=100)      # City/municipality
    feedback: Optional[str] = None                          # Optional feedback text
    dateOfInteraction: str                                  # Date and time as string from Angular
    weather: Optional[str] = None                           # Optional weather information

@app.post("/feedback")
async def create_feedback(
    feedback: WeatherFeedbackCreate,
    db: Session = Depends(get_db)
):
    try:
        # Log the received data
        logger.info(f"Received feedback data: {feedback}")

        # Parse the date string to datetime
        try:
            date_of_interaction = datetime.fromisoformat(feedback.dateOfInteraction.replace('Z', '+00:00'))
            logger.info(f"Parsed date: {date_of_interaction}")
        except ValueError as e:
            logger.error(f"Date parsing error: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid date format: {feedback.dateOfInteraction}")

        # Create new feedback entry with explicit column mapping
        db_feedback = models.WeatherFeedback(
            actionRequired=feedback.actionRequired,
            postalCode=feedback.postalCode.upper(),  # Ensure postal code is uppercase
            municipality=feedback.municipality,
            feedback=feedback.feedback,
            dateOfInteraction=date_of_interaction,
            weather=feedback.weather or 'Weather data not available'  # Provide default value if None
        )
        
        logger.info("Attempting to add feedback to database")
        # Add to database
        db.add(db_feedback)
        db.commit()
        logger.info("Successfully committed to database")
        db.refresh(db_feedback)
        
        return {"status": "success", "message": "Feedback submitted successfully"}
    
    except Exception as e:
        logger.error(f"Error processing feedback: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000) 