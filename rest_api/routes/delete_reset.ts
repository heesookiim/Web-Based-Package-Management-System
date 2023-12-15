import { Router, Request, Response } from 'express';
import { connectToDatabase, tableName, dbName } from '../db';
import { logger } from '../../logger_cfg';

const router = Router();
let table = `${dbName}.${tableName}`

router.delete('/', async (req: Request, res: Response) => {
    logger.info('DELETE reset');
    const authenticationToken = req.headers['X-Authorization'];
    if(!authenticationToken) {
        logger.info('DELETE reset no auth token');
        return res.status(400).json('');
    }

    let connection; 
    try {
        connection = await connectToDatabase();
        logger.info("Established connection in delete.");

        // Execute SQL command to delete all records from the specified table
        await connection.execute(`TRUNCATE TABLE ${table}`);
        logger.debug("truncate -- delete");

        // Send a success response
        logger.info("200 OK delete");
        res.status(200).json({ message: 'Registry is reset.' });
    } catch (error) {
        // Handle errors
        res.status(500).json({ error: `Reset failed. ${error}` });
        logger.info("500 delete");
        logger.error(error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

export default router;
