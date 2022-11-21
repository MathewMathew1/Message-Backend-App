import InviteDao from "../Dao/InviteDao";
import ChannelDAO from "../Dao/ChannelsDao";
import { Response, NextFunction } from 'express';
import { IGetUserAuthInfoRequest } from '../types/types';
import { io } from "..";
import { validationResult } from "express-validator";

export default class InviteCtrl {
    
    static async apiSendInvite(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }

            const invitedUserId: number = parseInt(req.body.userId)
            const channelId: number = parseInt(req.params.id)

            if(isNaN(channelId)) return res.status(400).json({error: "Invalid data type for channel id"})

            let response = await ChannelDAO.canUserSendInvitesInThisChannel(req.user.id, channelId)
            if(response.error) return res.status(500).json({error: "Unexpected error"}) 
            if(response.canSend===false) return res.status(403).json({error: "You are not authorized to send invites to this channel"})
        
            let isUserAlreadyInChannel = await ChannelDAO.checkIfUserInChannel(invitedUserId, channelId)
            if(isUserAlreadyInChannel.error)return res.status(500).json({error: "Unexpected error"}) 
            if(isUserAlreadyInChannel.isUserInChannel) return res.status(403).json({error: "Invited user is already in channel"})
         
            let inviteCreated = await InviteDao.createInvite(channelId, req.user.id, invitedUserId)
            if("error" in inviteCreated) {
                let error = inviteCreated.error as any // temporary solution
                if(error.code ===  "23503") return res.status(500).json({error: "Invited User doesn't exist or blocked invites from none friends"})
                if(error.code ===  "23505") return res.status(500).json({error: "You have already invited this user to this channel"})
                
                return res.status(500).json({error: "Unable to create invite"})
            }

            let socketsOfInvitedUser: string[] = []
            io.sockets.sockets.forEach(function(data,_counter){

                if(data.user.id === invitedUserId){
                    socketsOfInvitedUser.push(data.id)
                }
                
            })
            if(socketsOfInvitedUser.length!==0) {

                io.to(socketsOfInvitedUser).emit("send-invite", inviteCreated["invite"])
            }

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
        }
    }


    static async apiDeleteInvite(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            
            if(!req.user) return res.status(403)

            const inviteId = parseInt(req.params.id)

            if(isNaN(inviteId)) return res.status(400).json({error: "Invalid data type for invite id"})
            
            let invite = await InviteDao.deleteInvite(inviteId, req.user?.id)
            if( invite?.error )return res.status(500).json({error: "Unable to delete invite"})

            let socketsOfInvitedUser: string[] = []
            io.sockets.sockets.forEach(function(data,_counter){
                if(data.user.id===req.user?.id) return
                
                if(data.user.id === invite.invite.user_invited_id || data.user.id === invite.invite.user_inviting_id){
                    socketsOfInvitedUser.push(data.id)
                }
                
            })
            if(socketsOfInvitedUser.length!==0) {
                io.to(socketsOfInvitedUser).emit("deleted-invite", inviteId)
            }

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiAcceptInvite(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const inviteId = parseInt(req.params.id)

            if(isNaN(inviteId)) return res.status(400).json({error: "Invalid data type for invite id"})

            let invite = await InviteDao.acceptInvites(inviteId , req.user.id)
            if( invite.error ) return res.status(500).json({error: "Unable to accept invite"})

            io.to(invite.channelUser.channel_id.toString()).emit("user-joined-channel", 
                {channelUser: {...invite.channelUser, username: req.user.username}})

            return res.status(201).json({status: "success", channel: invite.channel})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiGetUserInvites(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            let invites = await InviteDao.getAllUserInvites(req.user.id)
            if( invites.error || !invites.success) return res.status(500).json({error: "Unable to find invites"})

            return res.status(201).json({status: "success", invites: invites.invites})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiGetInvitesSentByUser(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            let invites = await InviteDao.getInvitesSentByUser(req.user.id)
            if( invites.error || !invites.success) return res.status(500).json({error: "Unable to find invites"})

            return res.status(201).json({status: "success", invites: invites.invites})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiMarkInviteAsSeen(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const inviteId = parseInt(req.params.id)

            if(isNaN(inviteId)) return res.status(400).json({error: "Invalid data type for invite id"})

            let response = await InviteDao.markInviteAsSeen(inviteId, req.user.id)
            if( response?.error ) return res.status(500).json({error: "Unable to mark invite as seen"})

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }



}