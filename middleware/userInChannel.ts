import { Response, NextFunction } from 'express';
import ChannelDAO from '../Dao/ChannelsDao';
import { IGetUserAuthInfoRequest } from '../types/types';


const userInChannel = async (req: IGetUserAuthInfoRequest, res: Response, next: NextFunction) => {
    
    if(!req.user) return res.status(401)
    const channelId = parseInt(req.params.id)

    if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})
    
    let response = await ChannelDAO.checkIfUserInChannel(req.user.id, channelId)
    
    if(response.isUserInChannel === false) return res.status(401).json({ error: "You are not in channel to make such request" })
    if(response.error) return res.status(500).json({ error: "Unexpected error try again" })

    next()
}

export default userInChannel