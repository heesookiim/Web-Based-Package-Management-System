import { Router, Request, Response } from 'express';
import * as schema from '../../schema';
import { connectToDatabase, dbName, tableName } from "../db";
import { logger } from "../../logger_cfg";

const router = Router();
let table = `${dbName}.${tableName}`

router.get('/:id', async (req: Request, res: Response) => {
    const packageId: schema.PackageID = req.params.id;  // filter packageID input
    logger.info(`GET package/${packageId}/rate`)

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
        return res.status(503).json({
            error: `Error connecting to the database: ${error}`,
        });
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
        const packageRating: schema.PackageRating = {
            BusFactor: packageFound[0].BUS_FACTOR_SCORE,
            Correctness: packageFound[0].CORRECTNESS_SCORE,
            RampUp: packageFound[0].RAMP_UP_SCORE,
            ResponsiveMaintainer: packageFound[0].RESPONSIVE_MAINTAINER_SCORE,
            LicenseScore: packageFound[0].LICENSE_SCORE,
            GoodPinningPractice: packageFound[0].PINNED_PRACTICE_SCORE,
            PullRequest: packageFound[0].PULL_REQUEST_RATING_SCORE,
            NetScore: packageFound[0].NET_SCORE
        };

        logger.info(`returning status 200: ${packageRating}`);
        return res.status(200).json(packageRating);
    } else {
        logger.error('error: package does not exist')
        return res.status(404).json({error: 'Package does not exist'});
    }
});

export default router;