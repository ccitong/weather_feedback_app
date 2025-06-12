@echo off
REM Change to the specified project directory
cd /d C:\Workspace\Seneca_Semester\weather_feedback_app

REM Run the feedback summary script
python send_feedback_summary.py

REM Pause to keep the window open if run manually
pause 