-- Drop the existing table if it exists
DROP TABLE IF EXISTS weather_feedback;
GO

-- Create the table with proper IDENTITY column
CREATE TABLE weather_feedback (
    id INT IDENTITY(1,1) PRIMARY KEY,
    weatherCondition NVARCHAR(100) NOT NULL,
    postalCode NVARCHAR(7) NOT NULL,
    municipality NVARCHAR(100) NOT NULL,
    feedback NVARCHAR(500) NULL,
    dateOfInteraction DATETIME NOT NULL
);
GO 