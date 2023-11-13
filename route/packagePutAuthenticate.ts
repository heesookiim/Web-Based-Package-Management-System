import { Router, Request, Response } from 'express';
import { AuthenticationRequest } from './schema'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Initialize dotenv to use environment variables
dotenv.config();

const router = Router();

// PUT /authenticate to create an access token
router.put('/authenticate', async (req: Request, res: Response) => {
    const authRequest: AuthenticationRequest = req.body;
    //const password: UserAuthenticationInfo = req.body;

    // Validate the presence of the required fields
    if (!authRequest || !authRequest.User || !authRequest.Secret || !authRequest.User.name || !authRequest.Secret.password) {
        return res.status(400).json({ error: 'There is missing field(s) in the AuthenticationRequest or it is formed improperly.' });
    }

    // This should check if the user exists and if the password is correct
    const isValidUser = await validateUserCredentials(authRequest.User.name, authRequest.Secret.password);
    if (!isValidUser) {
        return res.status(401).json({ error: 'The user or password is invalid.' });
    }

    // JWT Secret from environment variables
    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
    if (!JWT_SECRET_KEY) {
        return res.status(501).json({ error: 'This system does not support authentication.' });
    }

    // Generate JWT
    const token = jwt.sign(
        { name: authRequest.User.name, isAdmin: authRequest.User.isAdmin },
        JWT_SECRET_KEY,
        { expiresIn: '1h' } // Token expires in 1 hour
        // Example values: 
        // '100' - 100 milliseconds
        // '30s' - token will expire in 30 seconds
        // '20m' - token will expire in 20 minutes
        // '2d' - 2 days
        // '2.5 hrs' - 2 and a half hours
        // '1y' - 1 year
    );

    // Return the token
    res.status(200).json({ AuthenticationToken: token });
});

export default router;

async function validateUserCredentials(username: string, password: string): Promise<boolean> {
    const user = mockUserDatabase[username]; // TEMPORARY
    // Replace with real user database
    
    // Check if user exists and the password is correct
    if (user) {
        // Compare the provided password with the hashed password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);
        return isMatch;
    }
    
    return false;
}

// For Testing
// User validation logic (hypothetical example using a mock database)
const mockUserDatabase = {
    'exampleUser': { password: 'hashedPassword', isAdmin: true } // hashedPassword should be a bcrypt hash
};