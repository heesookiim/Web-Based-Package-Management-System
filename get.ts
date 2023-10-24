import express, { Request, Response, Express } from 'express';
import axios from 'axios';
import { logger } from './analyze';  // assuming logger setup is in 'analyze.ts'
import { Package, PackageRating } from './schema';

export async function getPackageServer(dataUrl: string, secretToken: string): Promise<Express> {
    logger.info('Setting up GET /package/ endpoint');
    const app = express();
    app.use(express.json());
  
    let packages: Package[] = [];  // Updated the type to Package
  
    try {
        logger.info('Fetching initial package data');
        const response = await axios.get(dataUrl);
        packages = response.data;
        logger.debug('Fetched package data:', response);
    } catch (error) {
        logger.error('Error fetching package data:', error);
        throw error;
    }
  
    // Middleware to check for X-Authorization header
    app.use((req: Request, res: Response, next) => {
        const requestToken = req.header('X-Authorization');
        logger.debug('Request Token:', requestToken);
        if (!requestToken || requestToken !== secretToken) {
            logger.error('Unauthorized access');
            return res.status(400).json({ error: 'Unauthorized' });
        }
        next();
    });

    // GET /package/byName/{name}
    app.get('/package/byName/:name', async (req: Request, res: Response) => {
        logger.info('Setting up GET /package/{name} endpoint');
        logger.info(`Fetching package with Name ${req.params.name}`);
        const packageName = req.params.name;

        const response = await axios.get(`${dataUrl}/package/byName/${packageName}/history`, {
            headers: {
                'X-Authorization': secretToken
            }
        });

        if (!response || response.data.length === 0) {
            logger.warn(`Package ${packageName} not found`);
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.status(200).json(response.data.length === 1 ? response.data[0] : response.data);
        
    });
    
    app.get('/package/byName/', async (req: Request, res: Response) => {
        logger.info('Inside /package/byName/ without name');
        logger.warn('Package name is missing');
        return res.status(400).json({ error: 'Package name is required' });
    });
  
    // GET /package/{id}
    app.get('/package/:id', async (req: Request, res: Response) => {
        logger.info('Setting up GET /package/{id} endpoint');
        logger.info(`Fetching package with ID ${req.params.id}`);

        const packageId = req.params.id;
        const pkg = packages.find(p => p.metadata.ID === packageId);  // Updated this line to use p.metadata.ID

        if (!pkg) {
            logger.warn(`Package with ID ${packageId} not found`);
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json(pkg);
    });

    app.get('/package/', async (req: Request, res: Response) => {
        logger.warn(`Package ID is missing`);
        return res.status(400).json({ error: 'Unauthorized' });
    });

    // // DISCUSS WITH ARRYAN
    // // GET /package/{id}/rate 
    // app.get('/package/:id/rate', (req: Request, res: Response) => {
    //     logger.info(`Fetching rating for package with ID ${req.params.id}`);
    
    //     const packageId = req.params.id;
    //     const pkg = packages.find(p => p.metadata.ID === packageId);
    
    //     if (!pkg) {
    //         logger.warn(`Package with ID ${packageId} not found`);
    //         return res.status(404).json({ error: 'Package does not exist.' });
    //     }
    
    //     // TODO: Fetch the rating for the package.
    //     // For now, let's assume every package has a rating stored in a `rating` property.
    //     // If the rating wasn't computed successfully or if there's an error, you might want to handle it here.
    //     const rating: PackageRating | undefined = pkg.rating;
    
    //     if (!rating) {
    //         // This assumes that if a rating isn't present, it's because of an error during computation.
    //         // You might need more specific error handling based on your application's needs.
    //         return res.status(500).json({ error: 'The package rating system choked on at least one of the metrics.' });
    //     }
    
    //     res.json(rating);
    // });
  
    return app;
  }