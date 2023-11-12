import { Router, Request, Response } from 'express';
import axios from 'axios';
import { PackageRegEx, AuthenticationToken } from './schema'; 
import { logger } from './analyze';

const router = Router();

router.post('/package/byRegEx', async (req: Request, res: Response) => {
    // Extract the regex pattern and authentication token
    const regexPattern = req.headers['please-enter-regex-expression'] as string;
    const xAuthorization: AuthenticationToken = req.headers['Please enter authorization token'] as string;

    // Check for missing or improperly formed fields
    if (!regexPattern || !xAuthorization) {
        return res.status(400).json({ 
            error: 'There is missing field(s) in the PackageRegEx/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.' 
        });
    }

    // Create an object conforming to the PackageRegEx interface
    const packageRegEx: PackageRegEx = { RegEx: regexPattern };

    // Make the request to the external service or internal route
    const response = await axios.post(
        '/package/byRegEx', 
        packageRegEx, 
        {
            headers: { 'X-Authorization': xAuthorization }
        }
    );

    // Handle no package found scenario
    if (response.data.length === 0) {
        return res.status(404).json({ error: 'No package found under this regex' });
    }

    // Return the response data
    res.status(200).json(response.data);
});

export default router;
