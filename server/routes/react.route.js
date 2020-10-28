import express from "express";

const reactRouter = express.Router();

function goToReactIndex(req, res) {
  res.sendFile("index.html", { root: "../client/build/" });
}

reactRouter.get("/", goToReactIndex);

reactRouter.get("/hello_world", goToReactIndex);

reactRouter.get("/train", goToReactIndex);

export default reactRouter;