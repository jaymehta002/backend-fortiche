const asyncHandler = (requestHandler) => {

    (req, rsp, next) => {
        Promise.resolve(requestHandler(req, rsp, next)).catch((err) => next(err));        
    }
}

export {asyncHandler};