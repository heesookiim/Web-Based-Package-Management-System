import { Router, Request, Response } from 'express';
import axios from 'axios';
import { PackageData, PackageMetadata, PackageRating, AuthenticationToken } from './schema'; 
import { logger } from './analyze';

const router = Router();

router.post('/package', async (req: Request, res: Response) => {
    const xAuthorization: AuthenticationToken = req.headers['Please enter authorization token'] as string;
    if (!xAuthorization) {
        return res.status(400).json({ error: 'Missing or invalid X-Authorization header.' });
    }

    const { Content, JSProgram, URL } = req.body.data as PackageData;
    const { Name, Version, ID } = req.body.metadata as PackageMetadata;
    const rating = req.body.rating as PackageRating;

    if (!Content || !JSProgram || !URL) {
        return res.status(400).json({
            error: "There is missing field(s) in the PackageData or it is formed improperly."
        });
    }

    if (await checkPackageExistence(Content, URL, xAuthorization)) {
        return res.status(409).json({
            error: "Package exists already."
        });
    }

    // Check the NetScore in the rating
    if (rating && rating.NetScore !== -1 && rating.NetScore <= 0.5) {
        return res.status(424).json({
            error: "Package is not uploaded due to the disqualified rating."
        });
    }

    await savePackageToURL(URL, { Content, JSProgram, xAuthorization });

    const responseData = {
        metadata: { Name, Version, ID },
        data: { Content, JSProgram }
    };

    return res.status(201).json(responseData);
});

async function savePackageToURL(url: string, data: { Content: string; JSProgram: string; xAuthorization: string }): Promise<void> {
    try {
        const response = await axios.post(url, data, {
            headers: {
                'X-Authorization': data.xAuthorization
            }
        });

        if (response.status !== 200) {
            throw new Error('Failed to save package to the provided URL.');
        }
    } catch (error) {
        //logger.error(`Error in savePackageToURL: ${error}`);
        throw new Error('Failed to save package to the provided URL.');
    }
}

async function checkPackageExistence(content: string, URL: string, xAuthorization: string): Promise<boolean> {
    try {
        const response = await axios.get(URL, {
            headers: {
                'X-Authorization': xAuthorization
            },
            params: {
                content: content
            }
        });

        return response.data && response.data.length > 0;
    } catch (error) {
        //logger.error(`Error in checkPackageExistence: ${error}`);
        return false;
    }
}

export default router;
