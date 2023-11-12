import { Router, Request, Response } from 'express';
import { EnumerateOffset, Package, PackageMetadata, PackageQuery, SemverRange, PackageName,AuthenticationToken } from './schema';
import { logger } from './analyze';

const router = Router();
const PAGE_SIZE = 10;
const MAX_PACKAGE_COUNT = 100;

// Assuming `packages` is an array of Package objects
const packages: Package[] = []; // Replace with your actual package data source
// example const packages = await database.query('SELECT * FROM packages');

router.get('/packages', (req: Request, res: Response) => {
    const offset: EnumerateOffset = parseInt(req.query.offset as string || '0');
    const queryVersion: SemverRange = req.query.version as string; // Extract version from query parameters
    const queryName: PackageName = req.query.name as string; // Extract name from query parameters

    const query: PackageQuery = { Version: SemverRange, Name: PackageName};

    const xAuthorization: AuthenticationToken = req.headers['Please enter authorization token'] as string;
    if (!queryName || !queryVersion || !query || !xAuthorization) {
        logger.error('Missing required fields in request');
        res.status(400).json({ error: 'Missing required fields in the query or invalid authentication token.' });
        return;
    }

    // Filter packages based on the name and version
    let filteredPackages = packages.filter(pkg =>
        (queryName === "*" || pkg.metadata.Name.includes(queryName)) &&
        (pkg.metadata.Version === queryVersion || queryVersion === "*")
    );

    if (filteredPackages.length > MAX_PACKAGE_COUNT) {
        logger.error('Too many packages returned');
        res.status(413).json({ error: 'Too many packages returned.' });
        return;
    }

    const startIndex = offset * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    if (startIndex >= filteredPackages.length) {
        logger.error('Offset exceeds the number of available packages');
        res.status(404).json({ error: 'Offset exceeds the number of available packages.' });
        return;
    }

    const paginatedPackagesMetadata: PackageMetadata[] = filteredPackages.slice(startIndex, endIndex).map(pkg => pkg.metadata);

    res.header('Next-Offset', String(endIndex < filteredPackages.length ? endIndex : -1));
    res.status(200).json(paginatedPackagesMetadata);
});

export default router;
