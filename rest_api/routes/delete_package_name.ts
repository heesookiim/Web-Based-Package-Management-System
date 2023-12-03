import { Router, Request, Response } from 'express';
import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from "../db";
import { logger } from "../../logger_cfg";

const router = Router();
let table = `${dbName}.${tableName}`

router.delete('/byName/:name', async (req: Request, res: Response) => {
    const packageName: schema.PackageID = req.params.name;  // filter packageID input
    logger.info(`DELETE package/${packageName}`)
    
    // make sure ID is present in request
    if(!packageName) {
        logger.info('Missing/invalid package Name, returning status 400')
        return res.status(400).json({error: 'There is missing field(s) in the PackageName/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.'});
    }

    // connect to database
    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        logger.error(`Failed to connect with database. Error 503: ${error}`);
        return res.status(503).json({error: `Error connecting to the database: ${error}`});
    }
    logger.debug('Successfully connected to database');

    // delete package from database
    try {
        logger.debug('Finding package in database');
        await connection.execute(`DELETE FROM ${table} WHERE Name = ?`, [packageName]);   // delete package
        
        logger.info(`returning status 200, deleted package`);
        return res.status(200).json({Success: 'Package is deleted.'});
    } catch (error) {
        logger.error(`Failed databse query: ${error}`);
        return res.status(404).json({
            error: 'Package does not exist.',
        });
    }
});

export default router;