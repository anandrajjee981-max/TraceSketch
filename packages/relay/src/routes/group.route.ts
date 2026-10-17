import express from 'express'
const grouprouter = express.Router()
import { createGroupController, joinGroupController, leaveGroupController, getSessionController } from '../controller/group.controller.js'
import { addMessageController, getMessagesController } from '../controller/group-message.controller.js'
import { recordMarkerController, getHistoryController, listJoinedGroupsController, deleteHistoryController } from '../controller/group-history.controller.js'
import { verifyme } from '../middleware/verifyme.js'
import { createGroupLimiter,messageRateLimiter,joinGroupLimiter } from '../middleware/ratelimit.js'
grouprouter.get('/session/:instanceId', getSessionController)
grouprouter.post('/create', createGroupLimiter, createGroupController)
grouprouter.post('/join', joinGroupLimiter, joinGroupController)
grouprouter.post('/group/:code/leave', leaveGroupController)
grouprouter.post('/group/:code/messages',verifyme, messageRateLimiter, addMessageController)
grouprouter.get('/group/:code/messages',verifyme, getMessagesController)

// Durable history. Shares are recorded automatically by addMessageController;
// only the membership marker needs an explicit call.
grouprouter.post('/group/:code/history', recordMarkerController)
grouprouter.get('/group/:code/history', getHistoryController)
grouprouter.delete('/group/:code/history', deleteHistoryController)
grouprouter.get('/history/groups', listJoinedGroupsController)

export default grouprouter