import express from 'express'
const grouprouter = express.Router()
import { createGroupController,joinGroupController } from '../controller/group.controller'

grouprouter.post('/create',createGroupController)
grouprouter.post('/join',joinGroupController)





export default grouprouter