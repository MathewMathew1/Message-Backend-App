import { Response, NextFunction } from 'express';
import ChannelDAO from '../Dao/ChannelsDao';
import MessageDAO from '../Dao/MessageDao';
import { IGetUserAuthInfoRequest } from '../types/types';


const userInChannelOfMessages = async (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction) => {
    
    if(!req.user) return res.status(401)
    const messageId = parseInt(req.params.id)
    
    if(isNaN(messageId)) return res.status(500).json({error: "Missing message id in param"})
    
    let channelId = await MessageDAO.getMessageChannelId(messageId)

    if(channelId.error) return res.status(500).json({ error: "Unexpected error try again" })

    let response2 = await ChannelDAO.checkIfUserInChannel(req.user.id, channelId)
    
    if(response2.isUserInChannel === false) return res.status(401).json({ error: "You are not in channel to make such request" })
    if(response2.error) return res.status(500).json({ error: "Unexpected error try again" })

    req.channelId=channelId

    next()
}

export default userInChannelOfMessages