import { Router } from 'express';
import Client from '../../models/Client.js';
import Ticket from '../../models/Ticket.js';
import { AppError } from '../../middlewares/error.js';

const router = Router();

/**
 * Helper: Parses the raw text payload from the slash command.
 * Supports: "subject: VPN issue | description: VPN is blocked | impact: 2 | urgency: 3"
 * Falls back to treating the whole text as both subject and description.
 */
const parseSlashText = (text, username, channel) => {
  const result = {
    subject: '',
    description: '',
    impact: 2, // Default: Medium
    urgency: 2  // Default: Medium
  };

  if (!text || !text.trim()) {
    result.subject = `ChatOps ticket by ${username}`;
    result.description = `Created via slash command by user ${username} in channel #${channel}.`;
    return result;
  }

  // Check if text is structured (contains pipes and colons)
  if (text.includes('|') && text.includes(':')) {
    const parts = text.split('|');
    parts.forEach(part => {
      const colonIndex = part.indexOf(':');
      if (colonIndex !== -1) {
        const key = part.substring(0, colonIndex).trim().toLowerCase();
        const value = part.substring(colonIndex + 1).trim();
        
        if (key === 'subject') {
          result.subject = value;
        } else if (key === 'desc' || key === 'description') {
          result.description = value;
        } else if (key === 'impact') {
          const num = parseInt(value, 10);
          if (num >= 1 && num <= 3) result.impact = num;
        } else if (key === 'urgency') {
          const num = parseInt(value, 10);
          if (num >= 1 && num <= 3) result.urgency = num;
        }
      }
    });
  }

  // Fallbacks if structured parsing is missing parameters or wasn't used
  if (!result.subject) {
    result.subject = text.length > 80 ? text.substring(0, 77) + '...' : text;
  }
  if (!result.description) {
    result.description = text;
  }

  return result;
};

router.post('/', async (req, res, next) => {
  try {
    const { command, text, user_name, channel_name, team_domain } = req.body;

    // Validate request
    if (!command) {
      return next(new AppError('Missing Slack/Teams "command" parameter', 400));
    }

    // 1. Parse fields from command text parameter
    const parsedText = parseSlashText(text, user_name || 'unknown', channel_name || 'unknown');

    // 2. Resolve Client matching Slack team subdomain domain labels
    let client;
    if (team_domain) {
      client = await Client.findOne({
        $or: [
          { domains: team_domain.toLowerCase() },
          { domains: `${team_domain.toLowerCase()}.com` }
        ]
      });
    }

    // Fallback: If no client matches, use the Default Client
    if (!client) {
      client = await Client.findOne({ name: 'Default Client' });

      // Create Default Client if it does not exist
      if (!client) {
        client = new Client({
          name: 'Default Client',
          domains: ['default.com'],
          contactEmail: 'support@default.com'
        });
        await client.save();
      }
    }

    // 3. Create the ticket
    const newTicket = new Ticket({
      clientId: client._id,
      subject: parsedText.subject,
      description: parsedText.description,
      matrix: {
        impact: parsedText.impact,
        urgency: parsedText.urgency
      }
    });

    await newTicket.save();

    // 4. Respond with Slack-compatible JSON structure
    res.status(201).json({
      response_type: 'in_channel',
      text: `✅ *Ticket Created Successfully!*`,
      attachments: [
        {
          color: '#1e293b',
          title: `${newTicket.ticketId}: ${newTicket.subject}`,
          text: `*Description:* ${newTicket.description}\n*Priority:* ${newTicket.priority}\n*Status:* ${newTicket.status}\n*Client:* ${client.name}`,
          mrkdwn_in: ['text']
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
