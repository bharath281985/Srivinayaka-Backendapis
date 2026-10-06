import bcrypt from 'bcryptjs';

const users = [
    {
        name: 'Admin User',
        email: 'admin@sarees.com',
        phone: '9999999999',
        password: bcrypt.hashSync('password123', 10), // Fixes insertMany bypassing pre-save hooks
        isAdmin: true,
    }
];

export default users;
