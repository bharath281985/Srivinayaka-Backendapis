import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['customer', 'admin'], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    messages: [messageSchema],
    status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
}, { timestamps: true });

ticketSchema.pre('save', function (next) {
    if (!this.ticketNumber) {
        this.ticketNumber = 'TKT-' + Date.now();
    }
    next();
});

export default mongoose.model('Ticket', ticketSchema);
