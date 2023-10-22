import express, { Request, Response, Express } from 'express';
import axios from 'axios';
import { logger } from './analyze';

export async function createPackageRegistryServer(dataUrl: string, secretToken: string): Promise<Express> {
  logger.info('Starting POST /packages');
  const app = express();
  app.use(express.json());

  let packages: any[] = [];

  try {
    logger.info('Trying to fetch data');
    // Fetch package data from the specified URL
    const response = await axios.get(dataUrl);
    packages = response.data;
    logger.debug('Response:', response);
  } catch (error) {
    logger.error('Error fetching package data:', error);
    process.exit(1);
  }

  // Middleware to check for X-Authorization header
  app.use((req: Request, res: Response, next) => {
    const requestToken = req.header('X-Authorization');
    logger.debug('Resquest Token:', requestToken);
    if (!requestToken || requestToken !== secretToken) {
      logger.error('Unauthorized access');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // POST /packages
  app.post('/packages', (req: Request, res: Response) => {
    logger.info('Starting POST /packages');
    const offsetParam = req.query.offset as string;
    const offsetValue = offsetParam ? parseInt(offsetParam) : 0;
    const pageSize = 10; // Number of packages to return per page 
    // pageSize can increase to 20 or 50 for efficiency based on Chat GPT
    logger.debug("Setting parameter.");
    if (isNaN(offsetValue) || offsetValue < 0) {
      logger.error('Invalid offset value');
      return res.status(400).json({ error: 'Invalid offset value' });
    }

    const queryParam = req.query.query as string;
    logger.debug("Requesting query parameter.");

    // Filter packages based on the query parameter
    const filteredPackages = queryParam
      ? packages.filter((pkg) => pkg.name.includes(queryParam))
      : packages;
    logger.debug("Filtering packages based on query parameter.");

    // Check if the package with the same ID already exists
    const packageExists = packages.some((pkg) => pkg.ID === req.body.ID);
    logger.debug("Checking for duplicate packages.");

    if (packageExists) {
      logger.error('Package exists already');
      return res.status(409).json({ error: 'Package exists already' });
    }

    const packageRating = req.body.rating;

    if (packageRating <= 0) {
      logger.error('Package is disqualified due to rating');
      return res.status(424).json({ error: 'Package is disqualified due to rating' });
    }

    // Calculate the start and end indices for the current page
    const startIndex = offsetValue * pageSize;
    const endIndex = startIndex + pageSize;

    logger.info("Paginating packages.");
    // Ensure endIndex does not exceed the total number of packages
    const paginatedPackages = filteredPackages.slice(
      startIndex,
      endIndex < filteredPackages.length ? endIndex : filteredPackages.length
    );
    logger.debug("Paginated packages:", paginatedPackages);

    // Calculate the next offset for the next page
    const nextOffset = endIndex < filteredPackages.length ? offsetValue + 1 : null;
    logger.debug("Offset:", nextOffset);
    // Prepare a response object that includes the packages, the next offset, and the query used
    const response = {
      packages: paginatedPackages,
      nextOffset,
      query: queryParam,
    };
    logger.debug("Returning response:", response);
    logger.info('Success');
    return res.status(200).json(response);
  });

  return app;
}
