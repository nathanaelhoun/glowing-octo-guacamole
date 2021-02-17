import express from "express";

import ApiController from "../controllers/api.js";
import DuelController from "../controllers/duels.js";
import ImagesController from "../controllers/imagesImporter.js";
import ImporterController from "../controllers/moleculesImporter.js";
import QuestionController from "../controllers/question.js";
import UserController from "../controllers/user.js";
import authenticationMiddleware from "../middlewares/auth.middleware.js";
import { createMulter } from "../middlewares/multer.middleware.js";

const apiRouter = express.Router();

apiRouter.get("/status", ApiController.status);

apiRouter.get("/question/:type", QuestionController.generateQuestion);

apiRouter.get("/users/", authenticationMiddleware, UserController.getAll);

apiRouter.post("/users/", authenticationMiddleware, UserController.severalGetInfos);

apiRouter.post("/users/login", UserController.login);

apiRouter.get("/users/:pseudo", authenticationMiddleware, UserController.getInfos);

apiRouter.patch("/users/:pseudo", authenticationMiddleware, UserController.saveInfos);

apiRouter.post("/duels/new", authenticationMiddleware, DuelController.create);

apiRouter.get("/duels/", authenticationMiddleware, DuelController.fetchAll);

apiRouter.get("/duels/:id", authenticationMiddleware, DuelController.fetch);

apiRouter.post("/duels/:id/:round", authenticationMiddleware, DuelController.play);

apiRouter.use("/files/molecules", authenticationMiddleware, express.static("files/molecules"));

apiRouter.use("/files/images", express.static("files/images"));

apiRouter.post(
  "/import/molecules",
  authenticationMiddleware,
  createMulter(),
  ImporterController.importMolecules
);

apiRouter.get(
  "/import/molecules",
  authenticationMiddleware,
  ImporterController.getLastImportedFile
);

apiRouter.post(
  "/import/images",
  authenticationMiddleware,
  createMulter(true),
  ImagesController.importImages
);

apiRouter.get("/import/images", authenticationMiddleware, ImagesController.getLastImportedFile);

export default apiRouter;
