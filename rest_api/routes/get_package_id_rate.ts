import { Router, Request, Response } from 'express';
import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from "../db";
import { logger } from "../../logger_cfg";

const router = Router();
let table = `${dbName}.${tableName}`

router.get('/:id/rate', async (req: Request, res: Response) => {

    const packageId: schema.PackageID = req.params.id;  // filter packageID input
    logger.info(`GET package/${packageId}/rate`)

    // make sure ID is present in request
    if(!packageId) {
        logger.info('Missing/invalid package ID, returning status 400')
        return res.status(400).json({error: 'There is missing field(s) in the PackageID/AuthenticationToken or it is formed improperly, or the AuthenticationToken is invalid.'});
    }

    // connect to database
    let connection;
    try {
        connection = await connectToDatabase();
        logger.debug('Successfully connected to database');
    } catch (error) {
        logger.error(`Failed to connect with database. Error 503: ${error}`);
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    }

    // query database
    let packageFound: any;
    try {
        logger.debug('Checking if package exists in database');
        packageFound = await connection.execute(
            `SELECT * FROM ${table} WHERE ID = ?`, [packageId]);
    
    } catch (error) {
        logger.error(`Failed databse query: ${error}`);
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }

    // return based on success in finding package
    if(packageFound[0][0] != undefined) {
        logger.info('Package successfully found: ' + packageFound[0][0]);

        // fill in variables with data to be returned
        const packageRating: schema.PackageRating = {
            BusFactor: packageFound[0][0].BUS_FACTOR_SCORE,
            Correctness: packageFound[0][0].CORRECTNESS_SCORE,
            RampUp: packageFound[0][0].RAMP_UP_SCORE,
            ResponsiveMaintainer: packageFound[0][0].RESPONSIVE_MAINTAINER_SCORE,
            LicenseScore: packageFound[0][0].LICENSE_SCORE,
            GoodPinningPractice: packageFound[0][0].PINNED_PRACTICE_SCORE,
            PullRequest: packageFound[0][0].PULL_REQUEST_RATING_SCORE,
            NetScore: packageFound[0][0].NET_SCORE
        };

        logger.info('returning status 200: ' + JSON.stringify(packageRating));
        return res.status(200).json(packageRating);
    } else {
        logger.error('error: package does not exist')
        return res.status(404).json({error: 'Package does not exist.'});
    }
});

export default router;