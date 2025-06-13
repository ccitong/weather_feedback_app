import os
import pyodbc
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from dotenv import load_dotenv
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('feedback_summary.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Email configuration - Hardcoded settings
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SENDER_EMAIL = 'ccitong@gmail.com'  # Replace with your Gmail address
SENDER_PASSWORD = 'ymok wnnu npqk zxly'  # Replace with your Gmail app password
RECIPIENT_EMAIL = 'yungar@gmail.com' # Replace with recipient's email address

# Database configuration
DB_SERVER = 'SUZIE_E16\\SQLEXPRESS'
DB_NAME = 'Testing'
DB_USER = 'sa'
DB_PASSWORD = 'sa_ab12cd34'

def get_db_connection():
    """Create and return a database connection"""
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASSWORD}'
    return pyodbc.connect(conn_str)

def get_unsent_feedback():
    """Retrieve unsent feedback from the database"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                id,
                CASE WHEN actionRequired = 1 THEN 'Action Required' ELSE 'No Action Required' END as action_status,
                postalCode,
                municipality,
                feedback,
                dateOfInteraction
            FROM weather_feedback
            WHERE sentDate IS NULL
            ORDER BY dateOfInteraction DESC
        """
        cursor.execute(query)
        return cursor.fetchall()

def update_sent_date(feedback_ids):
    """Update sentDate for processed feedback"""
    if not feedback_ids:
        return

    with get_db_connection() as conn:
        cursor = conn.cursor()
        placeholders = ','.join('?' * len(feedback_ids))
        query = f"""
            UPDATE weather_feedback
            SET sentDate = GETDATE()
            WHERE id IN ({placeholders})
        """
        cursor.execute(query, feedback_ids)
        conn.commit()

def create_email_content(feedback_records):
    """Create HTML email content from feedback records"""
    if not feedback_records:
        return "No new feedback to report."

    html_content = """
    <html>
    <head>
        <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .no-action { color: green; }
            .action-required { color: red; }
        </style>
    </head>
    <body>
        <h2>Weather Feedback Summary</h2>
        <p>Generated on: {}</p>
        <table>
            <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Action Status</th>
                <th>Feedback</th>
            </tr>
    """.format(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    for record in feedback_records:
        status_class = "no-action" if record.action_status == "No Action Required" else "action-required"
        html_content += f"""
            <tr>
                <td>{record.dateOfInteraction.strftime("%Y-%m-%d %H:%M")}</td>
                <td>{record.municipality} ({record.postalCode})</td>
                <td class="{status_class}">{record.action_status}</td>
                <td>{record.feedback if record.feedback else '-'}</td>
            </tr>
        """

    html_content += """
        </table>
        <p>Total records: {}</p>
    </body>
    </html>
    """.format(len(feedback_records))

    return html_content

def send_email(subject, html_content):
    """Send email with the feedback summary"""
    try:
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = SENDER_EMAIL
        message['To'] = RECIPIENT_EMAIL

        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(message)
            
        logger.info("Email sent successfully")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def main():
    try:
        logger.info("Starting feedback summary process")
        
        # Get unsent feedback
        feedback_records = get_unsent_feedback()
        if not feedback_records:
            logger.info("No new feedback to process")
            return

        # Create email content
        html_content = create_email_content(feedback_records)
        
        # Send email
        subject = f"Weather Feedback Summary - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        if send_email(subject, html_content):
            # Update sent date for processed records
            feedback_ids = [record.id for record in feedback_records]
            update_sent_date(feedback_ids)
            logger.info(f"Successfully processed {len(feedback_ids)} feedback records")
        else:
            logger.error("Failed to send email, records will be processed in next batch")

    except Exception as e:
        logger.error(f"Error in main process: {str(e)}")
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    main() 