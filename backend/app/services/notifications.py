import os
import smtplib
import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Notification

logger = logging.getLogger(__name__)

def record_notification(
    db: Session,
    complaint_id: int,
    notification_type: str,
    recipient: str,
    message: str,
    delivery_status: str = "Delivered"
):
    try:
        notif = Notification(
            complaint_id=complaint_id,
            notification_type=notification_type,
            recipient=recipient,
            delivery_status=delivery_status,
            message=message,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record notification: {e}")
        db.rollback()

def send_complaint_assigned_email(
    db: Session,
    complaint_id: int,
    citizen_name: str,
    citizen_email: str,
    public_id: str,
    worker_name: str,
    location: str
):
    subject = f"Complaint Received: Ticket #{public_id} - Smart Waste Management"
    body_text = f"""Hello {citizen_name},

Thank you for reporting illegal waste dumping at {location}.
Your ticket number is: {public_id}

Our system has assigned this job to worker {worker_name}.
You can track the cleanup progress anytime at:
http://localhost:5173/track

Keeping our streets clean, one report at a time.
Smart Waste Management Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }}
    .header {{ background-color: #10B981; color: #FFFFFF; padding: 24px; text-align: center; }}
    .header h1 {{ margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }}
    .ticket-badge {{ display: inline-block; background-color: #FFFFFF; color: #065F46; padding: 8px 18px; border-radius: 20px; font-weight: 700; font-size: 16px; margin-top: 8px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }}
    .body-content {{ padding: 24px; line-height: 1.6; font-size: 15px; }}
    .info-card {{ background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0; }}
    .btn {{ display: inline-block; background-color: #10B981; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 10px; }}
    .footer {{ padding: 16px 24px; background: #F8FAFC; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Waste Report Filed Successfully</h1>
      <div class="ticket-badge">{public_id}</div>
    </div>
    <div class="body-content">
      <p>Hello <strong>{citizen_name}</strong>,</p>
      <p>Thank you for reporting an illegal waste dump. Your report has been registered in the municipal system and assigned to an on-duty sanitation worker.</p>
      
      <div class="info-card">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Ticket Number:</td>
            <td style="padding: 6px 0; color: #10B981; font-weight: 700; text-align: right;">{public_id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Assigned Worker:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 500; text-align: right;">{worker_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Location:</td>
            <td style="padding: 6px 0; color: #0F172A; font-weight: 500; text-align: right;">{location}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Status:</td>
            <td style="padding: 6px 0; color: #D97706; font-weight: 600; text-align: right;">Assigned</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center;">
        <a href="http://localhost:5173/track" class="btn">Track Your Complaint Live</a>
      </p>

      <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
        Once the cleanup is completed, you will receive a follow-up email containing the <strong>photo verification of the cleaned site</strong>.
      </p>
    </div>
    <div class="footer">
      Smart Waste Management Platform &bull; Keeping Our Streets Clean
    </div>
  </div>
</body>
</html>"""

    status = _dispatch_email(
        to_email=citizen_email,
        subject=subject,
        body_text=body_text,
        html_content=html_content
    )
    record_notification(db, complaint_id, "ComplaintAssigned", citizen_email, body_text, status)

def send_complaint_completed_email(
    db: Session,
    complaint_id: int,
    citizen_name: str,
    citizen_email: str,
    public_id: str,
    worker_name: str,
    proof_image_path: Optional[str] = None,
    proof_image_url: Optional[str] = None
):
    subject = f"Cleaned and Verified: Ticket #{public_id} Completed! - Smart Waste Management"
    
    body_text = f"""Hello {citizen_name},

Good news! Your reported waste dump (Ticket #{public_id}) has been cleaned and verified by {worker_name}.

The photo of the cleaned area is attached to this email for your verification.

You can also view the full cleanup verification and before/after details on the tracking portal:
http://localhost:5173/track

Thank you for helping keep our environment clean!
Smart Waste Management Team
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }}
    .header {{ background-color: #10B981; color: #FFFFFF; padding: 24px; text-align: center; }}
    .header h1 {{ margin: 0 0 8px 0; font-size: 22px; font-weight: 700; }}
    .badge {{ display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #FFFFFF; padding: 4px 12px; border-radius: 16px; font-weight: 600; font-size: 13px; }}
    .body-content {{ padding: 24px; line-height: 1.6; font-size: 15px; }}
    .proof-container {{ margin: 20px 0; padding: 14px; background: #F1F5F9; border-radius: 8px; text-align: center; border: 1px dashed #CBD5E1; }}
    .proof-img {{ max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 10px; }}
    .btn {{ display: inline-block; background-color: #10B981; color: #FFFFFF !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }}
    .footer {{ padding: 16px 24px; background: #F8FAFC; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cleanup Completed & Verified</h1>
      <div class="badge">Ticket #{public_id}</div>
    </div>
    <div class="body-content">
      <p>Hello <strong>{citizen_name}</strong>,</p>
      <p>Good news! Your reported waste dump has been cleaned and verified by sanitation worker <strong>{worker_name}</strong>.</p>
      
      <div class="proof-container">
        <strong style="color: #0F172A;">Cleaned Area Proof Photo:</strong><br />
        <img class="proof-img" src="cid:proof_image_attachment" alt="Cleaned Area Proof" />
      </div>

      <p style="text-align: center;">
        <a href="http://localhost:5173/track" class="btn">View Live Status in Portal</a>
      </p>
      
      <p style="font-size: 13px; color: #64748B; margin-top: 20px;">
        A copy of the cleaned area photo is also attached directly to this email for your records.
      </p>
    </div>
    <div class="footer">
      Smart Waste Management Platform &bull; Clean City Initiative
    </div>
  </div>
</body>
</html>"""

    status = _dispatch_email(
        to_email=citizen_email,
        subject=subject,
        body_text=body_text,
        html_content=html_content,
        attachment_path=proof_image_path
    )
    
    att_info = f" [Attached: {os.path.basename(proof_image_path)}]" if (proof_image_path and os.path.exists(proof_image_path)) else ""
    record_notification(
        db,
        complaint_id,
        "ComplaintCompleted",
        citizen_email,
        f"{body_text}{att_info}",
        status
    )

def _dispatch_email(
    to_email: str,
    subject: str,
    body_text: str,
    html_content: Optional[str] = None,
    attachment_path: Optional[str] = None
) -> str:
    """Send email if SMTP credentials are provided; otherwise simulate gracefully with attachments logged."""
    server = settings.SMTP_SERVER.strip()
    if not server:
        att_name = os.path.basename(attachment_path) if attachment_path and os.path.exists(attachment_path) else "None"
        logger.info(f"[SIMULATED EMAIL] To: {to_email} | Subject: {subject} | Proof Image Attached: {att_name}")
        return "Simulated"

    try:
        msg = MIMEMultipart("related")
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = subject

        # Create alternative part for plain text and html
        msg_alt = MIMEMultipart("alternative")
        msg_alt.attach(MIMEText(body_text, "plain", "utf-8"))
        if html_content:
            msg_alt.attach(MIMEText(html_content, "html", "utf-8"))
        msg.attach(msg_alt)

        # Attach clean area proof image
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                img_bytes = f.read()

            # Inline image for HTML (cid:proof_image_attachment)
            inline_img = MIMEImage(img_bytes)
            inline_img.add_header("Content-ID", "<proof_image_attachment>")
            inline_img.add_header("Content-Disposition", "inline", filename=os.path.basename(attachment_path))
            msg.attach(inline_img)

            # Downloadable file attachment
            file_att = MIMEBase("application", "octet-stream")
            file_att.set_payload(img_bytes)
            encoders.encode_base64(file_att)
            file_att.add_header("Content-Disposition", f"attachment; filename=cleaned_proof_{os.path.basename(attachment_path)}")
            msg.attach(file_att)

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        return "Delivered"
    except Exception as e:
        logger.warning(f"SMTP dispatch failed: {e}. Saved as Simulated.")
        return "Simulated"
