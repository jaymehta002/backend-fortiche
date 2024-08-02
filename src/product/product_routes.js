import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getMostViewedProductsController,
  getProductDetails,
  getProductsByUser,
  deleteProduct,
  updateProduct,
} from "./product_controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createCollection,
  getCollections,
  getCollectionbyId,
  updateCollection,
  deleteCollection,
} from "./collection.controller.js";

const productRouter = Router();
productRouter.use(auth);

productRouter
  .get("/get-all-products", getAllProducts)
  .get("/get-product-details", getProductDetails)
  .get("/get-most-viewed-products", getMostViewedProductsController)
  .post("/create-product", upload.array("imageUrls"), createProduct)
  .delete("/delete-product/:id", deleteProduct)
  .patch("/update-product/:id", updateProduct)
  .get("/get-products-by-user", getProductsByUser)
  .post("/create-collection", createCollection)
  .get("/fetch-collections", getCollections)
  .get("/fetch-collections/:id", getCollectionbyId)
  .patch("/update-collection/:id", updateCollection)
  .delete("/delete-collection/:id", deleteCollection);

export default productRouter;
