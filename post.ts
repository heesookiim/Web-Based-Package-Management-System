// import express, { Request, Response, Express } from 'express';
// import axios from 'axios';
// import { logger } from './analyze';

// export async function createPackageRegistryServer(dataUrl: string, secretToken: string): Promise<Express> {
//   logger.info('Starting POST /packages');
//   const app = express();
//   app.use(express.json());

//   let packages: any[] = [];

//   try {
//     logger.info('Trying to fetch data');
//     // Fetch package data from the specified URL
//     const response = await axios.get(dataUrl);
//     packages = response.data;
//     logger.debug('Response:', response);
//   } catch (error) {
//     logger.error('Error fetching package data:', error);
//     process.exit(1);
//   }

//   // Middleware to check for X-Authorization header
//   app.use((req: Request, res: Response, next) => {
//     const requestToken = req.header('X-Authorization');
//     logger.debug('Resquest Token:', requestToken);
//     if (!requestToken || requestToken !== secretToken) {
//       logger.error('Unauthorized access');
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
//     next();
//   });

//   // POST /packages
//   app.post('/packages', (req: Request, res: Response) => {
//     logger.info('Starting POST /packages');
//     const offsetParam = req.query.offset as string;
//     const offsetValue = offsetParam ? parseInt(offsetParam) : 0;
//     const pageSize = 10; // Number of packages to return per page 
//     // pageSize can increase to 20 or 50 for efficiency based on Chat GPT
//     logger.debug("Setting parameter.");
//     if (isNaN(offsetValue) || offsetValue < 0) {
//       logger.error('Invalid offset value');
//       return res.status(400).json({ error: 'Invalid offset value' });
//     }

//     const queryParam = req.query.query as string;
//     logger.debug("Requesting query parameter.");

//     // Filter packages based on the query parameter
//     const filteredPackages = queryParam
//       ? packages.filter((pkg) => pkg.name.includes(queryParam))
//       : packages;
//     logger.debug("Filtering packages based on query parameter.");

//     // Check if the package with the same ID already exists
//     const packageExists = packages.some((pkg) => pkg.ID === req.body.ID);
//     logger.debug("Checking for duplicate packages.");

//     if (packageExists) {
//       logger.error('Package exists already');
//       return res.status(409).json({ error: 'Package exists already' });
//     }

//     const packageRating = req.body.rating;

//     if (packageRating <= 0) {
//       logger.error('Package is disqualified due to rating');
//       return res.status(424).json({ error: 'Package is disqualified due to rating' });
//     }

//     // Calculate the start and end indices for the current page
//     const startIndex = offsetValue * pageSize;
//     const endIndex = startIndex + pageSize;

//     logger.info("Paginating packages.");
//     // Ensure endIndex does not exceed the total number of packages
//     const paginatedPackages = filteredPackages.slice(
//       startIndex,
//       endIndex < filteredPackages.length ? endIndex : filteredPackages.length
//     );
//     logger.debug("Paginated packages:", paginatedPackages);

//     // Calculate the next offset for the next page
//     const nextOffset = endIndex < filteredPackages.length ? offsetValue + 1 : null;
//     logger.debug("Offset:", nextOffset);
//     // Prepare a response object that includes the packages, the next offset, and the query used
//     const response = {
//       packages: paginatedPackages,
//       nextOffset,
//       query: queryParam,
//     };
//     logger.debug("Returning response:", response);
//     logger.info('Success');
//     return res.status(200).json(response);
//   });

//   return app;
// }


import express, { Express, Request, Response, Application } from 'express';
import { logger } from './analyze';
import axios from 'axios';


const app = express();
const PAGE_SIZE = 10; // Number of packages per page

// Middleware to parse JSON requests
app.use(express.json());

interface Package {
    Version: string;
    Name: string;
    ID: string;
}

interface PackageData {
  Description?: string;
  Content: string;
  URL?: string;
  JSProgram: string;
}

interface PackageMetadata {
  Name: string;
  Version: string;
  ID: string;
}

interface PackageResponse {
  metadata: PackageMetadata;
  data: PackageData;
}

let packages: Package[] = [];

// POST /packages
export const handlePostPackages = (req: Request, res: Response): void => {
    const offset = parseInt(req.query.offset as string || '1');
    const xAuthorization = req.header('X-Authorization');

    if (!xAuthorization) {
        res.status(400).json({ error: 'Missing or invalid X-Authorization header.' });
        return;
    }

    if (offset < 1) {
        res.status(400).json({ error: 'Offset should be greater than or equal to 1.' });
        return;
    }

    // Calculate start and end indices for pagination
    const startIndex = (offset - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    if (startIndex >= packages.length) {
        res.status(413).json({ error: 'Too many packages returned.' });
        return;
    }

    const paginatedPackages = packages.slice(startIndex, endIndex);
    res.status(200).json(paginatedPackages);
};


export async function setupPackageEndpoints(secretToken: string): Promise<void> {
    
  // POST /package
  app.post('/package', async (req: Request, res: Response) => {
      const xAuthorization = secretToken;
      if (!xAuthorization) {
          return res.status(400).json({ error: 'Missing or invalid X-Authorization header.' });
      }

      const { Content, JSProgram, URL } = req.body.data as PackageData;
      const { Name, Version, ID } = req.body.metadata as PackageMetadata;      
      
      if (!Content || !JSProgram || !URL) {
          return res.status(400).send({
              error: "There is missing field(s) in the PackageData/AuthenticationToken or it is formed improperly."
          });
      }

      // Hypothetical check for package existence
      if (await checkPackageExistence(Content, URL, xAuthorization)) {
          return res.status(409).send({
              error: "Package exists already."
          });
      }

      // Hypothetical check for package rating

      //check entire packagerating interface for it to be rating > 0.5
      if (req.body.rating && req.body.rating > 0.5) {
          return res.status(424).send({
              error: "Package is not uploaded due to the disqualified rating."
          });
      }

      await savePackageToURL(URL, { Content, JSProgram, xAuthorization });

      const responseData: PackageResponse = {
          metadata: {
              Name: Name,
              Version: Version,
              ID: ID
          },
          data: {
              Content: Content,
              JSProgram: JSProgram
          }
      };

      return res.status(201).send(responseData);
  });
}

async function savePackageToURL(url: string, data: { Content: string, JSProgram: string, xAuthorization: string }) {
  const response = await axios.post(url, data, {
      headers: {
          'X-Authorization': data.xAuthorization
      }
  });

  if (response.status !== 200) {
      throw new Error('Failed to save package to the provided URL.');
  }
}

async function checkPackageExistence(content: string, URL: string, xAuthorization: string): Promise<boolean> {

  try {
    
      const response = await axios.get(URL, {
          headers: {
              'X-Authorization': xAuthorization
          },
          params: {
              content: content
          }
      });

      return response.data && response.data.length > 0;
  } catch (error) {
      // console.error('Error checking package existence:', error);
      return false;
  }
}

const searchPackagesByRegex = async (token: string) => {

  app.post('/package/RegEx', async (req: Request, res: Response) => {
    try {
      const regexPattern = req.header('Regex-Expression'); // Header names are case-insensitive
      if (!regexPattern) {
        return res.status(400).json({ error: 'Missing or invalid Regex Expression header.' });
      }
      
      const response = await axios.post(
        '/package/byRegEx', 
        { RegExp: regexPattern }, 
        {
          headers: { 'X-Authorization': `Bearer ${token}` }
        }
      );
      
      res.status(200).json(response.data);
    } catch (error) {
      console.error('Error searching packages by regex:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

}
