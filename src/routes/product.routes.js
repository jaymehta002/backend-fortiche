import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import { 
    createProduct,
    getProducts, 
    getProduct, 
    updateProduct
    
} from "../controllers/product.controller.js";



const router = Router()



router.route("/products").post(verifyJWT, createProduct).get(getProducts);
router.route("/products/:id").get(getProduct).patch(updateProduct);



export default router