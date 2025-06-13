# Weather Feedback Application

A web application that allows users to provide feedback about weather conditions in their area.

## Backend Setup (FastAPI)

### Prerequisites
- Python 3.8 or higher
- VSCode
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ccitong/weather_feedback_app.git
   cd weather_feedback_app
   ```

2. **Create and activate a virtual environment**
   ```bash
   # Create virtual environment
   python -m venv .venv

   # Activate virtual environment
   .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Database Setup**
   - Ensure you have SQL Server installed and running
   - Run the database creation script:
     ```bash
     sqlcmd -S <your_server_name> -i create_db.sql
     ```

5. **Running the Backend**
   ```bash
   # Start the FastAPI server
   uvicorn main:app --reload --port 3000
   ```

   The server will start at `http://localhost:3000`

### VSCode Configuration

1. **Select Python Interpreter**
   - Press `Ctrl + Shift + P`
   - Type "Python: Select Interpreter"
   - Choose the interpreter from your `.venv` folder

2. **Install VSCode Extensions**
   - Python (Microsoft)
   - Pylance
   - SQL Server (mssql)

3. **Debug Configuration**
   Create a `.vscode/launch.json` file with:
   ```json
   {
       "version": "0.2.0",
       "configurations": [
           {
               "name": "FastAPI",
               "type": "python",
               "request": "launch",
               "module": "uvicorn",
               "args": [
                   "main:app",
                   "--reload",
                   "--port",
                   "3000"
               ],
               "jinja": true,
               "justMyCode": true
           }
       ]
   }
   ```

### API Documentation
Once the server is running, you can access:
- Swagger UI: `http://localhost:3000/docs`
- ReDoc: `http://localhost:3000/redoc`

### Troubleshooting

1. **Port Already in Use**
   - If port 3000 is already in use, you can change it in the uvicorn command
   - Example: `uvicorn main:app --reload --port 3001`

2. **Database Connection Issues**
   - Verify SQL Server is running
   - Check connection string in `database.py`
   - Ensure you have the correct permissions

3. **Module Not Found Errors**
   - Ensure virtual environment is activated
   - Verify all dependencies are installed
   - Check Python path in VSCode

### Development Tips

1. **Hot Reload**
   - The `--reload` flag enables automatic server restart on code changes
   - No need to manually restart the server during development

2. **Logging**
   - Check `feedback_summary.log` for application logs
   - Server logs appear in the terminal

3. **Database Changes**
   - After modifying models, restart the server
   - Database tables are automatically created/updated

### Environment Variables
Create a `.env` file in the root directory with:
```
DB_SERVER=<your_sql_server>
DB_NAME=weather_feedback
DB_USER=<your_username>
DB_PASSWORD=<your_password>
```

## Frontend Setup
See the frontend README for Angular setup instructions.
