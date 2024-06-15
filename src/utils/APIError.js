class APIError extends Error {
    constructor(
        statusCode,
        message = "something went wrong",
        errors = [],
        stack = "",

    ){
        super(message)
        this.statusCode = statusCode
        this.data = error
        this.message = message
        this.success = false
        this.errors = this.errors

        if(stack){
            this.stack = stack

        }else{
            Error.captureStackTrace(this, this.constructor)
        }

    }
}


export {APIError}