import { Router, Request, Response } from 'express';
import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from "../db";
import { logger } from "../../logger_cfg";

const router = Router();
let table = `${dbName}.${tableName}`

router.get('/:id', async (req: Request, res: Response) => {
    const packageId: schema.PackageID = req.params.id;  // filter packageID input
    logger.info(`GET package/${packageId}`)
    
    // make sure ID is present in request
    if(!packageId) {
        logger.info('Missing/invalid package ID, returning status 400')
        return res.status(400).json({error: 'Missing field or ID improperly formed'});
    }

    // connect to database
    let connection;
    try {
        connection = await connectToDatabase();
    } catch (error) {
        logger.error(`Failed to connect with database. Error 503`);
        return res.status(503).json({error: `Error connecting to the database: ${error}`});
    }
    logger.debug('Successfully connected to database');

    // query database
    // not sure how to set up query to return package data
    let packageFound: any;
    try {
        logger.debug('Checking if package exists in database');
        packageFound = await connection.execute(
            `SELECT * FROM ${table} WHERE id = ?`, [packageId]);

    } catch (error) {
        logger.error('Failed databse query');
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    // return based on success in finding package
    if(packageFound) {
        logger.info('Package successfully found: ' + packageFound[0]);

        // fill in variables with data to be returned
        let packageMetadata: schema.PackageMetadata = {
            Name: packageFound[0].Name,
            Version: packageFound[0].Version,
            ID: packageFound[0].ID
        };
        let packageData: schema.PackageData = {
            JSProgram: packageFound[0].JSProgram
        };
        if(packageFound[0].Content) {
            packageData.Content = packageFound[0].Content;
        }
        if(packageFound[0].URL) {
            packageData.URL = packageFound[0].URL;
        }
        const data: schema.Package = {  // data and metadata for package
            metadata: packageMetadata,
            data: packageData
        }

        logger.info(`returning status 200: ${data}`);
        return res.status(200).json(data);
    } else {
        logger.error('error: package does not exist')
        return res.status(404).json({error: 'Package does not exist'});
    }
});

export default router;