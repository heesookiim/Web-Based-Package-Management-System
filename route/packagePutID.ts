import { Router, Request, Response } from 'express';
import { PackageData, PackageID, Package, AuthenticationToken } from './schema';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Initialize dotenv to use environment variables
dotenv.config();

const router = Router();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

// Assuming `packages` is an array of Package objects
const packages: Package[] = []; // Replace with your actual package data source
// example const packages = await database.query('SELECT * FROM packages');

// Function to check if the provided authentication token is valid
async function checkAuthToken(token: string): Promise<boolean> {
    try {
        jwt.verify(token, JWT_SECRET_KEY);
        return true;
    } catch (error) {
        // console.error(error);
        return false;
    }
}

// Function to update the package version and data
async function updatePackageVersion(packageId: PackageID, packageData: PackageData): Promise<boolean> {
    const pkgIndex = packages.findIndex((pkg) => pkg.metadata.ID === packageId);
    if (pkgIndex === -1) return false;
  
    // Here you would include additional logic to update the package version
    packages[pkgIndex].data = packageData;
    return true;
}

// Function to find an existing package by its ID
async function findPackageById(packageId: string): Promise<any> {
    return packages.find((pkg) => pkg.metadata.ID === packageId);
}

// Endpoint to update package version
router.put('/package/:id', async (req: Request, res: Response) => {
    const packageId: PackageID = req.params.id;
    const packageData: PackageData = req.body;
    const xAuthorization: AuthenticationToken | undefined = req.headers.authorization;
    
    // Check for required fields
    if (!packageId || !packageData || !xAuthorization) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
  
    // Parse the token from the Authorization header
    const token = xAuthorization.split(' ')[1];
    if (!token || !(await checkAuthToken(token))) {
        return res.status(401).json({ error: 'Unauthorized or invalid token.' });
    }
  
    const existingPackage = await findPackageById(packageId);
    if (!existingPackage) {
        return res.status(404).json({ error: 'Package does not exist.' });
    }
  
    const isUpdated = await updatePackageVersion(packageId, packageData);
    if (!isUpdated) {
        return res.status(400).json({ error: 'Could not update the package.' });
    }
  
    res.status(200).json({ message: 'Package updated successfully.' });
});  

export default router;