from sqlalchemy import create_engine, text
from database import get_db_connection
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_fix_table():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Check if weather column exists
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'weather_feedback' 
                AND COLUMN_NAME = 'weather'
            """)
            
            if not cursor.fetchone():
                logger.info("Adding weather column to table")
                cursor.execute("""
                    ALTER TABLE weather_feedback
                    ADD weather NVARCHAR(200) NOT NULL DEFAULT 'Weather data not available'
                """)
                conn.commit()
                logger.info("Successfully added weather column")
            else:
                logger.info("Weather column already exists")
            
            # Check if actionRequired column exists
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'weather_feedback' 
                AND COLUMN_NAME = 'actionRequired'
            """)
            
            if not cursor.fetchone():
                logger.info("Adding actionRequired column to table")
                cursor.execute("""
                    ALTER TABLE weather_feedback
                    ADD actionRequired BIT NOT NULL DEFAULT 0
                """)
                conn.commit()
                logger.info("Successfully added actionRequired column")
            else:
                logger.info("actionRequired column already exists")

    except Exception as e:
        logger.error(f"Error checking/fixing table: {str(e)}")
        raise

if __name__ == "__main__":
    check_and_fix_table() 