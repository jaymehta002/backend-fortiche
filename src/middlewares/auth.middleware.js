import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, res, next) => {
try {
        const token = req.cookies.accessToken || req.headers("Authorization").replace("Bearer ", "");
    
        if (!token) {
            throw new APIError(401, "Unauthorized");
        }
    
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
       const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
       if(!user){
           throw new APIError(401, "invvalid access token")
       }
       req.user = user;
       next();
       
} catch (error) {
    throw new APIError(401, error.message ||  "Unauthorized");
    
}






});