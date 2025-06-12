-- Create the database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'weather_feedback')
BEGIN
    CREATE DATABASE weather_feedback;
END
GO

USE weather_feedback;
GO

-- Create the weather_feedback table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[weather_feedback]') AND type in (N'U'))
BEGIN
    CREATE TABLE weather_feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        weatherCondition NVARCHAR(100) NOT NULL,
        postalCode NVARCHAR(7) NOT NULL,
        municipality NVARCHAR(100) NOT NULL,
        feedback NVARCHAR(500) NULL,
        dateOfInteraction DATETIME NOT NULL
    );
END 