import request from 'supertest';
import { Express } from 'express';
import { getPackageServer } from './get';
import { Package } from './schema';

beforeEach(() => {
    jest.clearAllMocks();
});

// Mock the axios module
jest.mock('axios');

const mockAxios = jest.requireMock('axios');  // This gets the mocked version of axios

describe('GET /package/{id}', () => {
    let app: Express;

    const mockData: Package[] = [
        {
        metadata: {
            ID: '1',
            Name: 'Test Package',
            Version: '1.0.0',
        },
        data: {
            Content: 'sampleContent',
            URL: 'http://example.com',
            JSProgram: 'console.log("test");',
        },
        },
    ];

    beforeEach(async () => {
        // Set up the mock implementation for axios.get
        mockAxios.get.mockResolvedValue({ data: mockData });
        app = await getPackageServer('mockUrl', 'mockSecretToken');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return 400 if package ID is missing', async () => {
        const response = await request(app)
            .get('/package/')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });  
    });

    it('should return 400 if unauthorized due to missing token', async () => {
        const response = await request(app).get('/package/1');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if unauthorized due to invalid token', async () => {
        const response = await request(app)
            .get('/package/1')
            .set('X-Authorization', 'wrongSecretToken');  // Using an incorrect token for this test

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return a package by ID', async () => {
        const response = await request(app)
            .get('/package/1')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockData[0]);
    });

    it('should return 400 if unauthorized', async () => {
        const response = await request(app).get('/package/1');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 404 if package not found', async () => {
        const response = await request(app)
            .get('/package/2')
            .set('X-Authorization', 'mockSecretToken');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Package not found' });
    });

    it('should log error if failed to fetch package data', async () => {
        // Override the mock implementation for this test to simulate an axios error
        const mockError = new Error('Failed to fetch data');
        mockAxios.get.mockRejectedValue(mockError);

        // We use the expect.assertions to ensure that a certain number of assertions are called
        expect.assertions(2);

        try {
            await getPackageServer('mockUrl', 'mockSecretToken');
        } catch (error) {
            const typedError = error as Error;
            expect(typedError).toBeInstanceOf(Error);
            expect(typedError.message).toBe('Failed to fetch data');
        }
    });

});

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
    app.get('/package/', (req: Request, res: Response) => {
        logger.warn(`Package ID is missing`);
        return res.status(400).json({ error: 'Unauthorized' });
    });
    
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
