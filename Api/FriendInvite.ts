import { Response, NextFunction } from 'express';
import { FriendInvites, FriendShip, IGetUserAuthInfoRequest } from '../types/types';
import { io } from "..";
import FriendDao from "../Dao/FriendsDao";
import FriendInviteDao from "../Dao/FriendsInvitesDao";
import { validationResult } from 'express-validator';

export default class FriendInviteCtrl {
    
    static async apiSendInvite(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() });
            }

            const invitedUserId: number = req.body.userId

            let doesFriendshipExist = await FriendDao.checkIfFriendshipBetweenTwoUsersExist(req.user?.id, invitedUserId)
            if(doesFriendshipExist.error)return res.status(500).json({error: "Unexpected error"}) 
            if(doesFriendshipExist.friendShipExist) return res.status(403).json({error: "Invited user is already friend with you"})
            
            let inviteCreated = await FriendInviteDao.createFriendInvite(req.user?.id, invitedUserId)
            if("error" in inviteCreated) {
                let error = inviteCreated.error as any // temporary solution
                if(error.code ===  "23503") return res.status(500).json({error: "Invited User doesn't exist or blocked you"})
                if(error.code ===  "23505") return res.status(500).json({error: "You have already invited this user to friends"})
                
                return res.status(500).json({error: "Unable to create invite"})
            }

            let socketsOfInvitedUser: string[] = []
            io.sockets.sockets.forEach(function(data,_counter){

                if(data.user.id === invitedUserId){
                    socketsOfInvitedUser.push(data.id)
                }
                
            })
            
            if(socketsOfInvitedUser.length!==0) {
                let invite: FriendInvites = inviteCreated.invite
                invite.username = req.user.username
                io.to(socketsOfInvitedUser).emit("send-friend-invite", inviteCreated.invite)
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
            
            let invite = await FriendInviteDao.deleteFriendInvite(inviteId, req.user?.id)
            if( invite?.error )return res.status(500).json({error: "Unable to delete invite"})

            let socketsOfDeletedInviteUsers: string[] = []
            let idOfUserInvited = invite.invite?.user_invited_id !== req.user?.id? invite.invite?.user_invited_id: invite.invite?.user_inviting_id
            io.sockets.sockets.forEach(function(data,_counter){

                if(data.user.id === req.user?.id || data.user.id === idOfUserInvited){
                    socketsOfDeletedInviteUsers.push(data.id)
                }
                
            })
            if(socketsOfDeletedInviteUsers.length!==0) {
                io.to(socketsOfDeletedInviteUsers).emit("deleted-friend-invite", inviteId)
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

            let response = await FriendInviteDao.acceptFriendInvite(inviteId , req.user.id)
            if( response.error ) return res.status(500).json({error: "Unable to accept invite"})

            let friendship: FriendShip = response.friendship
            friendship.is_user_one_online = false
            friendship.is_user_two_online = false

            let socketsOfFriendShip: string[] = []
            io.sockets.sockets.forEach(function(data,_counter){
                if(data.user.id === parseInt(friendship.user_one_id)) {
                    friendship.is_user_one_online = true
                    socketsOfFriendShip.push(data.id)
                }  
                
                if(data.user.id === parseInt(friendship.user_two_id)) {
                    friendship.is_user_two_online = true
                    socketsOfFriendShip.push(data.id)
                }
                
            })
            console.log(socketsOfFriendShip)
            if(socketsOfFriendShip.length!==0) {
                io.to(socketsOfFriendShip).emit("new_friend", friendship)
            }


            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    static async apiGetUserInvites(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            let invites = await FriendInviteDao.getFriendShipInvites(req.user.id)
            if( invites.error ) return res.status(500).json({error: "Unable to find invites"})

            return res.status(201).json({invites: invites.invites})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }

    

    static async apiGetInvitesSentByUser(req: IGetUserAuthInfoRequest, res: Response, next: NextFunction){
        try{
            if(!req.user) return res.status(403)

            let invites = await FriendInviteDao.getFriendShipInvitesSentByUser(req.user.id)
            if( invites.error ) return res.status(500).json({error: "Unable to find invites"})

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

            let response = await FriendInviteDao.markInviteAsSeen(inviteId, req.user.id)

            if( response?.error ) return res.status(500).json({error: "Unable to mark invite as seen"})

            return res.status(201).json({status: "success"})
        }
        catch (e) {
            console.log(e)
            res.status(500).json({ error: "Something went wrong try again" })
          }
    }
}