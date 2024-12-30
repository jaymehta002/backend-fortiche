import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getMostViewedProductsController,
  getProductDetails,
  getProductsByUser,
  deleteProduct,
  updateProduct,
  searchProduct,
} from "./product_controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createCollection,
  getCollections,
  getCollectionbyId,
  updateCollection,
  deleteCollection,
  getCheckoutCollectionById,
} from "./collection.controller.js";

const productRouter = Router();
productRouter.get("/get-collection/:id", getCheckoutCollectionById);
productRouter.use(auth);

productRouter
  .get("/get-all-products", getAllProducts)
  .get("/get-product-details/:id", getProductDetails)
  .get("/get-most-viewed-products", getMostViewedProductsController)
  .get("/search", searchProduct)
  .post(
    "/create-product",
    upload.fields([
      {
        name: "imageUrls",
        maxCount: 5,
      },
      {
        name: "specificationPdf",
        maxCount: 1,
      },
      {
        name: "downloadableDetails[fileUpload]",
        maxCount: 5,
      },
    ]),
    createProduct,
  )
  .delete("/delete-product/:id", deleteProduct)
  .patch("/update-product/:id", updateProduct)
  .get("/get-products-by-user", getProductsByUser)
  .post("/create-collection", createCollection)
  .get("/fetch-collections", getCollections)
  .get("/fetch-collections/:id", getCollectionbyId)
  .patch("/update-collection/:id", updateCollection)
  .delete("/delete-collection/:id", deleteCollection);

export default productRouter;
