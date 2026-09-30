import express from 'express'
const grouprouter = express.Router()
import { createGroupController, joinGroupController, leaveGroupController, getSessionController } from '../controller/group.controller.js'
import { addMessageController, getMessagesController } from '../controller/group-message.controller.js'

grouprouter.get('/session/:instanceId', getSessionController)
grouprouter.post('/create',createGroupController)
grouprouter.post('/join',joinGroupController)
grouprouter.post('/group/:code/leave', leaveGroupController)
grouprouter.post('/group/:code/messages', addMessageController)
grouprouter.get('/group/:code/messages', getMessagesController)



export default grouprouter