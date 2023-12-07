import { Router, Request, Response } from 'express';
import { logger } from "../../logger_cfg";

const router = Router();

router.put('/', async (req: Request, res: Response) => {
    logger.info(`PUT /authenticate`);
    return res.status(501).json({ error: 'This system does not support authentication.' });
});

// Exporting the router
export default router;