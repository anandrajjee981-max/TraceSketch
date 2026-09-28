import express from 'express'
const grouprouter = express.Router()
import { createGroupController, joinGroupController } from '../controller/group.controller'
import { addMessageController, getMessagesController } from '../controller/group-message.controller'

grouprouter.post('/create',createGroupController)
grouprouter.post('/join',joinGroupController)
grouprouter.post('/group/:code/messages', addMessageController)
grouprouter.get('/group/:code/messages', getMessagesController)



export default grouprouter