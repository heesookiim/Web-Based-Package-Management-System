// packageRouter.ts
import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const packageData = req.body;
    // Perform actions with packageData
    res.status(201).json({
      message: 'Package created successfully',
      package: packageData
    });
  } catch {
    res.status(500).json({ message: "An error occurred"});
  }
});

router.get('/', async (req, res) => {
  // Implement the logic to retrieve packages
  res.status(200).json({
    message: 'Packages retrieved successfully',
    // packages: [...] // the actual packages
  });
});

export default router;
