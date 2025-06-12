-- First, rename the existing table to keep it as backup
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[weather_feedback]') AND type in (N'U'))
BEGIN
    EXEC sp_rename 'weather_feedback', 'weather_feedback_old';
END
GO

-- Create the new table with the updated schema
CREATE TABLE weather_feedback (
    id INT IDENTITY(1,1) PRIMARY KEY,
    is_satisfied BIT NOT NULL,
    postalCode NVARCHAR(7) NOT NULL,
    municipality NVARCHAR(100) NOT NULL,
    feedback NVARCHAR(500) NULL,
    dateOfInteraction DATETIME NOT NULL
);
GO

-- Migrate data from the old table if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[weather_feedback_old]') AND type in (N'U'))
BEGIN
    INSERT INTO weather_feedback (
        is_satisfied,
        postalCode,
        municipality,
        feedback,
        dateOfInteraction
    )
    SELECT 
        CASE 
            WHEN weatherCondition IN ('Satisfied', 'positive') THEN 1
            ELSE 0
        END as is_satisfied,
        postalCode,
        municipality,
        feedback,
        dateOfInteraction
    FROM weather_feedback_old;

    -- Drop the old table after successful migration
    DROP TABLE weather_feedback_old;
END
GO 