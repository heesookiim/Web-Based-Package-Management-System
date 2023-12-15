import { Router, Request, Response } from 'express';
import { PackageData, PackageID, PackageMetadata, PackageRating } from '../../schema';
import { connectToDatabase, tableName, dbName } from "../db";
import { downloadRepo, ZIP, decodeBase64AndExtract } from './post_package';
import { RowDataPacket } from 'mysql2';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../../logger_cfg";
import { fetchNpmDataWithAxios, getGithubUrlFromNpmData, getAllRatings } from "../../rate/analyze";
let getGithubUrl = require('get-github-url');
import * as pathModule from 'path';

// Initialize the router using Express
const router = Router();

// Construct the table name from the database name and table name
let table = `${dbName}.${tableName}`;

router.put('/:id', async (req: Request, res: Response) => {
    const authenticationToken = req.get('X-Authorization');
    if(!authenticationToken || authenticationToken !== '0') {
        //logger.info('PUT package/id no auth token');
        return res.status(400).json('');
    }

    //logger.info('PUT package/:id');

    // Extracting package information from the request parameters
    let packageId: PackageID = req.params.id;
    packageId = req.body.metadata.ID;
    const packageData: PackageData = req.body.data;
    const packageMetadata: PackageMetadata = req.body.metadata;

    // check params id against body id
    if(packageId !== packageMetadata.ID) {
        //logger.info('ID in body does not match ID in params');
        return res.status(400).json(`params: ${packageId} body: ${packageMetadata.ID}`);
    } else {
        //logger.info('Good');
        return res.status(200).json({Success: 'Good'});
    }
});