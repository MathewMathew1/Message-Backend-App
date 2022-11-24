import ChannelDAO from '../Dao/ChannelsDao';
import {  Response, NextFunction } from 'express';
import { IGetUserAuthInfoRequest } from '../types/types';
import { validationResult } from 'express-validator';
import { io } from '..';

export default class ChannelCtrl {
    
    static async apiCreateChannel(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }
            
            if(!req.user) return res.status(403)
            
            const channelName: string = req.body.channelName
            
            let response = await ChannelDAO.createChannel(req.user.id, channelName)

            if(response.error) return res.status(500).json({error: "Unexpected error"}) 
            console.log(response.userChannel)
            return res.status(201).json({channel: {...response.channel, ...response.userChannel}})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }

    static async apiLeaveChannel(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            
            if(!req.user) return res.status(403)

            const channelId: number = parseInt(req.params.id)
            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})

            let response = await ChannelDAO.removeUserFromChannel(req.user.id, channelId)

            if(response.error) return res.status(500).json({error: "Unexpected error try again"})

            
            io.to(channelId.toString()).emit("user-left-channel", {userId: req.user.id})
            io.sockets.sockets.forEach(function(data,_counter){
                if(data.user.id === req.user?.id) data.leave(channelId.toString())
            })
                 
            return res.status(201).json({status: "success"})  
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }

    static async apiDeleteChannel(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            
            if(!req.user) return res.status(403)

            const channelId: number = parseInt(req.params.id)
            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})

            let response = await ChannelDAO.isOwnerOfTheChannel(req.user.id, channelId)

            if(!response.isOwner) return res.status(403).json({error: "You need to be owner of channel to delete it"}) 
            if(response.error) return res.status(500).json({error: "Unexpected error try again"})

            let userIdsOfChannelDeleted = await ChannelDAO.getAllUserIdsInChannel(channelId)
            let deletionOfChannel = await ChannelDAO.deleteChannel(channelId)
            if(deletionOfChannel?.error) return res.status(500).json({error: "Unable to delete channel"})

            let socketsOfDeletedChannelUsers: string[] = []

            if(!userIdsOfChannelDeleted.error){
                io.sockets.sockets.forEach(function(data,_counter){
                    const checkIfSocketBelongsToUserInThisChannel = userIdsOfChannelDeleted.channelMembers.some((obj: {user_id: string}) => 
                        {return parseInt(obj.user_id) === data.user.id})
                    
                    if(checkIfSocketBelongsToUserInThisChannel) socketsOfDeletedChannelUsers.push(data.id)
                    
                })
            }

            if(socketsOfDeletedChannelUsers.length>0) io.to(socketsOfDeletedChannelUsers).emit("channel_deleted", {channelId: channelId})
            io.to(channelId.toString()).emit("channel_and_room_deleted")
            
            return res.status(201).json({status: "success"})  
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }
    
    static async apiRemoveUser(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const channelId: number = parseInt(req.params.id)
            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})

            if(typeof req.query.userId !== "string") return res.status(500).json({error: "Missing not optional query userId"})
            const userRemovedId: number = parseInt(req.query.userId)

            if(isNaN(userRemovedId)) return res.status(500).json({error: "Missing id of user being removed from channel in param"})

            let response = await ChannelDAO.canUserRemoveUserFromChannel(req.user.id, channelId)
            if(response.error) return res.status(500).json({error: "Unexpected error"})
            if(!response.canRemove) return res.status(500).json({error: "You cant remove user from this channel"}) 
        
            let removingUser = await ChannelDAO.removeUserFromChannel(userRemovedId, channelId)
            if(removingUser.error) return res.status(500).json({error: "Unexpected error"}) 

            io.to(channelId.toString()).emit("user-removed", {userId: userRemovedId})
            io.sockets.sockets.forEach(function(data,_counter){
                if(data.user.id === userRemovedId) data.leave(channelId.toString())
            })
            
            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }


    static async apiChangeUserAllowance(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            
            if(!req.user) return res.status(403)

            const channelId: number = parseInt(req.params.id)
            const changedUserId: number = req.body.userId
            const userInviteAbility: boolean = req.body.canInvite == "true"
            
            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})
            
            let response = await ChannelDAO.canUserRemoveUserFromChannel(req.user.id, channelId)

            if(response.error) return res.status(500).json({error: "Unexpected error"})
                
            if(!response.canRemove) return res.status(500).json({error: "You cant change users allowance in this channel"}) 
                
            let changingAllowance = await ChannelDAO.changeUserAbilityToInvite(changedUserId, channelId, userInviteAbility)

            if(changingAllowance?.error) return res.status(500).json({error: "Unexpected error"}) 

            io.to(channelId.toString()).emit("user-allowance-changed", {userId: changedUserId, userInviteAbility})
            
            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }

    static async apiGetChannelData(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const channelId: number = parseInt(req.params.id)

            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})
              
            let channelData = await ChannelDAO.getChannelData(channelId)
            if(channelData.error) return res.status(500).json({error: "Unexpected error"}) 
            
            return res.status(201).json({status: "success", channelMembers: channelData.channelMembers, channelInfo: channelData.channelInfo})

        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }

    static async apiGetUserChannels(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            
            if(!req.user) return res.status(403)

            let userChannels = await ChannelDAO.getUserChannels(req.user.id)
            if(userChannels.error) return res.status(500).json({error: "Unexpected error"}) 
            
            return res.status(201).json({status: "success", userChannels: userChannels.userChannels})

        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }

    static async apiMarkLastSeenMessage(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            
            if(!req.user) return res.status(403)
            const channelId: number = parseInt(req.params.id)

            if(isNaN(channelId)) return res.status(500).json({error: "Missing channel id in param"})

            if(req.query.message_id===undefined ) return res.status(400).json({error: "message_id is missing"})
            
            const messageId: number|undefined = parseInt(req.query.message_id as string)

            if(isNaN(messageId)) return res.status(400).json({error: "message id is missing in query"})

            let markLastSeenMessage = await ChannelDAO.markLastMessageSeenByUserInChannel(channelId, messageId, req.user.id)

            if(markLastSeenMessage.error) return res.status(500)
            
            return res.status(201)
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }
}