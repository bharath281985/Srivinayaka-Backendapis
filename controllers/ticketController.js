import Ticket from '../models/ticketModel.js';

const getTickets = async (req, res) => { res.json(await Ticket.find({}).sort({ createdAt: -1 })); };
const getTicketById = async (req, res) => {
    const t = await Ticket.findById(req.params.id);
    t ? res.json(t) : res.status(404).json({ message: 'Not found' });
};
const createTicket = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const ticket = await Ticket.create({ name, email, subject, messages: [{ sender: 'customer', message }] });
        res.status(201).json(ticket);
    } catch (e) { res.status(400).json({ message: e.message }); }
};
const replyTicket = async (req, res) => {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });
    ticket.messages.push({ sender: 'admin', message: req.body.message });
    ticket.status = 'In Progress';
    res.json(await ticket.save());
};
const updateTicketStatus = async (req, res) => {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Not found' });
    ticket.status = req.body.status;
    res.json(await ticket.save());
};
export { getTickets, getTicketById, createTicket, replyTicket, updateTicketStatus };
