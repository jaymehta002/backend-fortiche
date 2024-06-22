import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";


const generateAccessAndRefreshToken = async(userId) => {

    try {
        const user  = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        user.save({validateBeforeSave: false});

        return { accessToken, refreshToken}

    } catch (error) {
        throw new APIError(500, "Token generation failed")
    }
  

}

const registerUser = asyncHandler(async (req, res, next) => {
   
  const {fullName , email, username, password} = req.body;

  console.log(fullName, email, username, password);
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
    throw new APIError(400, "All fields are required")
    }

     await User.findOne({ $or: [{ email }, { username }] }).then((user) => {
        if (user) {
            throw new APIError(400, "User already exists");
        }
    });

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath || !coverLocalPath){
        throw new APIError(400, "Avatar and cover image are required")
    }

   const avatar  = await uploadOnCloudinary(avatarLocalPath)

   const cover  = await uploadOnCloudinary(coverLocalPath)

   if(!avatar || !cover){
       throw new APIError(500, "Image upload failed")
    }

   const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: cover.url,
    });

   const createdUser =  await User.findById(user._id).select("-password -refreshToken")

   if(!createdUser){
       throw new APIError(500, "Something went wrong while registering user")
   }

    



   return res.status(200).json(new APIResponse(201,  createdUser, "User registered successfully"));
   
    
}
);

const loginUser = asyncHandler(async (req, res, next) => {
   // req body -> data from client
   //username and email
   //find the user
   //check password
   //send cookies

    const {username, email, password } = req.body;

    if(!username && !email){
        throw new APIError(400, "Username or email is required")
    }

    if(!password){
        throw new APIError(400, "Password is required")
    }

    //find the user in database
    const user = await User.findOne({ $or: [{ email }, { username }] });

    if(!user){
        throw new APIError(404, "User not found")
    }

    //check password
    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if(!isPasswordCorrect){
        throw new APIError(401, "password incorrect")
    }

    //generate access token
    await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true,
    };

   return res.status.cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new APIResponse(200, loggedInUser, "User logged in successfully"));
   




    


});

const logoutUser = asyncHandler(async (req, res, next) => {
    User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: "" },

        


    },{new: true}

);

    return res.status(200).json(new APIResponse(200, null, "User logged out successfully"));


});



export { registerUser, loginUser, logoutUser };