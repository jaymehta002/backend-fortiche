// require('dotenv').config({path:'/.env'})
import connectDB from './db/index.js'
import mongoose  from 'mongoose'

import dotenv from 'dotenv'

dotenv.config({path:'/.env'})
connectDB()












