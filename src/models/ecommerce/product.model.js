import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
        {
            description: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,

            },  
            password:{
                type: String,
                required: true
            },
            productImage:{
                type: String,
                required: true
            },
            price:{
                type: String,
                required: true,
                default: 0,
            },
            stock:{
                type: Number,
                required: true,
                default: 0,
            },
            category:{  // this is how to reference another model , adding category id in product model
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
                required: true
            },
            owner:{  // this is how to reference another model , adding category id in product model
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        }, {timestamps: true}
)

export const Product = mongoose.model('Product', productSchema)

