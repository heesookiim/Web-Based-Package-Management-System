import express, { Request, Response, Express } from 'express';
import axios from 'axios';
import { logger } from './analyze';  // assuming logger setup is in 'analyze.ts'
import { Package, PackageMetadata, PackageData } from './schema';

export async function getPackageServer(dataUrl: string, secretToken: string): Promise<Express> {
    logger.info('Setting up GET /package/{id} endpoint');
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
  
    // GET /package/{id}
    app.get('/package/:id', (req: Request, res: Response) => {
        logger.info(`Fetching package with ID ${req.params.id}`);

        const packageId = req.params.id;
        const pkg = packages.find(p => p.metadata.ID === packageId);  // Updated this line to use p.metadata.ID

        if (!pkg) {
            logger.warn(`Package with ID ${packageId} not found`);
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json(pkg);
    });
  
    return app;
  }