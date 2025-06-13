from sqlalchemy import create_engine, text
from database import Base, engine
from models import WeatherFeedback

def update_schema():
    try:
        # Create a connection
        with engine.connect() as connection:
            # Check if the weather column exists
            result = connection.execute(text("""
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'weather_feedback'
                AND COLUMN_NAME = 'weather'
            """))
            
            if result.scalar() == 0:
                print("Adding weather column...")
                # Add the weather column
                connection.execute(text("""
                    ALTER TABLE weather_feedback
                    ADD weather NVARCHAR(200) NOT NULL DEFAULT 'Weather data not available'
                """))
                print("Weather column added successfully.")
            else:
                print("Weather column already exists.")

            # Check if is_satisfied column exists
            result = connection.execute(text("""
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'weather_feedback'
                AND COLUMN_NAME = 'is_satisfied'
            """))
            
            if result.scalar() > 0:
                print("Renaming is_satisfied column to actionRequired...")
                # Rename the column
                connection.execute(text("""
                    EXEC sp_rename 'weather_feedback.is_satisfied', 'actionRequired', 'COLUMN'
                """))
                print("Column renamed successfully.")
            else:
                # Check if actionRequired column exists
                result = connection.execute(text("""
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = 'weather_feedback'
                    AND COLUMN_NAME = 'actionRequired'
                """))
                
                if result.scalar() == 0:
                    print("Adding actionRequired column...")
                    # Add the actionRequired column
                    connection.execute(text("""
                        ALTER TABLE weather_feedback
                        ADD actionRequired BIT NOT NULL DEFAULT 0
                    """))
                    print("actionRequired column added successfully.")
                else:
                    print("actionRequired column already exists.")

            # Commit the changes
            connection.commit()
            print("Schema update completed successfully.")

    except Exception as e:
        print(f"Error updating schema: {str(e)}")
        raise

if __name__ == "__main__":
    update_schema() 