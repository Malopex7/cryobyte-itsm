import { Router } from 'express';
import { upload } from '../../middlewares/upload.js';
import Client from '../../models/Client.js';
import Ticket from '../../models/Ticket.js';
import { AppError } from '../../middlewares/error.js';

const router = Router();

// Regular expression to parse email address from "From" header (e.g. "John Doe <john@company.com>")
const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/;

router.post('/', upload.any(), async (req, res, next) => {
  try {
    const { from, subject, text, html } = req.body;

    if (!from) {
      return next(new AppError('Missing "from" email parameter in webhook payload', 400));
    }

    // 1. Extract clean email address
    const emailMatch = from.match(emailRegex);
    const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : null;
    if (!senderEmail) {
      return next(new AppError('Could not parse sender email address from payload', 400));
    }

    // 2. Extract domain name from email
    const domain = senderEmail.split('@')[1];

    // 3. Resolve Client by matching domain in Client domains array
    let client = await Client.findOne({ domains: domain });

    // Fallback: If no client domain matches, look for default client
    if (!client) {
      client = await Client.findOne({ name: 'Default Client' });

      // If no default client exists, create one
      if (!client) {
        client = new Client({
          name: 'Default Client',
          domains: ['default.com'],
          contactEmail: 'support@default.com'
        });
        await client.save();
      }
    }

    // 4. Set subject and body descriptions
    const ticketSubject = subject ? subject.trim() : 'Email Ticket (No Subject)';
    const ticketDescription = (text || html || 'No email body content provided').trim();

    // 5. Map processed GridFS uploads to Ticket schema attachments array
    const attachments = (req.files || []).map(file => ({
      fileId: file.fileId,
      filename: file.filename,
      contentType: file.contentType
    }));

    // 6. Instantiate and save the ticket
    // Default matrix values: impact 2, urgency 2 resolves to P3 (Medium)
    const newTicket = new Ticket({
      clientId: client._id,
      subject: ticketSubject,
      description: ticketDescription,
      matrix: { impact: 2, urgency: 2 },
      attachments
    });

    await newTicket.save();

    res.status(201).json({
      status: 'success',
      message: 'Ticket successfully ingested from email parse webhook',
      data: {
        ticket: newTicket
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
