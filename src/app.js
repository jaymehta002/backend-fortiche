import cookieParser from 'cookie-parser'
import cors from 'cors'

import express from 'express'

const app = express()


// app.use(cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true
// }))

const corsOptions = {
    credentials: true,
    origin: [process.env.CLIENT_URL, 'localhost', '127.0.0.1'],
};

app.use(cors(corsOptions));

app.use(express.json({limit: '14kb'}))

app.use(cookieParser())
app.use(express.urlencoded({extended: true, limit: '14kb'}))
app.use(express.static('public'))

import userRoutes from './routes/user.routes.js'
import productRoutes from './routes/product.routes.js'

app.use('/api/v1/users', userRoutes)
app.use('/api/v1', productRoutes)




export { app }
