import express from 'express';
import { getTickets, getTicketById, createTicket, replyTicket, updateTicketStatus } from '../controllers/ticketController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();
router.route('/').get(protect, admin, getTickets).post(createTicket); // public create
router.route('/:id').get(protect, admin, getTicketById);
router.post('/:id/reply', protect, admin, replyTicket);
router.patch('/:id/status', protect, admin, updateTicketStatus);
export default router;
