import { Router, Request, Response } from 'express';
import * as schema from '../schema';
import { connectToDatabase } from "../db";

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    // console.log('POST /packages performed');
    const offset = parseInt(req.query.offset as string) || 0;
    const package_queries = req.body as schema.PackageQuery[]; 
    const limit = 10;   // number of data rows per page
  
    if (!Array.isArray(package_queries)) {
        return res.status(400).json({ error: "Invalid request body. It should be an array of package queries."});
    }

    const connection = await connectToDatabase();
    try {
        const { Name, Version } = package_queries[0];
        // const ID = Name.toLowerCase();
        if (Name === "*") {
            // console.log('Executing query to retrieve all packages');
            const query = 'SELECT Name, Version, ID FROM `461`.package LIMIT ? OFFSET ?';
            const [results] = await connection.execute(query, [limit + '', offset + '']);
            // const query = 'SELECT Name, Version, ID FROM `461`.package LIMIT 10 OFFSET 0';
            // const [results] = await connection.execute(query);
            console.log(results);

            // console.log('Query successful');
            await connection.end();

            res.setHeader('X-Offset', String(offset));
            res.json(results);
        }
    // THIS ERROR NEEDS MODIFICATION
    } catch (error) {   
        console.error("Database error occurred:", error);
        if (connection) {
            await connection.end();
        }
        return res.status(500).json({error: "Failed to retrieve pacakges."});
    }

})

export default router;