import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { connectToDatabase, tableName } from '../db';
// import { logger } from '../../logger_cfg';

const router = Router();

router.delete('/reset', async (req: Request, res: Response) => {
    try {
        // Delete the '../dump' directory
        await fs.rm('../dump', { recursive: true, force: true });

        let connection = await connectToDatabase();
        // Execute SQL command to delete all records from the specified table
        await connection.execute('DELETE FROM ${tableName}');

        // Send a success response
        res.status(200).json({ message: 'Registry is reset.' });
    } catch (error) {
        // Handle errors
        res.status(500).json({ error: 'Reset failed: ${error.message}' });
    }
});

export default router;
