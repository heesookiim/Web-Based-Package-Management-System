import { Router, Request, Response } from 'express';
import * as schema from './schema';
import { connectToDatabase } from "./db";
const router = Router();

router.post('/', async (req: Request, res: Response) => {
    const { Content, JSProgram, URL } = req.body as schema.PackageData;
//    const { Name, Version, ID } = req.body.metadata as PackageMetadata;
//    const rating = req.body.rating as PackageRating;

    // checks if only either Content or URL is being passsed when inserting a package
    if (
        !((Content && JSProgram && !URL) || (URL && JSProgram && !Content))
    ) {
        console.log(req.body);
        
        
        return res.status(400).json({
            error: "There is missing field(s) in the PackageData or it is formed improperly."
        });
    }
//
//    if (await checkPackageExistence(Content, URL)) {
//        return res.status(409).json({
//            error: "Package exists already."
//        });
//    }

//    // Check the NetScore in the rating
//    if (rating && rating.NetScore !== -1 && rating.NetScore <= 0.5) {
//        return res.status(424).json({
//            error: "Package is not uploaded due to the disqualified rating."
//        });
//    }
    
    // connecting to the mysql database
    const connection = await connectToDatabase();
    let name = 'Underscore';
    let version = '1.0.0';
    let id = 'underscore';
    let responseData : schema.Package;
    if (Content) {
        
        try {
            const [results] = await connection.execute(
                'INSERT INTO packages (Name, Version, ID, Content, JSProgram) VALUES (?, ?, ?, ?, ?)'
                , [name, version, id, Content, JSProgram]);
            await connection.end();
            responseData = {
                metadata: { Name:name, Version:version, ID:id },
                data: { Content, JSProgram }
            };
            
        } catch (error) {
            return res.status(500).json({
                error: "Failed to connect to the database. Please try again later."
            });
        }
        
    } else if (URL) {
        
    } else {
        throw new Error('Package is missing Content/URL');
    }

    return res.status(201).json(responseData);
});

//async function savePackageByContent(data: { Content: string; JSProgram: string;}): Promise<void> {
//    try {
//        console.log(data);
//        const response = await axios.post("", data);
//
//        if (response.status !== 200) {
//            throw new Error('Failed to save package to the provided URL.');
//        }
//    } catch (error) {
//        //logger.error(`Error in savePackageToURL: ${error}`);
//        throw new Error('Failed to save package to the provided URL.');
//    }
//}

//async function checkPackageExistence(content: any, URL: any): Promise<boolean> {
//    try {
//        const response = await axios.get(URL, {
////            headers: {
////                'X-Authorization': xAuthorization
////            },
//            params: {
//                content: content
//            }
//        });
//
//        return response.data && response.data.length > 0;
//    } catch (error) {
//        //logger.error(`Error in checkPackageExistence: ${error}`);
//        return false;
//    }
//}


//
//app.get('/packages', async (req, res) => {
//    try {
//        const connection = await connectToDatabase();
//        const [rows] = await connection.execute('SELECT * FROM packages');
//        connection.end();
//        res.status(200).json(rows);
//    } catch (error) {
//        res.status(500).json({ error: 'Internal Server Error' });
//    }
//});
//


export default router;