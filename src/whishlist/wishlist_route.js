import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import {addToWishListController, getWishListController, removeFromWishListController } from "./wishlist.controller.js";

const wishlistRouter = Router();

wishlistRouter.use(auth);

wishlistRouter.post("/add-to-wishlist", addToWishListController);
wishlistRouter.get("/get-wishlist", getWishListController);
wishlistRouter.delete("/remove", removeFromWishListController);


export { wishlistRouter };