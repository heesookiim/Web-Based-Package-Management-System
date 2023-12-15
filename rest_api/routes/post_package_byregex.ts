import { Router, Request, Response } from 'express';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from '../db';
import { logger } from '../../logger_cfg';

const router = Router();
let table = `${dbName}.${tableName}`

router.post('/byRegEx', async (req: Request, res: Response) => {
    const authenticationToken = req.headers['X-Authorization'];
    if(!authenticationToken) {
        logger.info('POST package/byRegEx no auth token')
        return res.status(400).json('');
    }

    const { RegEx: regex } = req.body as schema.PackageRegEx;
    logger.info(`POST package/byRegEx: ${regex}`);
    if (!regex) {
        return res.status(400).json({error: 'There is missing field(s) in the PackageRegEx/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.'});
    }

    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        logger.error(`Failed POST request. Error 500`);
        return res.status(500).json({
            error: `Error connecting to the database: ${error}`,
        });
    }
    try {
        const [results] = await connection.execute(`SELECT Name, Version, ID FROM ${table} WHERE Name REGEXP ?`, [regex]
        ) as [RowDataPacket[], FieldPacket[]];
    
        if (results.length === 0) {
            logger.debug('Returning 404: No package found');
            return res.status(404).json({error: 'No package found under this regex.'});
        }

        logger.info(`Completing POST /RegEx request`);
        return res.status(200).json(results);
    } catch(error) {
        logger.error('Query failed');
        return res.status(500).json({error: 'Internal Server Error'});
    }
    finally {
        if (connection) {
            await connection.end();
        }
    }
});

export default router;