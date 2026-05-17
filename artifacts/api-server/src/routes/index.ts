import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import documentFilesRouter from "./document-files";
import categoriesRouter from "./categories";
import levelsRouter from "./levels";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import storageRouter from "./storage";
import sellerApplicationsRouter from "./seller-applications";
import sellerAuthRouter from "./seller-auth";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(documentFilesRouter);
router.use(categoriesRouter);
router.use(levelsRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(sellerApplicationsRouter);
router.use(sellerAuthRouter);
router.use(paymentsRouter);

export default router;
